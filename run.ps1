<#
.SYNOPSIS
    Lance le portail employés ACME (API + frontend) sur cette machine.

.DESCRIPTION
    1. Compile le frontend si nécessaire (ou toujours avec -Build).
    2. Lance l'API FastAPI, qui sert aussi le frontend, sur le port 8000.
    3. Affiche l'adresse à ouvrir depuis un téléphone du même réseau.

    Prérequis (une seule fois) :
      cd backend ; python -m venv .venv ; .venv\Scripts\python -m pip install -e ".[dev]"
      cd frontend ; npm install
      Copier backend\.env.example en backend\.env et l'adapter.

.EXAMPLE
    .\run.ps1
    .\run.ps1 -Build
#>
param(
    [switch]$Build,
    [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$python = Join-Path $backend '.venv\Scripts\python.exe'

if (-not (Test-Path $python)) {
    Write-Host "Environnement Python introuvable. Voir les prérequis : Get-Help .\run.ps1" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
    Write-Host "Dépendances du frontend absentes. Lancez : cd frontend ; npm install" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path (Join-Path $backend '.env'))) {
    Write-Host "Attention : backend\.env absent, les valeurs par défaut sont utilisées." -ForegroundColor Yellow
}

if ($Build -or -not (Test-Path (Join-Path $frontend 'dist\index.html'))) {
    Write-Host "Compilation du frontend..." -ForegroundColor Cyan
    Push-Location $frontend
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "La compilation du frontend a échoué." }
    }
    finally { Pop-Location }
}

$ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -ExpandProperty IPAddress

Write-Host ""
Write-Host "Portail ACME démarré." -ForegroundColor Green
Write-Host "  Sur cet ordinateur : http://127.0.0.1:$Port"
foreach ($ip in $ips) { Write-Host "  Depuis un téléphone (même Wi-Fi) : http://${ip}:$Port" }
Write-Host "  Arrêter : Ctrl+C"
Write-Host ""

Push-Location $backend
try {
    & $python -m uvicorn app.main:create_app --factory --host 0.0.0.0 --port $Port
}
finally { Pop-Location }
