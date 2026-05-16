$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootDir

$PythonCmd = "python"

if (Test-Path "venv\Scripts\python.exe") {
    $PythonCmd = "venv\Scripts\python.exe"
}

& $PythonCmd scripts\importar_firebase.py --somente materiais requisicoes

Write-Host ""
Write-Host "Atualizacao concluida com sucesso."
