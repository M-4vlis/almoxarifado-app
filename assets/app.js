let materiais = []
let fuse

// =========================
// LISTA DE SOLICITAÇÃO
// =========================

let listaSolicitacao = []

let materialSelecionado = null

// =========================
// ELEMENTOS
// =========================

const campoBusca =
    document.getElementById("busca")

const selectAlmoxarifado =
    document.getElementById("almoxarifado")

const divResultados =
    document.getElementById("resultados")

const divLoading =
    document.getElementById("loading")

// =========================
// MODAL
// =========================

const modal =
    document.getElementById("modal")

const fecharModal =
    document.getElementById("fecharModal")

const modalImagem =
    document.getElementById("modalImagem")

const modalCodigo =
    document.getElementById("modalCodigo")

const modalDescricao =
    document.getElementById("modalDescricao")

const modalStatus =
    document.getElementById("modalStatus")

const btnAdicionarLista =
    document.getElementById("btnAdicionarLista")

// =========================
// CARRINHO
// =========================

const btnCarrinho =
    document.getElementById("btnCarrinho")

const contadorCarrinho =
    document.getElementById("contadorCarrinho")

const drawerCarrinho =
    document.getElementById("drawerCarrinho")

const fecharDrawer =
    document.getElementById("fecharDrawer")

const listaCarrinho =
    document.getElementById("listaCarrinho")

// =========================
// FORMULÁRIO
// =========================

const campoGLPI =
    document.getElementById("glpi")

const campoNome =
    document.getElementById("nomeRetirada")

const campoMatricula =
    document.getElementById("matricula")

const campoLocal =
    document.getElementById("localUso")

const btnEnviarWhatsapp =
    document.getElementById("btnEnviarWhatsapp")

// =========================
// CARREGA JSON
// =========================

async function carregarMateriais() {

    try {

        divLoading.classList.remove("hidden")

        const resposta =
            await fetch("data/materiais.json")

        materiais =
            await resposta.json()

        console.log(
            "Materiais carregados:",
            materiais.length
        )

        fuse = new Fuse(materiais, {

            includeScore: true,

            threshold: 0.3,

            ignoreLocation: true,

            minMatchCharLength: 2,

            keys: [

                {
                    name: "descricao",
                    weight: 0.8
                },

                {
                    name: "codigo",
                    weight: 0.2
                }

            ]

        })

        divLoading.classList.add("hidden")

    }

    catch (erro) {

        console.error(
            "Erro ao carregar materiais:",
            erro
        )

    }

}

// =========================
// IMAGEM
// =========================

function carregarImagemMaterial(codigo) {

    const jpg =
        `assets/imagens/${codigo}.jpg`

    const png =
        `assets/imagens/${codigo}.png`

    modalImagem.src = jpg

    modalImagem.onerror = () => {

        modalImagem.onerror = () => {

            modalImagem.src =
                "assets/imagens/placeholder.png"

        }

        modalImagem.src = png

    }

}

// =========================
// MODAL
// =========================

function abrirModal(material) {

    materialSelecionado = material

    modalCodigo.innerHTML =
        `Código: ${material.codigo}`

    modalDescricao.innerHTML =
        material.descricao

    if (material.disponivel) {

        modalStatus.innerHTML =
            `✅ Disponível no ${material.almoxarifado}`

        btnAdicionarLista.disabled = false

        btnAdicionarLista.innerHTML = `
            <i class="fa-solid fa-cart-plus"></i>
            Adicionar à Lista
        `

    }

    else {

        modalStatus.innerHTML =
            `❌ Indisponível`

        btnAdicionarLista.disabled = true

        btnAdicionarLista.innerHTML = `
            <i class="fa-solid fa-ban"></i>
            Material indisponível
        `

    }

    carregarImagemMaterial(
        material.codigo
    )

    modal.classList.remove("hidden")

}

// =========================
// FECHAR MODAL
// =========================

fecharModal.addEventListener(
    "click",
    () => {

        modal.classList.add("hidden")

    }
)

modal.addEventListener(
    "click",
    (evento) => {

        if (evento.target === modal) {

            modal.classList.add("hidden")

        }

    }
)

// =========================
// ADICIONAR ITEM
// =========================

btnAdicionarLista.addEventListener(
    "click",
    () => {

        if (!materialSelecionado) {

            return

        }

        const itemExistente =
            listaSolicitacao.find(item => {

                return (
                    item.codigo ===
                    materialSelecionado.codigo
                )

            })

        if (itemExistente) {

            itemExistente.quantidade += 1

        }

        else {

            listaSolicitacao.push({

                codigo:
                    materialSelecionado.codigo,

                descricao:
                    materialSelecionado.descricao,

                almoxarifado:
                    materialSelecionado.almoxarifado,

                quantidade: 1

            })

        }

        atualizarCarrinho()

        modal.classList.add("hidden")

    }
)

// =========================
// ATUALIZA CARRINHO
// =========================

function atualizarCarrinho() {

    const totalItens =
        listaSolicitacao.reduce(
            (total, item) => {

                return total + item.quantidade

            },
            0
        )

    contadorCarrinho.innerText =
        totalItens

    if (listaSolicitacao.length > 0) {

        btnCarrinho.classList.remove("hidden")

    }

    else {

        btnCarrinho.classList.add("hidden")

    }

    renderizarCarrinho()

}

// =========================
// RENDERIZA CARRINHO
// =========================

function renderizarCarrinho() {

    listaCarrinho.innerHTML = ""

    if (listaSolicitacao.length === 0) {

        listaCarrinho.innerHTML = `

            <div class="empty-state">

                <i class="fa-solid fa-cart-shopping"></i>

                <p>
                    Nenhum item adicionado.
                </p>

            </div>

        `

        return

    }

    listaSolicitacao.forEach(item => {

        const div =
            document.createElement("div")

        div.classList.add(
            "item-carrinho"
        )

        div.innerHTML = `

            <div class="item-carrinho-codigo">

                Código:
                ${item.codigo}

            </div>

            <div class="item-carrinho-descricao">

                ${item.descricao}

            </div>

            <div class="item-carrinho-footer">

                <div class="controle-quantidade">

                    <button
                        class="btn-qtd"
                        onclick="diminuirQuantidade('${item.codigo}')"
                    >

                        -
                    </button>

                    <span>
                        ${item.quantidade}
                    </span>

                    <button
                        class="btn-qtd"
                        onclick="aumentarQuantidade('${item.codigo}')"
                    >

                        +
                    </button>

                </div>

                <button
                    class="btn-remover"
                    onclick="removerItem('${item.codigo}')"
                >

                    <i class="fa-solid fa-trash"></i>

                </button>

            </div>

        `

        listaCarrinho.appendChild(div)

    })

}

// =========================
// AUMENTAR QUANTIDADE
// =========================

function aumentarQuantidade(codigo) {

    const item =
        listaSolicitacao.find(item => {

            return item.codigo === codigo

        })

    if (item) {

        item.quantidade += 1

    }

    atualizarCarrinho()

}

// =========================
// DIMINUIR QUANTIDADE
// =========================

function diminuirQuantidade(codigo) {

    const item =
        listaSolicitacao.find(item => {

            return item.codigo === codigo

        })

    if (!item) return

    item.quantidade -= 1

    if (item.quantidade <= 0) {

        removerItem(codigo)

        return

    }

    atualizarCarrinho()

}

// =========================
// REMOVER ITEM
// =========================

function removerItem(codigo) {

    listaSolicitacao =
        listaSolicitacao.filter(item => {

            return item.codigo !== codigo

        })

    atualizarCarrinho()

}

// =========================
// DRAWER
// =========================

btnCarrinho.addEventListener(
    "click",
    () => {

        drawerCarrinho.classList.remove(
            "hidden"
        )

    }
)

fecharDrawer.addEventListener(
    "click",
    () => {

        drawerCarrinho.classList.add(
            "hidden"
        )

    }
)

drawerCarrinho.addEventListener(
    "click",
    (evento) => {

        if (
            evento.target === drawerCarrinho
        ) {

            drawerCarrinho.classList.add(
                "hidden"
            )

        }

    }
)

// =========================
// GERAR TEXTO WHATSAPP
// =========================

function gerarMensagemWhatsapp() {

    const glpi =
        campoGLPI.value.trim()

    const nome =
        campoNome.value.trim()

    const matricula =
        campoMatricula.value.trim()

    const local =
        campoLocal.value.trim()

    if (!glpi) {

        alert(
            "Informe o número GLPI."
        )

        return null

    }

    if (!nome) {

        alert(
            "Informe o nome de quem irá retirar."
        )

        return null

    }

    if (!matricula) {

        alert(
            "Informe a matrícula."
        )

        return null

    }

    if (!local) {

        alert(
            "Informe o local de utilização."
        )

        return null

    }

    if (listaSolicitacao.length === 0) {

        alert(
            "Adicione materiais à lista."
        )

        return null

    }

    let mensagem = `📦 *SOLICITAÇÃO DE MATERIAL*\n\n`

    mensagem += `🎫 *GLPI:* ${glpi}\n\n`

    mensagem += `👤 *RETIRADA:*\n`

    mensagem += `${nome}\n`

    mensagem += `Matrícula: ${matricula}\n\n`

    mensagem += `📍 *LOCAL:*\n`

    mensagem += `${local}\n\n`

    mensagem += `🧾 *MATERIAIS:*\n\n`

    listaSolicitacao.forEach(item => {

        mensagem += `• ${item.quantidade}x ${item.descricao}\n`

        mensagem += `Código: ${item.codigo}\n`

        mensagem += `Almoxarifado: ${item.almoxarifado}\n\n`

    })

    return mensagem

}

// =========================
// ENVIAR WHATSAPP
// =========================

btnEnviarWhatsapp.addEventListener(
    "click",
    () => {

        const mensagem =
            gerarMensagemWhatsapp()

        if (!mensagem) {

            return

        }

        const texto =
            encodeURIComponent(mensagem)

        const url =
            `https://wa.me/?text=${texto}`

        window.open(
            url,
            "_blank"
        )

    }
)

// =========================
// BUSCA
// =========================

function buscarMateriais() {

    const textoBusca =
        campoBusca.value
            .toLowerCase()
            .trim()

    const almoxarifadoSelecionado =
        selectAlmoxarifado.value

    divResultados.innerHTML = ""

    if (textoBusca.length < 2) {

        return

    }

    const buscaPorCodigo =
        /^\d+$/.test(textoBusca)

    let resultados = []

    // =========================
    // BUSCA POR CÓDIGO
    // =========================

    if (buscaPorCodigo) {

        const codigoEncontrado =
            materiais.filter(material => {

                return material.codigo
                    .toLowerCase()
                    .endsWith(textoBusca)

            })

        // encontrou códigos compatíveis
        // mostra apenas eles

        if (codigoEncontrado.length > 0) {

            resultados = codigoEncontrado

        }

        // ainda não encontrou
        // mantém sugestões inteligentes

        else {

            resultados =
                fuse.search(textoBusca)

            resultados =
                resultados.map(
                    resultado => resultado.item
                )

        }

    }

    // =========================
    // BUSCA POR DESCRIÇÃO
    // =========================

    else {

        resultados =
            fuse.search(textoBusca)

        resultados =
            resultados.map(
                resultado => resultado.item
            )

    }

    // =========================
    // VERIFICA DISPONIBILIDADE
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
    // FILTRA ALMOXARIFADO
    // =========================

    if (existeDisponivelNoSelecionado) {

        resultados =
            resultados.filter(material => {

                return (
                    material.almoxarifado ===
                    almoxarifadoSelecionado
                )

            })

    }

    // =========================
    // ORDENA
    // =========================

    resultados.sort((a, b) => {

        const prioridadeA =
            a.disponivel

        const prioridadeB =
            b.disponivel

        if (prioridadeA && !prioridadeB)
            return -1

        if (!prioridadeA && prioridadeB)
            return 1

        return 0

    })

    // =========================
    // REMOVE DUPLICADOS
    // =========================

    const materiaisUnicos = []

    const codigosJaAdicionados =
        new Set()

    resultados.forEach(material => {

        if (
            !material.disponivel &&
            codigosJaAdicionados.has(
                material.codigo
            )
        ) {

            return

        }

        codigosJaAdicionados.add(
            material.codigo
        )

        materiaisUnicos.push(material)

    })

    // =========================
    // SEM RESULTADOS
    // =========================

    if (materiaisUnicos.length === 0) {

        divResultados.innerHTML = `

            <div class="empty-state">

                <i class="fa-regular fa-face-frown"></i>

                <p>
                    Nenhum material encontrado.
                </p>

            </div>

        `

        return

    }

    // =========================
    // RENDERIZA
    // =========================

    materiaisUnicos.forEach(material => {

        const div =
            document.createElement("div")

        div.classList.add(
            "resultado-item"
        )

        div.classList.add(

            material.disponivel
                ? "disponivel"
                : "indisponivel"

        )

        let statusTexto = ""

        if (

            material.almoxarifado ===
                almoxarifadoSelecionado &&

            material.disponivel

        ) {

            statusTexto =
                `✅ Disponível no ${material.almoxarifado}`

        }

        else if (material.disponivel) {

            statusTexto =
                `⚠️ Disponível no ${material.almoxarifado}`

        }

        else {

            statusTexto =
                `❌ Indisponível`

        }

        div.innerHTML = `

            <div class="codigo">

                Código:
                ${material.codigo}

            </div>

            <div class="descricao">

                ${material.descricao}

            </div>

            <div class="status">

                ${statusTexto}

            </div>

        `

        div.addEventListener(
            "click",
            () => abrirModal(material)
        )

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
// INIT
// =========================

carregarMateriais()