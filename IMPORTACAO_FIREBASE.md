# Importacao Para Firebase

Este projeto agora tem um script local para levar os dados das planilhas para o Firebase sem expor chave administrativa no site.

## O Que Vai Para O Firebase

- `usuarios`: colaboradores cadastrados para login.
- `materiais`: lista de materiais por almoxarifado.
- `vinculosRequisicoes`: cada vinculo GLPI x numero de requisicao.
- `requisicoesPorGlpi`: documento consolidado por GLPI.
- `solicitacoes`: atualizada automaticamente quando uma GLPI ja tiver requisicao.

## Antes De Rodar

1. No Firebase Console, gere uma chave de conta de servico.
2. Salve o JSON fora da pasta publica do projeto.
3. Crie um arquivo `.env` na raiz do projeto usando `.env.example` como modelo.
4. Instale as dependencias Python.

Linux:

```bash
bash scripts/configurar_ambiente_linux.sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/configurar_ambiente_windows.ps1
```

5. Confira as regras sugeridas em `firestore.rules`.

Elas nao entram em producao so por existir no projeto. Para valer no Firebase, precisam ser copiadas para o Console do Firebase ou publicadas via Firebase CLI.

Se usar Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

Ou rode:

Linux:

```bash
bash scripts/publicar_regras_firebase.sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/publicar_regras_firebase.ps1
```

## Instalar Node, NPM E Firebase CLI

O Firebase CLI e usado para publicar regras pelo terminal. A importacao diaria das planilhas nao depende dele.

### Windows 11

1. Instale o Node.js LTS pelo site oficial: `https://nodejs.org/`.
2. Feche e abra novamente o PowerShell.
3. Confira:

```powershell
node --version
npm --version
```

4. Instale o Firebase CLI:

```powershell
npm install -g firebase-tools
```

5. Faça login:

```powershell
firebase login
```

6. Confira se aparece o projeto:

```powershell
firebase projects:list
```

7. Para publicar regras:

```powershell
firebase deploy --only firestore:rules
```

### Linux

No Ubuntu, evite instalar apenas `npm` pelo `apt`, porque ele pode trazer uma versao antiga do Node.

Instale o Node LTS via `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Feche e abra o terminal, ou rode:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

Depois instale o Node LTS:

```bash
nvm install --lts
nvm use --lts
node --version
npm --version
npm install -g firebase-tools
firebase login
firebase projects:list
firebase deploy --only firestore:rules
```

O Firebase CLI atual precisa de Node 20 ou superior.

## Chave No Linux E No Windows

Cada computador deve ter sua propria copia segura da chave JSON fora da pasta do projeto.

Exemplo Linux no arquivo `.env`:

```text
FIREBASE_SERVICE_ACCOUNT=/home/mario/chaves-firebase/chave-firebase-admin.json
ADMIN_MATRICULAS=0005376
```

Exemplo Windows no arquivo `.env`:

```text
FIREBASE_SERVICE_ACCOUNT=C:/Users/Mario/chaves-firebase/chave-firebase-admin.json
ADMIN_MATRICULAS=0005376
```

O arquivo `.env` fica ignorado pelo Git e nao deve ir para o GitHub.

## Comando Recomendado

Primeiro teste sem gravar:

```bash
venv/bin/python scripts/importar_firebase.py --dry-run
```

Depois rode a importacao real:

```bash
venv/bin/python scripts/importar_firebase.py
```

## Usuarios

O login do app continua sendo:

- usuario: matricula
- senha inicial: CPF

Internamente o Firebase Auth usa e-mail tecnico:

```text
0005376@almox.local
```

Por seguranca, o CPF nao e salvo no Firestore por padrao. Ele e usado apenas para criar a senha no Firebase Authentication.

Para atualizar senhas de usuarios que ja existem:

```bash
venv/bin/python scripts/importar_firebase.py --somente usuarios --atualizar-senhas
```

Para definir uma matricula como admin durante a importacao:

```bash
venv/bin/python scripts/importar_firebase.py --somente usuarios --admin-matricula 0005376
```

## Materiais

O app tenta carregar materiais do Firestore. Se a colecao `materiais` estiver vazia ou falhar, ele continua usando `data/materiais.json`.

Para importar somente materiais:

```bash
venv/bin/python scripts/importar_firebase.py --somente materiais
```

Para marcar como inativos os materiais que sairam da planilha:

```bash
venv/bin/python scripts/importar_firebase.py --somente materiais --desativar-materiais-ausentes
```

## GLPI x Requisicao

Para importar somente vinculos GLPI x requisicao:

```bash
venv/bin/python scripts/importar_firebase.py --somente requisicoes
```

Esse comando tambem atualiza as solicitacoes existentes quando encontra a mesma GLPI.

Se quiser apenas importar os vinculos sem mexer nas solicitacoes:

```bash
venv/bin/python scripts/importar_firebase.py --somente requisicoes --nao-atualizar-solicitacoes
```

## Rotina Diaria Recomendada

Quando atualizar as planilhas `LISTA de MATERIAIS.xlsx` e `GLPI - REQUISICAO.xlsx`, rode:

Linux:

```bash
bash scripts/atualizar_banco_diario.sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/atualizar_banco_diario.ps1
```

Windows CMD ou duplo clique:

```bat
scripts\atualizar_banco_diario.bat
```

Esse comando atualiza somente:

- `materiais`
- `vinculosRequisicoes`
- `requisicoesPorGlpi`
- solicitações que tiverem GLPI correspondente

Nao precisa rodar `scripts/atualizar.py` nem fazer `git push` dos dados.

## Quando Atualizar Usuarios

Use este comando apenas quando a planilha `DADOS COLABORADORES.xlsx` mudar:

```bash
venv/bin/python scripts/importar_firebase.py --somente usuarios
```

Se precisar redefinir as senhas dos usuarios existentes para o CPF da planilha:

```bash
venv/bin/python scripts/importar_firebase.py --somente usuarios --atualizar-senhas
```
