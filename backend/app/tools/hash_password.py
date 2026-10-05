"""Génère le hash Argon2 du mot de passe administrateur (ADMIN_PASSWORD_HASH).

Usage :
    python -m app.tools.hash_password          # affiche le hash, à copier dans backend/.env
    python -m app.tools.hash_password --env    # l'écrit directement dans backend/.env
                                               # (créé depuis .env.example s'il n'existe pas)
"""

import getpass
import re
import sys
from pathlib import Path

from argon2 import PasswordHasher

from app.config import BACKEND_DIR

MIN_LENGTH = 8


def write_env(password_hash: str, env_file: Path, example: Path) -> None:
    """Remplace (ou ajoute) la ligne ADMIN_PASSWORD_HASH, sans toucher aux autres paramètres."""
    text = env_file.read_text(encoding="utf-8") if env_file.exists() else example.read_text(encoding="utf-8")
    line = f"ADMIN_PASSWORD_HASH={password_hash}"
    if re.search(r"^ADMIN_PASSWORD_HASH=.*$", text, flags=re.M):
        text = re.sub(r"^ADMIN_PASSWORD_HASH=.*$", lambda _: line, text, count=1, flags=re.M)
    else:
        text = text.rstrip("\n") + f"\n{line}\n"
    env_file.write_text(text, encoding="utf-8")


def main() -> None:
    args = sys.argv[1:]
    to_env = "--env" in args
    args = [arg for arg in args if arg != "--env"]
    if args:
        password = args[0]
    else:
        password = getpass.getpass("Mot de passe administrateur : ")
        if password != getpass.getpass("Confirmation : "):
            sys.exit("Les deux mots de passe ne correspondent pas.")
    if len(password) < MIN_LENGTH:
        sys.exit(f"Le mot de passe doit contenir au moins {MIN_LENGTH} caractères.")
    password_hash = PasswordHasher().hash(password)
    if to_env:
        env_file = BACKEND_DIR / ".env"
        write_env(password_hash, env_file, BACKEND_DIR / ".env.example")
        print(f"Mot de passe administrateur enregistré dans {env_file} (redémarrer le portail).")
    else:
        print(password_hash)


if __name__ == "__main__":
    main()
