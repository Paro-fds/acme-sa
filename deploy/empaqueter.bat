@echo off
rem Fabrique deploy\out\pam-lambda.zip, a deposer dans la console AWS Lambda (Python 3.12, x86_64).
rem Double-cliquer, ou lancer depuis n'importe quel dossier : le script se place dans le projet.
rem Aucun secret ni donnee fictive dans le zip : la configuration se fait dans la console (variables d'environnement).

setlocal
chcp 65001 > nul
cd /d "%~dp0.."

set "PYTHON=backend\.venv\Scripts\python.exe"
if not exist "%PYTHON%" (
  echo Python du projet introuvable : %PYTHON%
  echo Creez d'abord l'environnement du backend ^(voir agent.md, section 5^).
  pause
  exit /b 1
)

where npm > nul 2> nul
if errorlevel 1 (
  echo npm introuvable : installez Node.js pour compiler l'ecran.
  pause
  exit /b 1
)

"%PYTHON%" deploy\build_lambda.py
if errorlevel 1 (
  echo.
  echo L'empaquetage a echoue : voir le message ci-dessus.
  pause
  exit /b 1
)

echo.
echo Termine. Fichier a deposer dans la console Lambda :
echo   %CD%\deploy\out\pam-lambda.zip
pause
