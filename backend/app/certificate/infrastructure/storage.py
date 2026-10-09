"""US-301 CA-06 : stockage privé des certificats.

En ligne (`STORAGE_BACKEND=s3`), le navigateur envoie le fichier directement au compartiment avec une adresse signée
valable 10 minutes ; l'API ne voit jamais passer le fichier. Sur le poste du développeur, le stockage local joue le
même rôle : l'adresse signée est une route de l'API qui écrit sur le disque.
"""

import os
from pathlib import Path

from app.certificate.domain.ports import UploadTicket

UPLOAD_SECONDS = 600


class LocalCertificateStorage:
    def __init__(self, root: Path, upload_url: str = "/api/me/certificates/uploads") -> None:
        self._root = root.resolve()
        self._root.mkdir(parents=True, exist_ok=True)
        self._upload_url = upload_url

    def _path(self, key: str) -> Path:
        path = (self._root / key).resolve()
        if not key or path == self._root or not path.is_relative_to(self._root):
            raise ValueError(f"Clé de stockage invalide : {key!r}")
        return path

    @property
    def receives_uploads(self) -> bool:
        return True

    def presign_upload(self, key: str, content_type: str) -> UploadTicket:
        upload_id = key.rsplit("/", 1)[-1]
        return UploadTicket("PUT", f"{self._upload_url}/{upload_id}", {"Content-Type": content_type})

    def receive(self, key: str, content: bytes) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_name(f".{path.name}.tmp")
        temporary.write_bytes(content)
        os.replace(temporary, path)

    def size(self, key: str) -> int | None:
        path = self._path(key)
        return path.stat().st_size if path.is_file() else None

    def head(self, key: str, length: int) -> bytes:
        with self._path(key).open("rb") as file:
            return file.read(length)

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)


class S3CertificateStorage:
    """Compartiment privé S3 (AWS) ou compatible S3 (Supabase Storage au démonstrateur)."""

    def __init__(self, bucket: str, client) -> None:
        if not bucket:
            raise ValueError("S3_BUCKET est nécessaire.")
        self._bucket = bucket
        self._client = client

    @classmethod
    def create(cls, bucket: str, region: str, endpoint_url: str, access_key_id: str, secret_access_key: str):
        import boto3
        from botocore.config import Config

        addressing = {"addressing_style": "path"} if endpoint_url else {}
        client = boto3.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint_url or None,
            aws_access_key_id=access_key_id or None,
            aws_secret_access_key=secret_access_key or None,
            config=Config(s3=addressing, signature_version="s3v4"),
        )
        return cls(bucket, client)

    @property
    def receives_uploads(self) -> bool:
        return False

    def presign_upload(self, key: str, content_type: str) -> UploadTicket:
        url = self._client.generate_presigned_url(
            "put_object",
            Params={"Bucket": self._bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=UPLOAD_SECONDS,
        )
        return UploadTicket("PUT", url, {"Content-Type": content_type})

    def receive(self, key: str, content: bytes) -> None:
        raise NotImplementedError("En ligne, le fichier va directement au stockage.")

    def size(self, key: str) -> int | None:
        try:
            return self._client.head_object(Bucket=self._bucket, Key=key)["ContentLength"]
        except self._client.exceptions.ClientError:
            return None

    def head(self, key: str, length: int) -> bytes:
        response = self._client.get_object(Bucket=self._bucket, Key=key, Range=f"bytes=0-{length - 1}")
        return response["Body"].read()

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=key)
