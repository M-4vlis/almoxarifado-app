import pandas as pd
import json
from pathlib import Path

# =========================
# CONFIGURAÇÕES
# =========================

ARQUIVO_EXCEL = "data/LISTA de MATERIAIS.xlsx"

ABAS = [
    "CENTRAL",
    "SUB",
    "BENFICA"
]

# =========================
# DICIONÁRIO FINAL
# =========================

materiais_dict = {}

# =========================
# LEITURA DAS ABAS
# =========================

for aba in ABAS:

    print(f"\nLendo aba: {aba}")

    df = pd.read_excel(
        ARQUIVO_EXCEL,
        sheet_name=aba
    )

    # mantém apenas colunas úteis
    df = df[["Cód", "Material", "Estoque"]]

    # remove linhas vazias
    df = df.dropna(subset=["Cód", "Material"])

    # percorre linhas
    for _, linha in df.iterrows():

        codigo = str(int(linha["Cód"])).strip()

        descricao = str(linha["Material"]).strip()

        estoque = linha["Estoque"]

        # trata estoque vazio
        if pd.isna(estoque):
            estoque = 0

        disponivel = estoque > 0

        # chave única
        chave = f"{codigo}_{aba}"

        # =========================
        # SE NÃO EXISTE:
        # CRIA REGISTRO
        # =========================

        if chave not in materiais_dict:

            materiais_dict[chave] = {

                "codigo": codigo,

                "descricao": descricao,

                "almoxarifado": aba,

                "disponivel": disponivel

            }

        # =========================
        # SE JÁ EXISTE:
        # ATUALIZA
        # =========================

        else:

            material_existente = materiais_dict[chave]

            # mantém disponível
            # se algum possuir estoque

            if disponivel:

                material_existente["disponivel"] = True

            # mantém descrição maior
            # normalmente mais completa

            if len(descricao) > len(material_existente["descricao"]):

                material_existente["descricao"] = descricao

# =========================
# CONVERTE PARA LISTA
# =========================

materiais = list(materiais_dict.values())

# =========================
# SALVA JSON
# =========================

pasta_data = Path("data")

pasta_data.mkdir(exist_ok=True)

arquivo_json = pasta_data / "materiais.json"

with open(
    arquivo_json,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        materiais,
        f,
        ensure_ascii=False,
        indent=4
    )

print("\nJSON gerado com sucesso!")

print(f"Total de materiais únicos: {len(materiais)}")

print(f"Arquivo salvo em: {arquivo_json}")