"""Publie PAM sur le compte SISA, région us-east-1.

Le site et l'API partagent la même adresse. Le nom pam.acmehaiti.com
se pose ensuite dans SiteGround : ce script ne touche pas au DNS public.

Le résolveur de la machine ne répond pas pour amazonaws.com. Les noms
AWS sont donc demandés à 8.8.8.8 avant l'appel.
"""

from __future__ import annotations

import json
import secrets
import shutil
import socket
import struct
import time
import urllib.request
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

REGION = "us-east-1"
COMPTE_ATTENDU = "790561526299"
FONCTION = "pam-api"
ROLE = "pam-api-lambda"
TABLE = "pam-etat"
SECRET = "pam/otp-hmac"
API = "pam-http"
SEAU = "acme-pam-balances"
ICI = Path(__file__).resolve().parent
PLATEFORME = ICI.parent
_ORIGINE = socket.getaddrinfo


def _lire_nom(data: bytes, offset: int) -> tuple[str, int]:
    labels: list[str] = []
    saute = False
    fin = offset
    vu: set[int] = set()
    while offset < len(data) and offset not in vu:
        vu.add(offset)
        longueur = data[offset]
        if longueur == 0:
            if not saute:
                fin = offset + 1
            break
        if longueur & 0xC0 == 0xC0:
            pointeur = ((longueur & 0x3F) << 8) | data[offset + 1]
            if not saute:
                fin = offset + 2
            saute = True
            offset = pointeur
            continue
        offset += 1
        labels.append(data[offset : offset + longueur].decode("ascii", "replace"))
        offset += longueur
        if not saute:
            fin = offset
    return ".".join(labels), fin


_CACHE: dict[str, str] = {}


def _lire_exact(flux: socket.socket, taille: int) -> bytes:
    data = b""
    while len(data) < taille:
        morceau = flux.recv(taille - len(data))
        if not morceau:
            break
        data += morceau
    if len(data) != taille:
        raise OSError("Réponse DNS incomplète")
    return data


def resoudre(nom: str) -> str:
    """Adresse IPv4 obtenue auprès de 8.8.8.8, en TCP."""
    if nom.replace(".", "").isdigit():
        return nom
    if nom in _CACHE:
        return _CACHE[nom]
    derniere: Exception | None = None
    for _ in range(3):
        try:
            adresse = _resoudre_une_fois(nom)
            _CACHE[nom] = adresse
            return adresse
        except OSError as exc:
            derniere = exc
            time.sleep(1)
    raise OSError(f"Pas d'adresse pour {nom}") from derniere


def _resoudre_une_fois(nom: str) -> str:
    identifiant = secrets.randbelow(65535) + 1
    question = b"".join(bytes([len(partie)]) + partie.encode("ascii") for partie in nom.split(".")) + b"\x00"
    message = struct.pack(">HHHHHH", identifiant, 0x0100, 1, 0, 0, 0) + question + struct.pack(">HH", 1, 1)
    with socket.create_connection(("8.8.8.8", 53), 8) as tcp:
        tcp.settimeout(8)
        tcp.sendall(struct.pack(">H", len(message)) + message)
        taille = struct.unpack(">H", _lire_exact(tcp, 2))[0]
        data = _lire_exact(tcp, taille)
    if struct.unpack(">H", data[:2])[0] != identifiant:
        raise OSError(f"Réponse DNS inattendue pour {nom}")
    _, _, questions, reponses, _, _ = struct.unpack(">HHHHHH", data[:12])
    offset = 12
    for _ in range(questions):
        _, offset = _lire_nom(data, offset)
        offset += 4
    adresses: list[str] = []
    alias: list[str] = []
    for _ in range(reponses):
        _, offset = _lire_nom(data, offset)
        typ, _, _, longueur = struct.unpack(">HHIH", data[offset : offset + 10])
        offset += 10
        contenu = data[offset : offset + longueur]
        if typ == 1 and longueur == 4:
            adresses.append(".".join(str(octet) for octet in contenu))
        elif typ == 5:
            alias.append(_lire_nom(data, offset)[0])
        offset += longueur
    if adresses:
        return adresses[0]
    if alias and alias[0] != nom:
        return resoudre(alias[0])
    raise OSError(f"Pas d'adresse pour {nom}")


def _getaddrinfo(nom, port, family=0, type=0, proto=0, flags=0):
    if isinstance(nom, str) and nom.endswith("amazonaws.com"):
        ip = resoudre(nom)
        numero = 0 if port is None else int(port)
        return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, numero))]
    return _ORIGINE(nom, port, family, type, proto, flags)


socket.getaddrinfo = _getaddrinfo

CONFIGURATION = Config(connect_timeout=20, read_timeout=60, retries={"max_attempts": 5})


def client(service: str):
    return boto3.client(service, region_name=REGION, config=CONFIGURATION)


def code(exc: ClientError) -> str:
    return exc.response.get("Error", {}).get("Code", "")


def main() -> None:
    identite = client("sts").get_caller_identity()
    compte = identite["Account"]
    if compte != COMPTE_ATTENDU:
        raise SystemExit(f"Compte inattendu : {compte}")
    print(f"Compte {compte}")
    assurer_seau()
    assurer_table()
    secret_arn = assurer_secret()
    role_arn = assurer_role(secret_arn)
    archive = construire_archive()
    assurer_fonction(role_arn, archive, secret_arn)
    url = assurer_passerelle()
    time.sleep(3)
    with urllib.request.urlopen(url + "/", timeout=45) as reponse:
        page = reponse.read().decode("utf-8")
        statut = reponse.status
    if statut != 200 or "Vous identifier" not in page or "Indisponible" not in page or "JJMMAAAA" not in page or 'type="password"' not in page or "Relevé PER" not in page or "Bulletin" not in page:
        raise SystemExit(f"La page publiée ne répond pas comme prévu ({statut}).")
    (ICI / "adresses.txt").write_text(f"site={url}\n", encoding="utf-8")
    print(f"SITE {url}")


def assurer_seau() -> None:
    s3 = client("s3")
    try:
        s3.head_bucket(Bucket=SEAU)
        print(f"Seau {SEAU} déjà présent")
        return
    except ClientError as exc:
        if code(exc) not in {"404", "NoSuchBucket", "NotFound"}:
            raise
    s3.create_bucket(Bucket=SEAU)
    s3.put_public_access_block(
        Bucket=SEAU,
        PublicAccessBlockConfiguration={
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True,
        },
    )
    s3.put_bucket_encryption(
        Bucket=SEAU,
        ServerSideEncryptionConfiguration={
            "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}, "BucketKeyEnabled": True}]
        },
    )
    s3.put_bucket_policy(
        Bucket=SEAU,
        Policy=json.dumps({
            "Version": "2012-10-17",
            "Statement": [{
                "Sid": "DenyInsecureTransport",
                "Effect": "Deny",
                "Principal": "*",
                "Action": "s3:*",
                "Resource": [f"arn:aws:s3:::{SEAU}", f"arn:aws:s3:::{SEAU}/*"],
                "Condition": {"Bool": {"aws:SecureTransport": "false"}},
            }],
        }),
    )
    print(f"Seau {SEAU} créé")


def assurer_table() -> None:
    base = client("dynamodb")
    try:
        base.describe_table(TableName=TABLE)
        print(f"Table {TABLE} déjà présente")
    except ClientError as exc:
        if code(exc) != "ResourceNotFoundException":
            raise
        base.create_table(
            TableName=TABLE,
            AttributeDefinitions=[{"AttributeName": "pk", "AttributeType": "S"}],
            KeySchema=[{"AttributeName": "pk", "KeyType": "HASH"}],
            BillingMode="PAY_PER_REQUEST",
        )
        for _ in range(30):
            if base.describe_table(TableName=TABLE)["Table"]["TableStatus"] == "ACTIVE":
                break
            time.sleep(2)
        print(f"Table {TABLE} créée")
    try:
        base.update_time_to_live(
            TableName=TABLE,
            TimeToLiveSpecification={"Enabled": True, "AttributeName": "expire"},
        )
    except ClientError:
        pass


def assurer_secret() -> str:
    coffre = client("secretsmanager")
    try:
        return coffre.describe_secret(SecretId=SECRET)["ARN"]
    except ClientError as exc:
        if code(exc) != "ResourceNotFoundException":
            raise
    arn = coffre.create_secret(Name=SECRET, SecretString=secrets.token_hex(32))["ARN"]
    print("Secret OTP créé")
    return arn


def assurer_role(secret_arn: str) -> str:
    iam = client("iam")
    try:
        arn = iam.get_role(RoleName=ROLE)["Role"]["Arn"]
    except ClientError as exc:
        if code(exc) != "NoSuchEntity":
            raise
        arn = iam.create_role(
            RoleName=ROLE,
            AssumeRolePolicyDocument=json.dumps({
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Principal": {"Service": "lambda.amazonaws.com"},
                    "Action": "sts:AssumeRole",
                }],
            }),
        )["Role"]["Arn"]
        iam.attach_role_policy(
            RoleName=ROLE,
            PolicyArn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        )
        print("Rôle créé, attente de propagation")
        time.sleep(15)
    iam.put_role_policy(
        RoleName=ROLE,
        PolicyName="pam-droits",
        PolicyDocument=json.dumps({
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "Etat",
                    "Effect": "Allow",
                    "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"],
                    "Resource": f"arn:aws:dynamodb:{REGION}:{COMPTE_ATTENDU}:table/{TABLE}",
                },
                {
                    "Sid": "Vault",
                    "Effect": "Allow",
                    "Action": ["s3:GetObject"],
                    "Resource": "arn:aws:s3:::acme-prospection-data/vault/vault-employee-list.csv",
                },
                {
                    "Sid": "Balances",
                    "Effect": "Allow",
                    "Action": ["s3:GetObject"],
                    "Resource": [
                        f"arn:aws:s3:::{SEAU}/pam/balances/per/*",
                        f"arn:aws:s3:::{SEAU}/pam/balances/payslip/*",
                    ],
                },
                {
                    "Sid": "BalancesListe",
                    "Effect": "Allow",
                    "Action": ["s3:ListBucket"],
                    "Resource": f"arn:aws:s3:::{SEAU}",
                    "Condition": {"StringLike": {"s3:prefix": ["pam/balances/*"]}},
                },
                {
                    "Sid": "Secret",
                    "Effect": "Allow",
                    "Action": ["secretsmanager:GetSecretValue"],
                    "Resource": secret_arn,
                },
                {
                    "Sid": "Courriel",
                    "Effect": "Allow",
                    "Action": ["ses:SendEmail"],
                    "Resource": [
                        f"arn:aws:ses:{REGION}:{COMPTE_ATTENDU}:identity/acmehaiti.com",
                        f"arn:aws:ses:{REGION}:{COMPTE_ATTENDU}:identity/autorapport@acmehaiti.com",
                    ],
                },
            ],
        }),
    )
    return arn


def _effacer(chemin: Path) -> None:
    for essai in range(8):
        try:
            if chemin.exists():
                shutil.rmtree(chemin)
            return
        except PermissionError:
            time.sleep(0.4 * (essai + 1))
    if chemin.exists():
        shutil.rmtree(chemin)


def construire_archive() -> Path:
    paquet = ICI / "_paquet"
    _effacer(paquet)
    paquet.mkdir()
    (paquet / "statique").mkdir()
    for nom in ("noyau.py", "depot.py", "serveur.py", "fiche_paie.py"):
        shutil.copy(PLATEFORME / nom, paquet / nom)
    logo = PLATEFORME / "logo_acme.jpg"
    if logo.is_file():
        shutil.copy(logo, paquet / "logo_acme.jpg")
    shutil.copy(PLATEFORME.parent / "pam_otp_email.html", paquet / "pam_otp_email.html")
    for nom in ("index.html", "pam.css", "pam.js"):
        shutil.copy(PLATEFORME / "statique" / nom, paquet / "statique" / nom)
    archive = ICI / "pam-api"
    if archive.with_suffix(".zip").exists():
        archive.with_suffix(".zip").unlink()
    shutil.make_archive(str(archive), "zip", paquet)
    _effacer(paquet)
    return archive.with_suffix(".zip")


def attendre_fonction(lam) -> None:
    for _ in range(40):
        etat = lam.get_function_configuration(FunctionName=FONCTION)
        if etat.get("LastUpdateStatus", "Successful") == "Successful" and etat.get("State") == "Active":
            return
        time.sleep(2)
    raise SystemExit("La fonction PAM n'est pas devenue active.")


def assurer_fonction(role_arn: str, archive: Path, secret_arn: str) -> None:
    lam = client("lambda")
    corps = archive.read_bytes()
    variables = {
        "PAM_TABLE": TABLE,
        "PAM_S3_BUCKET": SEAU,
        "PAM_S3_PREFIX": "pam/balances",
        "PAM_VAULT_BUCKET": "acme-prospection-data",
        "PAM_VAULT_KEY": "vault/vault-employee-list.csv",
        "PAM_SECRET_ARN": secret_arn,
        "PAM_EXPEDITEUR": "autorapport@acmehaiti.com",
        "PAM_REPONSE": "dit@acmehaiti.com",
        "PAM_WHATSAPP": "off",
    }
    try:
        lam.get_function(FunctionName=FONCTION)
        existe = True
    except ClientError as exc:
        if code(exc) != "ResourceNotFoundException":
            raise
        existe = False
    if not existe:
        lam.create_function(
            FunctionName=FONCTION,
            Runtime="python3.12",
            Role=role_arn,
            Handler="serveur.gestionnaire_lambda",
            Timeout=30,
            MemorySize=256,
            Code={"ZipFile": corps},
            Environment={"Variables": variables},
        )
    else:
        lam.update_function_code(FunctionName=FONCTION, ZipFile=corps)
        attendre_fonction(lam)
        lam.update_function_configuration(
            FunctionName=FONCTION,
            Timeout=30,
            MemorySize=256,
            Environment={"Variables": variables},
        )
    attendre_fonction(lam)


def assurer_passerelle() -> str:
    passerelle = client("apigatewayv2")
    lam = client("lambda")
    jeton = None
    while True:
        page = passerelle.get_apis(NextToken=jeton) if jeton else passerelle.get_apis()
        for item in page.get("Items") or []:
            if item.get("Name") == API:
                return item["ApiEndpoint"]
        jeton = page.get("NextToken")
        if not jeton:
            break
    cree = passerelle.create_api(Name=API, ProtocolType="HTTP")
    api_id = cree["ApiId"]
    fonction_arn = lam.get_function(FunctionName=FONCTION)["Configuration"]["FunctionArn"]
    integration = passerelle.create_integration(
        ApiId=api_id,
        IntegrationType="AWS_PROXY",
        IntegrationUri=fonction_arn,
        PayloadFormatVersion="2.0",
    )["IntegrationId"]
    for route in ("ANY /{proxy+}", "ANY /"):
        passerelle.create_route(ApiId=api_id, RouteKey=route, Target=f"integrations/{integration}")
    passerelle.create_stage(ApiId=api_id, StageName="$default", AutoDeploy=True)
    try:
        lam.add_permission(
            FunctionName=FONCTION,
            StatementId="pam-http",
            Action="lambda:InvokeFunction",
            Principal="apigateway.amazonaws.com",
            SourceArn=f"arn:aws:execute-api:{REGION}:{COMPTE_ATTENDU}:{api_id}/*/*/*",
        )
    except ClientError as exc:
        if code(exc) != "ResourceConflictException":
            raise
    return passerelle.get_api(ApiId=api_id)["ApiEndpoint"]


if __name__ == "__main__":
    main()
