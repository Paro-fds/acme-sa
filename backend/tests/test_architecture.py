"""Les règles de Clean Architecture font partie de la suite de tests :
une violation des contrats import-linter (pyproject.toml) fait échouer pytest.
"""

import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def test_clean_architecture_contracts():
    lint_imports = Path(sys.executable).parent / "lint-imports"
    result = subprocess.run(
        [str(lint_imports), "--no-cache"],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )

    assert result.returncode == 0, result.stdout + result.stderr
