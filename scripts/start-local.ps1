#Requires -Version 5.1
<#
  Levanta el mock del Lambda y Vite como procesos independientes (Windows),
  para que sigan corriendo aunque se cierre la terminal o la sesión del agente.

  Uso:
    powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1
#>

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$stateFile = Join-Path $env:TEMP 'sica-servers.json'
$node = (Get-Command node).Source

function Test-PortListening {
  param([int]$Port)
  return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

$mockPid = $null
$devPid = $null

if (Test-PortListening -Port 4000) {
  Write-Host 'Mock: ya estaba escuchando en el puerto 4000.'
} else {
  $mock = Start-Process -FilePath $node `
    -ArgumentList 'mock/lambda-mock.mjs' `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'mock.out.log') `
    -RedirectStandardError (Join-Path $logDir 'mock.err.log') `
    -PassThru
  $mockPid = $mock.Id
  Write-Host "Mock iniciado (PID $mockPid)."
}

if (Test-PortListening -Port 5173) {
  Write-Host 'Frontend: ya estaba escuchando en el puerto 5173.'
} else {
  $dev = Start-Process -FilePath $node `
    -ArgumentList 'node_modules/vite/bin/vite.js' `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'vite.out.log') `
    -RedirectStandardError (Join-Path $logDir 'vite.err.log') `
    -PassThru
  $devPid = $dev.Id
  Write-Host "Frontend iniciado (PID $devPid)."
}

$state = [pscustomobject]@{
  mockPid   = $mockPid
  devPid    = $devPid
  startedAt = (Get-Date).ToString('o')
}
$state | ConvertTo-Json | Set-Content -Path $stateFile -Encoding utf8

for ($i = 0; $i -lt 40; $i++) {
  if ((Test-PortListening -Port 4000) -and (Test-PortListening -Port 5173)) { break }
  Start-Sleep -Milliseconds 500
}

Write-Host ''
if (Test-PortListening -Port 4000) {
  Write-Host '  Mock Lambda: http://localhost:4000'
} else {
  Write-Host '  Mock Lambda: NO responde. Revisa logs/mock.err.log'
}
if (Test-PortListening -Port 5173) {
  Write-Host '  Frontend:    http://localhost:5173'
} else {
  Write-Host '  Frontend:    NO responde. Revisa logs/vite.err.log'
}
Write-Host ''
Write-Host "  Logs: $logDir"
Write-Host '  Para detenerlos: powershell -ExecutionPolicy Bypass -File scripts/stop-local.ps1'
