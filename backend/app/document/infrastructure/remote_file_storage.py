"""US-001 : stockage des fichiers hors du serveur, pour les déploiements (le disque d'un conteneur est éphémère).

- `S3FileStorage` : interface S3 (Supabase Storage par son point d'accès S3 sur le démonstrateur, S3 sur AWS).
- `SupabaseFileStorage` : API de stockage de Supabase, solution de secours tant que l'accès S3 n'est pas ouvert.

Les deux respectent le port `FileStorage` : compartiment privé, et l'API reste la seule porte vers les fichiers.
"""

from urllib.parse import quote

import httpx


def _checked(key: str) -> str:
    if not key or key.startswith("/") or ".." in key.split("/"):
        raise ValueError(f"Clé de stockage invalide : {key!r}")
    return key


class SupabaseFileStorage:
    """API de stockage de Supabase, avec la clé `service_role` (côté serveur uniquement, jamais dans le navigateur)."""

    def __init__(self, base_url: str, service_role_key: str, bucket: str, client: httpx.Client | None = None) -> None:
        if not (base_url and service_role_key and bucket):
            raise ValueError("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et S3_BUCKET sont nécessaires.")
        self._objects = f"{base_url.rstrip('/')}/storage/v1/object"
        self._bucket = bucket
        self._client = client or httpx.Client(timeout=30)
        self._headers = {"Authorization": f"Bearer {service_role_key}", "apikey": service_role_key}

    def _url(self, key: str) -> str:
        return f"{self._objects}/{self._bucket}/{quote(_checked(key))}"

    def save(self, key: str, content: bytes) -> None:
        response = self._client.post(
            self._url(key),
            content=content,
            headers={**self._headers, "Content-Type": "application/octet-stream", "x-upsert": "true"},
        )
        response.raise_for_status()

    def open(self, key: str) -> bytes:
        response = self._client.get(self._url(key), headers=self._headers)
        if response.status_code in (400, 404):
            raise FileNotFoundError(key)
        response.raise_for_status()
        return response.content

    def delete(self, key: str) -> None:
        response = self._client.request(
            "DELETE", f"{self._objects}/{self._bucket}", json={"prefixes": [_checked(key)]}, headers=self._headers
        )
        response.raise_for_status()


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

        client = boto3.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint_url or None,
            aws_access_key_id=access_key_id or None,
            aws_secret_access_key=secret_access_key or None,
        )
        return cls(bucket, client)

    def save(self, key: str, content: bytes) -> None:
        self._client.put_object(Bucket=self._bucket, Key=_checked(key), Body=content)

    def open(self, key: str) -> bytes:
        try:
            return self._client.get_object(Bucket=self._bucket, Key=_checked(key))["Body"].read()
        except self._client.exceptions.NoSuchKey as error:
            raise FileNotFoundError(key) from error

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=_checked(key))
