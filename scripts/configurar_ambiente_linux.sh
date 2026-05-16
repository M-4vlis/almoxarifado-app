#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

python3 -m venv venv
venv/bin/python -m pip install --upgrade pip
venv/bin/python -m pip install -r requirements.txt

echo
echo "Ambiente Python configurado com sucesso."

if [ -s "$HOME/.nvm/nvm.sh" ]; then
    echo "NVM encontrado. Para usar o Firebase CLI neste terminal, rode:"
    echo "export NVM_DIR=\"\$HOME/.nvm\""
    echo "[ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\""
    echo "nvm use --lts"
fi
