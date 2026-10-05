<#
.SYNOPSIS
    Lance le portail employés ACME (API + frontend) sur cette machine.

.DESCRIPTION
    1. Compile le frontend si nécessaire (ou toujours avec -Build).
    2. Lance l'API FastAPI, qui sert aussi le frontend, sur le port 8000.
    3. Affiche l'adresse à ouvrir depuis un téléphone du même réseau.
    4. Avec -Tunnel : ouvre aussi un accès Internet temporaire en HTTPS (Cloudflare Tunnel,
       adresse https://….trycloudflare.com, nouvelle à chaque lancement) pour les testeurs
       qui ne sont pas sur le même Wi-Fi.

    Au premier lancement (aucun administrateur dans la base), l'identifiant et le mot de passe
    du premier administrateur sont demandés ici ; les suivants s'ajoutent dans le portail.

    Prérequis (une seule fois) :
      cd backend ; python -m venv .venv ; .venv\Scripts\python -m pip install -e ".[dev]"
      cd frontend ; npm install
      Copier backend\.env.example en backend\.env et l'adapter.
      Pour -Tunnel : winget install --id Cloudflare.cloudflared

.EXAMPLE
    .\run.ps1
    .\run.ps1 -Build
    .\run.ps1 -Tunnel
#>
param(
    [switch]$Build,
    [switch]$Tunnel,
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

# US-23 : premier administrateur demandé ici, dans la console (jamais par une page web).
Push-Location $backend
try {
    & $python -m app.tools.create_admin --if-missing
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Portail non démarré : il faut un compte administrateur." -ForegroundColor Red
        exit 1
    }
}
finally { Pop-Location }

$tunnelProcess = $null
$tunnelUrl = $null
if ($Tunnel) {
    $cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
    if (-not $cloudflared) { $cloudflared = Join-Path ${env:ProgramFiles(x86)} 'cloudflared\cloudflared.exe' }
    if (-not (Test-Path $cloudflared)) {
        Write-Host "cloudflared introuvable. L'installer : winget install --id Cloudflare.cloudflared" -ForegroundColor Red
        exit 1
    }
    $tunnelLog = Join-Path $env:TEMP 'acme-tunnel.log'
    Remove-Item $tunnelLog, "$tunnelLog.out" -ErrorAction SilentlyContinue
    $tunnelProcess = Start-Process -FilePath $cloudflared -PassThru -WindowStyle Hidden `
        -ArgumentList 'tunnel', '--no-autoupdate', '--url', "http://127.0.0.1:$Port" `
        -RedirectStandardError $tunnelLog -RedirectStandardOutput "$tunnelLog.out"
    Write-Host "Ouverture de l'accès Internet..." -ForegroundColor Cyan
    for ($i = 0; $i -lt 30 -and -not $tunnelUrl; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path $tunnelLog) {
            $match = Select-String -Path $tunnelLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
            if ($match) { $tunnelUrl = $match.Matches[0].Value }
        }
    }
    if (-not $tunnelUrl) {
        Write-Host "L'accès Internet n'a pas pu être ouvert (voir $tunnelLog). Le portail reste accessible en local." -ForegroundColor Yellow
    }
}

$ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -ExpandProperty IPAddress

Write-Host ""
Write-Host "Portail ACME démarré." -ForegroundColor Green
Write-Host "  Sur cet ordinateur : http://127.0.0.1:$Port"
foreach ($ip in $ips) { Write-Host "  Depuis un téléphone (même Wi-Fi) : http://${ip}:$Port" }
if ($tunnelUrl) {
    Write-Host "  Depuis n'importe où (Internet) : $tunnelUrl" -ForegroundColor Green
    Write-Host "    Administration : $tunnelUrl/admin/connexion"
    Write-Host "    À ne transmettre qu'aux testeurs ; l'accès se ferme avec Ctrl+C."
}
Write-Host "  Arrêter : Ctrl+C"
Write-Host ""

Push-Location $backend
try {
    & $python -m uvicorn app.main:create_app --factory --host 0.0.0.0 --port $Port
}
finally {
    Pop-Location
    # L'accès Internet se ferme avec le portail.
    if ($tunnelProcess -and -not $tunnelProcess.HasExited) { Stop-Process -Id $tunnelProcess.Id -Force }
}
