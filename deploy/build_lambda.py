"""Fabrique `deploy/out/pam-lambda.zip`, à déposer dans la console AWS Lambda (Python 3.12, x86_64).

    backend/.venv/Scripts/python deploy/build_lambda.py

Le zip contient l'application (`app/`), les migrations, l'écran compilé (`frontend_dist/`) et les bibliothèques
pour Linux. Il ne contient ni données fictives (`demo/`), ni tests, ni secret : la configuration passe par les
variables d'environnement de la fonction (voir docs/pam/deploiement-console.md).
"""

import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
OUT = ROOT / "deploy" / "out"
ZIP = OUT / "pam-lambda.zip"

# boto3 est fourni par le runtime Lambda ; uvicorn ne sert pas (API Gateway appelle la fonction).
DEPENDENCIES = [
    "fastapi", "sqlalchemy>=2", "pydantic>=2", "pydantic-settings", "argon2-cffi", "python-multipart",
    "psycopg[binary]", "alembic", "pyotp", "segno", "openpyxl", "mangum",
]
SKIP = shutil.ignore_patterns("__pycache__", "*.pyc", "tests", "demo")


def run(command: list[str], cwd: Path) -> None:
    print("›", " ".join(command))
    subprocess.run(command, cwd=cwd, check=True, shell=sys.platform == "win32" and command[0] == "npm")


def main() -> None:
    run(["npm", "run", "build"], FRONTEND)
    OUT.mkdir(parents=True, exist_ok=True)
    # Construction hors OneDrive : la synchronisation verrouille les milliers de petits fichiers des bibliothèques.
    with tempfile.TemporaryDirectory(prefix="pam-lambda-") as temporary:
        build(Path(temporary))


def build(build_dir: Path) -> None:
    run(
        [
            sys.executable, "-m", "pip", "install", "--quiet", "--target", str(build_dir),
            "--platform", "manylinux2014_x86_64", "--implementation", "cp", "--python-version", "3.12",
            "--only-binary=:all:", *DEPENDENCIES,
        ],
        ROOT,
    )
    shutil.copytree(BACKEND / "app", build_dir / "app", ignore=SKIP)
    shutil.copytree(BACKEND / "migrations", build_dir / "migrations", ignore=SKIP)
    shutil.copy2(BACKEND / "alembic.ini", build_dir / "alembic.ini")
    shutil.copytree(FRONTEND / "dist", build_dir / "frontend_dist")

    ZIP.unlink(missing_ok=True)
    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(build_dir.rglob("*")):
            if path.is_file() and "__pycache__" not in path.parts:
                archive.write(path, path.relative_to(build_dir).as_posix())
    size = ZIP.stat().st_size / 1024 / 1024
    print(f"{ZIP} : {size:.1f} Mo" + ("" if size < 50 else " — plus de 50 Mo : le déposer d'abord sur S3."))


if __name__ == "__main__":
    main()
