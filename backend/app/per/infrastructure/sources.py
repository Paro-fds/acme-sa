"""US-1012 : où lire les balances PER.

- `S3PerSource` : le seau `acme-pam-balances` (lecture seule de `per/`), droits du rôle d'exécution ;
- `LocalPerSource` : un dossier sur le disque, mêmes clés (poste du développeur, tests, démonstration).
"""

import json
import logging
from pathlib import Path

from app.per.domain.ports import PerSourceUnavailable

logger = logging.getLogger(__name__)
ABSENT = {"NoSuchKey", "NoSuchBucket", "404", "NotFound", "AccessDenied", "403"}
"""Sans `s3:ListBucket`, une clé absente revient en AccessDenied (note du directeur) : c'est une absence."""


class LocalPerSource:
    def __init__(self, root: Path) -> None:
        self._root = root

    def read(self, key: str) -> dict | None:
        path = self._root / key
        if not path.is_file():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            raise PerSourceUnavailable(type(error).__name__) from error


class S3PerSource:
    def __init__(self, client, bucket: str) -> None:
        self._client = client
        self._bucket = bucket

    @classmethod
    def create(cls, bucket: str, region: str) -> "S3PerSource":
        import boto3

        return cls(boto3.client("s3", region_name=region), bucket)

    def read(self, key: str) -> dict | None:
        from botocore.exceptions import BotoCoreError, ClientError

        try:
            body = self._client.get_object(Bucket=self._bucket, Key=key)["Body"].read()
        except ClientError as error:
            code = error.response.get("Error", {}).get("Code")
            if code in ABSENT:
                return None
            logger.warning("Balance PER illisible (%s)", code)
            raise PerSourceUnavailable("S3") from error
        except BotoCoreError as error:
            logger.warning("Balance PER illisible (%s)", type(error).__name__)
            raise PerSourceUnavailable("S3") from error
        try:
            return json.loads(body)
        except ValueError as error:
            raise PerSourceUnavailable("JSON") from error
