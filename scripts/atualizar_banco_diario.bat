@echo off
setlocal

cd /d "%~dp0\.."

set "PYTHON_CMD=python"

if exist "venv\Scripts\python.exe" (
    set "PYTHON_CMD=venv\Scripts\python.exe"
)

"%PYTHON_CMD%" scripts\importar_firebase.py --somente materiais requisicoes

if errorlevel 1 (
    echo.
    echo A atualizacao encontrou um erro.
    pause
    exit /b 1
)

echo.
echo Atualizacao concluida com sucesso.
pause
