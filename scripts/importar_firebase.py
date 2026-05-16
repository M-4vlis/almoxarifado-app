import argparse
import os
import re
from pathlib import Path

import pandas as pd
from openpyxl import load_workbook


# =========================
# CONFIGURACOES
# =========================

ARQUIVO_MATERIAIS = "data/LISTA de MATERIAIS.xlsx"
ARQUIVO_COLABORADORES = "data/DADOS COLABORADORES.xlsx"
ARQUIVO_GLPI_REQUISICAO = "data/GLPI - REQUISICAO.xlsx"

ABAS_MATERIAIS = [
    "CENTRAL",
    "SUB",
    "BENFICA",
]

LIMITE_BATCH = 450

firebase_admin = None
auth = None
credentials = None
firestore = None
FieldFilter = None


# =========================
# FUNCOES AUXILIARES
# =========================

def limpar_numero(valor):
    if pd.isna(valor):
        return ""

    texto = str(valor).strip()

    if texto.endswith(".0"):
        texto = texto[:-2]

    return re.sub(r"\D", "", texto)


def limpar_texto(valor):
    if pd.isna(valor):
        return ""

    return str(valor).strip()


def formatar_valor_excel_com_zeros(celula):
    valor = celula.value

    if valor is None:
        return ""

    formato = str(celula.number_format)

    if isinstance(valor, str):
        return re.sub(r"\D", "", valor.strip())

    if isinstance(valor, float) and valor.is_integer():
        valor = int(valor)

    texto = str(valor).strip()

    if texto.endswith(".0"):
        texto = texto[:-2]

    texto = re.sub(r"\D", "", texto)

    quantidade_zeros_formato = formato.count("0")

    if quantidade_zeros_formato > len(texto):
        texto = texto.zfill(quantidade_zeros_formato)

    return texto


def normalizar_id(valor):
    texto = str(valor or "").strip().upper()
    texto = re.sub(r"[^A-Z0-9_-]", "_", texto)
    texto = re.sub(r"_+", "_", texto)

    return texto.strip("_")


def montar_email_login(matricula):
    return f"{matricula}@almox.local"


def carregar_env_local():
    caminho_env = Path(".env")

    if not caminho_env.exists():
        return

    for linha in caminho_env.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()

        if not linha or linha.startswith("#") or "=" not in linha:
            continue

        chave, valor = linha.split("=", 1)
        chave = chave.strip()
        valor = valor.strip().strip('"').strip("'")

        if chave and chave not in os.environ:
            os.environ[chave] = valor


def obter_lista_env(nome):
    valor = os.getenv(nome, "")

    if not valor:
        return []

    partes = re.split(r"[\s,;]+", valor)

    return [
        parte.strip()
        for parte in partes
        if parte.strip()
    ]


def carregar_firebase_admin():
    global firebase_admin
    global auth
    global credentials
    global firestore
    global FieldFilter

    if firebase_admin:
        return

    try:
        import firebase_admin as firebase_admin_modulo
        from firebase_admin import auth as auth_modulo
        from firebase_admin import credentials as credentials_modulo
        from firebase_admin import firestore as firestore_modulo
        from google.cloud.firestore_v1.base_query import FieldFilter as FieldFilterModulo
    except ModuleNotFoundError as erro:
        raise ModuleNotFoundError(
            "Dependencia firebase-admin nao instalada. Rode: pip install -r requirements.txt"
        ) from erro

    firebase_admin = firebase_admin_modulo
    auth = auth_modulo
    credentials = credentials_modulo
    firestore = firestore_modulo
    FieldFilter = FieldFilterModulo


def inicializar_firebase(caminho_service_account):
    carregar_firebase_admin()

    if firebase_admin._apps:
        return

    if caminho_service_account:
        credencial = credentials.Certificate(caminho_service_account)
        firebase_admin.initialize_app(credencial)
        return

    firebase_admin.initialize_app()


def confirmar_arquivo(caminho):
    arquivo = Path(caminho)

    if not arquivo.exists():
        raise FileNotFoundError(f"Arquivo nao encontrado: {caminho}")

    return arquivo


def commitar_batch(batch, contador, dry_run):
    if contador == 0:
        return 0

    if dry_run:
        return 0

    batch.commit()

    return 0


def set_em_lotes(db, colecao, documentos, dry_run):
    if dry_run:
        return len(documentos)

    batch = db.batch()
    contador = 0
    total = 0

    for doc_id, dados in documentos:
        total += 1

        if not dry_run:
            referencia = db.collection(colecao).document(doc_id)
            batch.set(
                referencia,
                dados,
                merge=True,
            )

        contador += 1

        if contador >= LIMITE_BATCH:
            contador = commitar_batch(
                batch,
                contador,
                dry_run,
            )
            batch = db.batch()

    commitar_batch(
        batch,
        contador,
        dry_run,
    )

    return total


def timestamp_servidor(dry_run):
    if dry_run:
        return "DRY_RUN_SERVER_TIMESTAMP"

    return firestore.SERVER_TIMESTAMP


# =========================
# LER PLANILHAS
# =========================

def ler_materiais():
    confirmar_arquivo(ARQUIVO_MATERIAIS)

    materiais_dict = {}

    for aba in ABAS_MATERIAIS:
        df = pd.read_excel(
            ARQUIVO_MATERIAIS,
            sheet_name=aba,
        )

        df = df[
            [
                "Cód",
                "Material",
                "Estoque",
            ]
        ]

        df = df.dropna(
            subset=[
                "Cód",
                "Material",
            ]
        )

        for _, linha in df.iterrows():
            codigo = limpar_numero(linha["Cód"])
            descricao = limpar_texto(linha["Material"])

            if not codigo or not descricao:
                continue

            estoque = linha["Estoque"]

            if pd.isna(estoque):
                estoque = 0

            try:
                estoque = float(estoque)
            except ValueError:
                estoque = 0

            doc_id = f"{codigo}_{normalizar_id(aba)}"

            material_existente = materiais_dict.get(doc_id)

            dados = {
                "codigo": codigo,
                "descricao": descricao,
                "almoxarifado": aba,
                "estoque": estoque,
                "disponivel": estoque > 0,
                "ativo": True,
                "origem": "planilha_materiais",
            }

            if not material_existente:
                materiais_dict[doc_id] = dados
                continue

            if estoque > float(material_existente.get("estoque") or 0):
                material_existente["estoque"] = estoque

            if estoque > 0:
                material_existente["disponivel"] = True

            if len(descricao) > len(material_existente.get("descricao") or ""):
                material_existente["descricao"] = descricao

    return materiais_dict


def ler_colaboradores():
    caminho = confirmar_arquivo(ARQUIVO_COLABORADORES)

    workbook = load_workbook(
        caminho,
        data_only=True,
    )

    planilha = workbook.active
    cabecalhos = {}

    for coluna in range(1, planilha.max_column + 1):
        valor = planilha.cell(
            row=1,
            column=coluna,
        ).value

        if valor is not None:
            cabecalhos[str(valor).strip()] = coluna

    colunas_necessarias = [
        "NOME",
        "MATRÍCULA",
        "CPF",
    ]

    for coluna in colunas_necessarias:
        if coluna not in cabecalhos:
            raise Exception(
                f"Coluna obrigatoria nao encontrada na planilha de colaboradores: {coluna}"
            )

    colaboradores = []

    for linha in range(2, planilha.max_row + 1):
        nome = limpar_texto(
            planilha.cell(
                row=linha,
                column=cabecalhos["NOME"],
            ).value
        )

        matricula = formatar_valor_excel_com_zeros(
            planilha.cell(
                row=linha,
                column=cabecalhos["MATRÍCULA"],
            )
        )

        cpf = formatar_valor_excel_com_zeros(
            planilha.cell(
                row=linha,
                column=cabecalhos["CPF"],
            )
        )

        if not nome or not matricula or not cpf:
            continue

        colaboradores.append(
            {
                "nome": nome,
                "matricula": matricula,
                "cpf": cpf,
                "emailLogin": montar_email_login(matricula),
            }
        )

    return colaboradores


def ler_vinculos_requisicoes():
    confirmar_arquivo(ARQUIVO_GLPI_REQUISICAO)

    df = pd.read_excel(ARQUIVO_GLPI_REQUISICAO)

    colunas_necessarias = [
        "GLPI",
        "NÚMERO DA REQUISIÇÃO",
    ]

    for coluna in colunas_necessarias:
        if coluna not in df.columns:
            raise Exception(
                f"Coluna obrigatoria nao encontrada na planilha GLPI x Requisicao: {coluna}"
            )

    df = df.dropna(
        subset=[
            "GLPI",
            "NÚMERO DA REQUISIÇÃO",
        ]
    )

    mapa = {}

    for _, linha in df.iterrows():
        glpi = limpar_numero(linha["GLPI"])
        numero_requisicao = limpar_numero(linha["NÚMERO DA REQUISIÇÃO"])

        if not glpi or not numero_requisicao:
            continue

        if glpi not in mapa:
            mapa[glpi] = []

        if numero_requisicao not in mapa[glpi]:
            mapa[glpi].append(numero_requisicao)

    return mapa


# =========================
# IMPORTACOES FIREBASE
# =========================

def importar_materiais(db, dry_run, desativar_ausentes):
    materiais = ler_materiais()
    documentos = []

    for doc_id, material in materiais.items():
        documentos.append(
            (
                doc_id,
                {
                    **material,
                    "atualizadoEm": timestamp_servidor(dry_run),
                },
            )
        )

    total = set_em_lotes(
        db,
        "materiais",
        documentos,
        dry_run,
    )

    desativados = 0

    if desativar_ausentes and not dry_run:
        ids_atuais = set(materiais.keys())
        batch = db.batch()
        contador = 0

        for snapshot in db.collection("materiais").stream():
            if snapshot.id in ids_atuais:
                continue

            batch.set(
                snapshot.reference,
                {
                    "ativo": False,
                    "atualizadoEm": timestamp_servidor(dry_run),
                },
                merge=True,
            )

            contador += 1
            desativados += 1

            if contador >= LIMITE_BATCH:
                batch.commit()
                batch = db.batch()
                contador = 0

        if contador:
            batch.commit()

    print(f"Materiais lidos/importados: {total}")

    if desativar_ausentes:
        print(f"Materiais ausentes desativados: {desativados}")


def obter_usuario_auth(email):
    try:
        return auth.get_user_by_email(email)
    except auth.UserNotFoundError:
        return None


def importar_usuarios(db, dry_run, salvar_cpf, atualizar_senhas, matriculas_admin):
    colaboradores = ler_colaboradores()
    criados = 0
    atualizados = 0
    matriculas_admin = set(matriculas_admin or [])

    for colaborador in colaboradores:
        email = colaborador["emailLogin"]
        senha = colaborador["cpf"]
        usuario_auth = None

        if not dry_run:
            usuario_auth = obter_usuario_auth(email)

        if usuario_auth:
            atualizados += 1

            parametros = {
                "display_name": colaborador["nome"],
                "disabled": False,
            }

            if atualizar_senhas:
                parametros["password"] = senha

            auth.update_user(
                usuario_auth.uid,
                **parametros,
            )

            uid = usuario_auth.uid

        else:
            criados += 1

            if dry_run:
                uid = f"dry_run_{colaborador['matricula']}"
            else:
                novo_usuario = auth.create_user(
                    email=email,
                    password=senha,
                    display_name=colaborador["nome"],
                    disabled=False,
                )

                uid = novo_usuario.uid

        documento_existente = {}

        if not dry_run:
            snapshot = db.collection("usuarios").document(uid).get()

            if snapshot.exists:
                documento_existente = snapshot.to_dict() or {}

        perfil_padrao = documento_existente.get("perfil", "usuario")

        if colaborador["matricula"] in matriculas_admin:
            perfil_padrao = "admin"

        dados_usuario = {
            "uid": uid,
            "nome": colaborador["nome"],
            "matricula": colaborador["matricula"],
            "emailLogin": email,
            "perfil": perfil_padrao,
            "ativo": documento_existente.get("ativo", True),
            "origem": "planilha_colaboradores",
            "atualizadoEm": timestamp_servidor(dry_run),
        }

        if not dry_run:
            referencia_usuario = db.collection("usuarios").document(uid)

            if salvar_cpf:
                dados_usuario["cpf"] = colaborador["cpf"]

            referencia_usuario.set(
                dados_usuario,
                merge=True,
            )

            if not salvar_cpf and "cpf" in documento_existente:
                referencia_usuario.update(
                    {
                        "cpf": firestore.DELETE_FIELD,
                    }
                )

    print(f"Usuarios criados: {criados}")
    print(f"Usuarios atualizados: {atualizados}")
    print(f"Total de colaboradores lidos: {len(colaboradores)}")


def importar_vinculos_requisicoes(db, dry_run):
    mapa = ler_vinculos_requisicoes()
    documentos_individuais = []
    documentos_por_glpi = []

    for glpi, requisicoes in mapa.items():
        requisicoes_ordenadas = sorted(requisicoes)

        documentos_por_glpi.append(
            (
                glpi,
                {
                    "glpi": glpi,
                    "numeroRequisicao": requisicoes_ordenadas[0],
                    "requisicoesVinculadas": requisicoes_ordenadas,
                    "totalRequisicoes": len(requisicoes_ordenadas),
                    "ativo": True,
                    "origem": "planilha_glpi_requisicao",
                    "atualizadoEm": timestamp_servidor(dry_run),
                },
            )
        )

        for numero_requisicao in requisicoes_ordenadas:
            doc_id = f"{glpi}_{numero_requisicao}"

            documentos_individuais.append(
                (
                    doc_id,
                    {
                        "glpi": glpi,
                        "numeroRequisicao": numero_requisicao,
                        "ativo": True,
                        "origem": "planilha_glpi_requisicao",
                        "atualizadoEm": timestamp_servidor(dry_run),
                    },
                )
            )

    total_individuais = set_em_lotes(
        db,
        "vinculosRequisicoes",
        documentos_individuais,
        dry_run,
    )

    total_por_glpi = set_em_lotes(
        db,
        "requisicoesPorGlpi",
        documentos_por_glpi,
        dry_run,
    )

    print(f"Vinculos individuais importados: {total_individuais}")
    print(f"GLPIs com requisicao importadas: {total_por_glpi}")

    return mapa


def atualizar_solicitacoes_com_requisicoes(db, mapa, dry_run):
    if dry_run and db is None:
        print("Solicitacoes nao consultadas no dry-run sem Firebase.")
        return

    atualizadas = 0
    sem_solicitacao = 0

    for glpi, requisicoes in mapa.items():
        requisicoes_ordenadas = sorted(requisicoes)
        snapshots = list(
            db.collection("solicitacoes")
            .where(
                filter=FieldFilter(
                    "glpi",
                    "==",
                    glpi,
                )
            )
            .stream()
        )

        if not snapshots:
            sem_solicitacao += 1
            continue

        batch = db.batch()
        contador = 0

        for snapshot in snapshots:
            atualizadas += 1

            if not dry_run:
                batch.set(
                    snapshot.reference,
                    {
                        "numeroRequisicao": requisicoes_ordenadas[0],
                        "requisicoesVinculadas": requisicoes_ordenadas,
                        "statusAtendimento": "requisicao_vinculada",
                        "atualizadoEm": timestamp_servidor(dry_run),
                    },
                    merge=True,
                )

            contador += 1

            if contador >= LIMITE_BATCH:
                contador = commitar_batch(
                    batch,
                    contador,
                    dry_run,
                )
                batch = db.batch()

        commitar_batch(
            batch,
            contador,
            dry_run,
        )

    print(f"Solicitacoes atualizadas com requisicao: {atualizadas}")
    print(f"GLPIs sem solicitacao correspondente: {sem_solicitacao}")


# =========================
# EXECUCAO
# =========================

def montar_parser():
    carregar_env_local()

    parser = argparse.ArgumentParser(
        description="Importa planilhas do Almoxarifado Inteligente para Firebase."
    )

    parser.add_argument(
        "--service-account",
        default=(
            os.getenv("FIREBASE_SERVICE_ACCOUNT", "") or
            os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
        ),
        help="Caminho do JSON de chave do Firebase Admin. Tambem pode usar GOOGLE_APPLICATION_CREDENTIALS.",
    )

    parser.add_argument(
        "--somente",
        nargs="+",
        choices=[
            "usuarios",
            "materiais",
            "requisicoes",
        ],
        default=[
            "usuarios",
            "materiais",
            "requisicoes",
        ],
        help="Define quais importacoes executar.",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Le as planilhas e mostra contagens, sem gravar no Firebase.",
    )

    parser.add_argument(
        "--salvar-cpf",
        action="store_true",
        help="Grava CPF no Firestore. Por seguranca, o padrao e nao gravar.",
    )

    parser.add_argument(
        "--atualizar-senhas",
        action="store_true",
        help="Atualiza a senha dos usuarios existentes para o CPF da planilha.",
    )

    parser.add_argument(
        "--admin-matricula",
        nargs="+",
        default=obter_lista_env("ADMIN_MATRICULAS"),
        help="Define uma ou mais matriculas como admin durante a importacao.",
    )

    parser.add_argument(
        "--desativar-materiais-ausentes",
        action="store_true",
        help="Marca como inativos os materiais que existem no Firestore mas nao existem mais na planilha.",
    )

    parser.add_argument(
        "--nao-atualizar-solicitacoes",
        action="store_true",
        help="Importa GLPI x requisicao sem atualizar a colecao solicitacoes.",
    )

    return parser


def main():
    parser = montar_parser()
    args = parser.parse_args()

    db = None

    if not args.dry_run:
        inicializar_firebase(args.service_account)
        db = firestore.client()

    print("\n==============================")
    print("IMPORTACAO FIREBASE")
    print("==============================")

    if args.dry_run:
        print("Modo dry-run: nenhuma alteracao sera gravada.")

    if "usuarios" in args.somente:
        print("\nUsuarios")
        importar_usuarios(
            db,
            args.dry_run,
            args.salvar_cpf,
            args.atualizar_senhas,
            args.admin_matricula,
        )

    if "materiais" in args.somente:
        print("\nMateriais")
        importar_materiais(
            db,
            args.dry_run,
            args.desativar_materiais_ausentes,
        )

    if "requisicoes" in args.somente:
        print("\nGLPI x Requisicao")
        mapa = importar_vinculos_requisicoes(
            db,
            args.dry_run,
        )

        if not args.nao_atualizar_solicitacoes:
            atualizar_solicitacoes_com_requisicoes(
                db,
                mapa,
                args.dry_run,
            )

    print("\n==============================")
    print("PROCESSO FINALIZADO")
    print("==============================")


if __name__ == "__main__":
    main()
