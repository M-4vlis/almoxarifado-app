let materiais = []

let fuse

// =========================
// ELEMENTOS DA TELA
// =========================

const campoBusca =
    document.getElementById("busca")

const selectAlmoxarifado =
    document.getElementById("almoxarifado")

const divResultados =
    document.getElementById("resultados")

// =========================
// NORMALIZA TEXTO
// =========================

function normalizarTexto(texto) {

    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")

}

// =========================
// CARREGA JSON
// =========================

async function carregarMateriais() {

    try {

        const resposta =
            await fetch("data/materiais.json")

        materiais =
            await resposta.json()

        // adiciona descrição normalizada
        materiais = materiais.map(material => {

            return {

                ...material,

                descricaoNormalizada:
                    normalizarTexto(
                        material.descricao
                    )

            }

        })

        console.log(
            "Materiais carregados:",
            materiais.length
        )

        // =========================
        // CONFIGURA FUSE
        // =========================

        fuse = new Fuse(materiais, {

            includeScore: true,

            threshold: 0.35,

            distance: 120,

            minMatchCharLength: 2,

            ignoreLocation: true,

            shouldSort: true,

            findAllMatches: true,

            keys: [

                {
                    name: "descricaoNormalizada",
                    weight: 0.9
                },

                {
                    name: "codigo",
                    weight: 0.1
                }

            ]

        })

    } catch (erro) {

        console.error(
            "Erro ao carregar materiais:",
            erro
        )

    }

}

// =========================
// BUSCA
// =========================

function buscarMateriais() {

    const textoBusca =
        normalizarTexto(
            campoBusca.value.trim()
        )

    const almoxarifadoSelecionado =
        selectAlmoxarifado.value

    // limpa resultados
    divResultados.innerHTML = ""

    // evita busca vazia
    if (textoBusca.length < 2) {

        return

    }

    // =========================
    // BUSCA DIRETA
    // =========================

    let resultadosDiretos =
        materiais.filter(material => {

            return (

                material.descricaoNormalizada
                    .includes(textoBusca)

                ||

                material.codigo
                    .includes(textoBusca)

            )

        })

    // =========================
    // BUSCA FUZZY
    // =========================

    let resultadosFuzzy =
        fuse.search(textoBusca)

    resultadosFuzzy =
        resultadosFuzzy.filter(resultado => {

            return resultado.score <= 0.35

        })

    resultadosFuzzy =
        resultadosFuzzy.map(resultado => resultado.item)

    // =========================
    // JUNTA RESULTADOS
    // =========================

    let resultados = [

        ...resultadosDiretos,

        ...resultadosFuzzy

    ]

    // =========================
    // REMOVE DUPLICADOS
    // =========================

    const chaves = new Set()

    resultados =
        resultados.filter(material => {

            const chave =
                material.codigo +
                material.almoxarifado

            if (chaves.has(chave)) {

                return false

            }

            chaves.add(chave)

            return true

        })

    // =========================
    // EXISTE DISPONÍVEL
    // NO ALMOXARIFADO ESCOLHIDO?
    // =========================

    const existeDisponivelNoSelecionado =
        resultados.some(material => {

            return (

                material.almoxarifado ===
                    almoxarifadoSelecionado &&

                material.disponivel

            )

        })

    // =========================
    // EXISTE DISPONÍVEL
    // EM OUTRO ALMOXARIFADO?
    // =========================

    const existeDisponivelEmOutro =
        resultados.some(material => {

            return (

                material.almoxarifado !==
                    almoxarifadoSelecionado &&

                material.disponivel

            )

        })

    // =========================
    // REGRA 1:
    // DISPONÍVEL NO ESCOLHIDO
    // =========================

    if (existeDisponivelNoSelecionado) {

        resultados =
            resultados.filter(material => {

                return (
                    material.almoxarifado ===
                        almoxarifadoSelecionado &&

                    material.disponivel
                )

            })

    }

    // =========================
    // REGRA 2:
    // DISPONÍVEL EM OUTRO
    // =========================

    else if (existeDisponivelEmOutro) {

        resultados =
            resultados.filter(material => {

                return material.disponivel

            })

    }

    // =========================
    // REGRA 3:
    // INDISPONÍVEL EM TODOS
    // =========================

    else {

        // pega apenas o primeiro
        // do almoxarifado selecionado

        const materialSelecionado =
            resultados.find(material => {

                return (
                    material.almoxarifado ===
                    almoxarifadoSelecionado
                )

            })

        resultados =
            materialSelecionado
                ? [materialSelecionado]
                : []

    }

    // =========================
    // ORDENA
    // =========================

    resultados.sort((a, b) => {

        return (
            a.descricao.length -
            b.descricao.length
        )

    })

    // =========================
    // LIMITA
    // =========================

    resultados =
        resultados.slice(0, 20)

    // =========================
    // SEM RESULTADOS
    // =========================

    if (resultados.length === 0) {

        divResultados.innerHTML = `

            <div class="resultado-item">

                Nenhum material encontrado.

            </div>

        `

        return

    }

    // =========================
    // RENDERIZA
    // =========================

    resultados.forEach(material => {

        const div =
            document.createElement("div")

        div.classList.add("resultado-item")

        div.classList.add(

            material.disponivel
                ? "disponivel"
                : "indisponivel"

        )

        let statusTexto = ""

        // disponível no almoxarifado escolhido
        if (

            material.almoxarifado ===
                almoxarifadoSelecionado &&

            material.disponivel

        ) {

            statusTexto =
                `✅ Disponível no ${material.almoxarifado}`

        }

        // disponível em outro almoxarifado
        else if (material.disponivel) {

            statusTexto =
                `⚠️ Disponível no ${material.almoxarifado}`

        }

        // indisponível
        else {

            statusTexto =
                `❌ Indisponível`

        }

        div.innerHTML = `

            <div class="codigo">
                Código: ${material.codigo}
            </div>

            <div class="descricao">
                ${material.descricao}
            </div>

            <div class="status">
                ${statusTexto}
            </div>

        `

        divResultados.appendChild(div)

    })

}

// =========================
// EVENTOS
// =========================

campoBusca.addEventListener(
    "input",
    buscarMateriais
)

selectAlmoxarifado.addEventListener(
    "change",
    buscarMateriais
)

// =========================
// INICIALIZAÇÃO
// =========================

carregarMateriais()