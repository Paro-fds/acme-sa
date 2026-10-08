"""Les règles de Clean Architecture font partie de la suite de tests :
une violation des contrats import-linter (pyproject.toml) fait échouer pytest.
"""

import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _lint_imports() -> subprocess.CompletedProcess:
    lint_imports = Path(sys.executable).parent / "lint-imports"
    return subprocess.run(
        [str(lint_imports), "--no-cache"],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8",
        env={**os.environ, "PYTHONIOENCODING": "utf-8"},  # noms de contrats accentués (console Windows)
    )


def test_clean_architecture_contracts():
    result = _lint_imports()

    assert result.returncode == 0, result.stdout + result.stderr


def test_career_is_independent_of_the_campaign():
    """V2 (AD-V2-02, T-25.6) : le module `career` n'importe jamais `app.update` ; il est soumis aux mêmes contrats."""
    result = _lint_imports()

    assert "Parcours indépendant de la campagne KEPT" in result.stdout
    configuration = (BACKEND_DIR / "pyproject.toml").read_text(encoding="utf-8")
    for module in ("app.career", "app.career.domain", "app.career.application", "app.career.api", "app.career.infrastructure"):
        assert f'"{module}"' in configuration
