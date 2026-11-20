#Requires -Version 5.1
<#
  Detiene el mock del Lambda y Vite iniciados con scripts/start-local.ps1.

  Uso:
    powershell -ExecutionPolicy Bypass -File scripts/stop-local.ps1
#>

$ErrorActionPreference = 'Stop'

$stateFile = Join-Path $env:TEMP 'sica-servers.json'

if (-not (Test-Path $stateFile)) {
  Write-Host 'No hay procesos registrados por start-local.ps1.'
  exit 0
}

$state = Get-Content $stateFile -Raw | ConvertFrom-Json
$pids = @($state.mockPid, $state.devPid) | Where-Object { $_ }

foreach ($processId in $pids) {
  $process = Get-Process -Id ([int]$processId) -ErrorAction SilentlyContinue
  if (-not $process) {
    Write-Host "PID $processId ya no está corriendo."
    continue
  }

  try {
    Stop-Process -Id $process.Id -Force -ErrorAction Stop
    Write-Host "Detenido PID $($process.Id)."
  } catch {
    Write-Host "No se pudo detener PID $($process.Id): $($_.Exception.Message)"
  }
}

Remove-Item $stateFile -ErrorAction SilentlyContinue
Write-Host 'Servicios detenidos.'
