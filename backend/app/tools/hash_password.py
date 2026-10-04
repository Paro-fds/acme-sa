"""Génère le hash Argon2 du mot de passe administrateur, à copier dans backend/.env (ADMIN_PASSWORD_HASH).

Usage : python -m app.tools.hash_password
"""

import getpass
import sys

from argon2 import PasswordHasher


def main() -> None:
    if len(sys.argv) > 1:
        password = sys.argv[1]
    else:
        password = getpass.getpass("Mot de passe administrateur : ")
        if password != getpass.getpass("Confirmation : "):
            sys.exit("Les deux mots de passe ne correspondent pas.")
    if len(password) < 8:
        sys.exit("Le mot de passe doit contenir au moins 8 caractères.")
    print(PasswordHasher().hash(password))


if __name__ == "__main__":
    main()
