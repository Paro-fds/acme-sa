"""US-001 : stockage des fichiers hors du serveur, pour les déploiements (le disque d'un conteneur est éphémère).

`S3FileStorage` respecte le port `FileStorage` : compartiment privé, et l'API reste la seule porte vers les fichiers.
Le même code sert sur le démonstrateur (Supabase Storage, par son accès S3) et sur AWS (S3).
"""


def _checked(key: str) -> str:
    if not key or key.startswith("/") or ".." in key.split("/"):
        raise ValueError(f"Clé de stockage invalide : {key!r}")
    return key


class S3FileStorage:
    """Interface S3 (boto3). Sur AWS, sans clé ni adresse : le rôle de la tâche Fargate suffit."""

    def __init__(self, bucket: str, client) -> None:
        if not bucket:
            raise ValueError("S3_BUCKET est nécessaire.")
        self._bucket = bucket
        self._client = client

    @classmethod
    def create(cls, bucket: str, region: str, endpoint_url: str, access_key_id: str, secret_access_key: str):
        import boto3
        from botocore.config import Config

        # Un point d'accès S3 autre qu'AWS (Supabase Storage) attend le compartiment dans le chemin de l'adresse.
        addressing = {"addressing_style": "path"} if endpoint_url else {}
        client = boto3.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint_url or None,
            aws_access_key_id=access_key_id or None,
            aws_secret_access_key=secret_access_key or None,
            config=Config(s3=addressing),
        )
        return cls(bucket, client)

    def save(self, key: str, content: bytes) -> None:
        key = _checked(key)
        self._client.put_object(Bucket=self._bucket, Key=key, Body=content)

    def open(self, key: str) -> bytes:
        key = _checked(key)
        try:
            return self._client.get_object(Bucket=self._bucket, Key=key)["Body"].read()
        except self._client.exceptions.NoSuchKey as error:
            raise FileNotFoundError(key) from error

    def delete(self, key: str) -> None:
        key = _checked(key)
        self._client.delete_object(Bucket=self._bucket, Key=key)
