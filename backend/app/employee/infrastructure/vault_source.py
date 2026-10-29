"""Où lire la copie Vault des employés (US-1001) : objet S3 en production, fichier local sur le poste et en test.

Chaque source donne une version (ETag de l'objet, date et taille du fichier) : le dépôt des employés ne relit
la copie que quand sa version change.
"""

from pathlib import Path

DEFAULT_VAULT_KEY = "vault/vault-employee-list.csv"
"""Même objet que Carrières, SISA et l'évaluation (seau `acme-prospection-data`)."""


class LocalVaultFile:
    def __init__(self, path: Path) -> None:
        self.path = path

    def version(self) -> str:
        stat = self.path.stat()
        return f"{stat.st_mtime_ns}-{stat.st_size}"

    def read(self) -> tuple[bytes, str]:
        version = self.version()
        return self.path.read_bytes(), version


class S3VaultObject:
    """Lecture seule : le rôle du portail n'a que `s3:GetObject` sur cet objet (HEAD compris)."""

    def __init__(self, client, bucket: str, key: str) -> None:
        self._client = client
        self.bucket = bucket
        self.key = key

    @classmethod
    def create(cls, bucket: str, key: str, region: str) -> "S3VaultObject":
        import boto3

        # Ni adresse ni clé : sur AWS, boto3 prend les droits du rôle d'exécution.
        return cls(boto3.client("s3", region_name=region), bucket, key)

    def version(self) -> str:
        return self._client.head_object(Bucket=self.bucket, Key=self.key)["ETag"].strip('"')

    def read(self) -> tuple[bytes, str]:
        response = self._client.get_object(Bucket=self.bucket, Key=self.key)
        return response["Body"].read(), response["ETag"].strip('"')
