# Startet Gopas Küche: Ollama (falls nötig) und das Backend. Beenden mit Strg+C.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$port = 8000

# .env laden (Zeilen KEY=Wert, Kommentare mit # werden ignoriert)
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
  Write-Host "Es fehlt die Datei .env. Kopiere .env.example nach .env und trage APP_PASSWORD ein." -ForegroundColor Red
  Read-Host "Enter zum Schliessen"; exit 1
}
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $value = ($Matches[2] -split '\s+#')[0].Trim()
    [Environment]::SetEnvironmentVariable($Matches[1], $value, "Process")
  }
}
if (-not $env:APP_PASSWORD) {
  Write-Host "In der .env fehlt APP_PASSWORD." -ForegroundColor Red
  Read-Host "Enter zum Schliessen"; exit 1
}
if (-not $env:DATA_DIR) { $env:DATA_DIR = Join-Path $root "data" }
if (-not $env:LLM_PROVIDER) { $env:LLM_PROVIDER = "ollama" }
if ($env:OLLAMA_URL -like "*host.docker.internal*") { $env:OLLAMA_URL = "http://localhost:11434" }  # Docker-Adresse gilt hier nicht

function Test-Ollama {
  try { Invoke-WebRequest "http://localhost:11434" -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true } catch { return $false }
}

# Ollama starten, falls es nicht läuft
$startedOllama = $null
if ($env:LLM_PROVIDER -eq "ollama" -and -not (Test-Ollama)) {
  Write-Host "Starte Ollama ..."
  $startedOllama = Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden -PassThru
  $up = $false
  for ($i = 0; $i -lt 20 -and -not $up; $i++) { Start-Sleep -Seconds 1; $up = Test-Ollama }
  if (-not $up) {
    Write-Host "Ollama startet nicht. Ist es installiert (ollama.com)?" -ForegroundColor Red
    Read-Host "Enter zum Schliessen"; exit 1
  }
}

$python = Join-Path $root "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $python)) { $python = "python" }

Write-Host ""
Write-Host "Gopas Küche läuft. Trage in der App eine dieser Adressen ein:" -ForegroundColor Green
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
  ForEach-Object { Write-Host ("  http://{0}:{1}" -f $_.IPAddress, $port) }
Write-Host "Beenden mit Strg+C." -ForegroundColor Yellow
Write-Host ""

try {
  Push-Location (Join-Path $root "backend")
  & $python -m uvicorn app.main:app --host 0.0.0.0 --port $port
} finally {
  Pop-Location
  if ($startedOllama -and -not $startedOllama.HasExited) { Stop-Process -Id $startedOllama.Id -Force }
}
