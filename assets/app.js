import {
    loginFirebase,
    logoutFirebase,
    listarMateriaisFirebase,
    observarVersaoMateriaisFirebase,
    salvarSolicitacaoFirebase,
    listarSolicitacoesPorPerfilFirebase,
    buscarResumoAdminFirebase
} from "./firebase.js?v=2026-08-02-2"

import {
    criarUrlWhatsapp
} from "./whatsapp.js?v=2026-08-31-1"

let materiais = []
let fuse

// =========================
// ESTADO GLOBAL
// =========================

let listaSolicitacao = []
let materialSelecionado = null
let solicitacoesCarregadas = []
let appJaIniciado = false
let telaAtual = "inicio"
let eventosTelasConfigurados = false
let ultimoDocumentoSolicitacoes = null
let existeMaisSolicitacoes = false
let carregandoSolicitacoes = false
let resumoAdminDashboard = null
let chaveCacheSolicitacoes = ""
let solicitacoesCarregadasEm = 0
let carregandoMateriais = false
let materiaisCarregados = false
let origemMateriais = ""
let erroCarregamentoMateriais = ""
let promessaCarregamentoMateriais = null
let cancelarObservacaoMateriais = null
let versaoMateriaisAtual = ""

const LIMITE_SOLICITACOES =
    20

const TEMPO_CACHE_SOLICITACOES =
    2 * 60 * 1000

const CHAVE_CACHE_MATERIAIS =
    "materiaisCacheLocal"

const TEMPO_CACHE_MATERIAIS =
    12 * 60 * 60 * 1000

const VERSAO_CACHE_MATERIAIS =
    "2026-08-02-2"

const ARQUIVO_MATERIAIS_LOCAL =
    `data/materiais.json?v=${VERSAO_CACHE_MATERIAIS}`

// =========================
// LOGIN
// =========================

const telaLogin =
    document.getElementById("telaLogin")

const appContainer =
    document.getElementById("appContainer")

const formLogin =
    document.getElementById("formLogin")

const campoLoginMatricula =
    document.getElementById("loginMatricula")

const campoLoginCpf =
    document.getElementById("loginCpf")

const loginErro =
    document.getElementById("loginErro")

const btnSair =
    document.getElementById("btnSair")

// =========================
// BUSCA
// =========================

const campoBusca =
    document.getElementById("busca")

const selectAlmoxarifado =
    document.getElementById("almoxarifado")

const divResultados =
    document.getElementById("resultados")

const divLoading =
    document.getElementById("loading")

const divStatusMateriais =
    document.getElementById("statusMateriais")

// =========================
// MODAL MATERIAL
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

const modalEstoqueAdmin =
    document.getElementById("modalEstoqueAdmin")

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
// FORMULÃRIO SOLICITAÃ‡ÃƒO
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
// UTILITÃRIOS
// =========================

function escaparHtml(texto) {

    return String(texto || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")

}

function obterDataLocalFormatada() {

    const agora =
        new Date()

    return agora.toLocaleString(
        "pt-BR",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    )

}

function obterSessaoUsuario() {

    const dados =
        localStorage.getItem("usuarioLogado")

    if (!dados) {

        return null

    }

    try {

        return JSON.parse(dados)

    }

    catch (erro) {

        localStorage.removeItem("usuarioLogado")

        return null

    }

}

function usuarioEhAdmin() {

    const usuario =
        obterSessaoUsuario()

    return usuario?.perfil === "admin"

}

function mostrarToast(texto) {

    const toast =
        document.createElement("div")

    toast.classList.add("toast")

    toast.innerHTML = `
        <i class="fa-solid fa-circle-check"></i>
        <span>${escaparHtml(texto)}</span>
    `

    document.body.appendChild(toast)

    setTimeout(() => {

        toast.classList.add("toast-show")

    }, 50)

    setTimeout(() => {

        toast.classList.remove("toast-show")

        setTimeout(() => {

            toast.remove()

        }, 300)

    }, 2200)

}

function mostrarErroLogin(texto) {

    if (!loginErro) {

        return

    }

    loginErro.classList.remove("hidden")

    const span =
        loginErro.querySelector("span")

    if (span) {

        span.innerText =
            texto

    }

}

function esconderErroLogin() {

    if (!loginErro) {

        return

    }

    loginErro.classList.add("hidden")

}

// =========================
// PERSISTÃŠNCIA LOCAL
// =========================

function salvarCarrinhoLocal() {

    localStorage.setItem(
        "listaSolicitacao",
        JSON.stringify(listaSolicitacao)
    )

}

function carregarCarrinhoLocal() {

    const dados =
        localStorage.getItem("listaSolicitacao")

    if (!dados) {

        return

    }

    try {

        listaSolicitacao =
            JSON.parse(dados)

        recalcularListaSolicitacao()

    }

    catch (erro) {

        listaSolicitacao = []

        localStorage.removeItem(
            "listaSolicitacao"
        )

    }

    atualizarCarrinho()

}

function limparCarrinhoLocal() {

    localStorage.removeItem(
        "listaSolicitacao"
    )

}

// =========================
// NAVEGAÃ‡ÃƒO INFERIOR
// =========================

function criarNavegacaoInferior() {

    const nav =
        document.getElementById("bottomNav")

    if (!nav) {

        return

    }

    if (nav.dataset.configurada === "true") {

        return

    }

    nav.dataset.configurada =
        "true"

    nav
        .querySelectorAll(".bottom-nav-item")
        .forEach(botao => {

            botao.type =
                "button"

            botao.addEventListener(
                "click",
                async () => {

                    const pagina =
                        botao.dataset.page

                    if (!pagina) {

                        return

                    }

                    await mostrarTela(pagina)

                }
            )

        })

}

function mostrarNavegacaoInferior() {

    const nav =
        document.getElementById("bottomNav")

    if (nav) {

        nav.classList.remove("hidden")

    }

}

function esconderNavegacaoInferior() {

    const nav =
        document.getElementById("bottomNav")

    if (nav) {

        nav.classList.add("hidden")

    }

}

function marcarNavegacaoAtiva(nomeTela) {

    const botoes =
        document.querySelectorAll(".bottom-nav-item")

    botoes.forEach(botao => {

        botao.classList.toggle(
            "active",
            botao.dataset.page === nomeTela
        )

    })

}

// =========================
// ESTRUTURA DAS TELAS
// =========================

function prepararEstruturaTelas() {

    configurarEventosTelas()

    return

    if (!appContainer) {

        return

    }

    if (
        document.getElementById("viewBusca")
    ) {

        return

    }

    const filhosOriginais =
        Array.from(appContainer.children)

    const viewBusca =
        document.createElement("section")

    viewBusca.id =
        "viewBusca"

    viewBusca.classList.add(
        "app-view",
        "view-busca"
    )

    filhosOriginais.forEach(filho => {

        viewBusca.appendChild(filho)

    })

    const viewInicio =
        document.createElement("section")

    viewInicio.id =
        "viewInicio"

    viewInicio.classList.add(
        "app-view",
        "view-inicio",
        "hidden"
    )

    viewInicio.innerHTML = `
        <div class="home-header">
            <div>
                <span class="home-label">VisÃ£o geral</span>

                <h1>
                    InÃ­cio
                </h1>

                <p id="homeSaudacao">
                    Acompanhe suas solicitaÃ§Ãµes e atividades recentes.
                </p>
            </div>
        </div>

        <div class="home-grid">
            <div class="home-card destaque">
                <div class="home-card-icon">
                    <i class="fa-solid fa-clipboard-list"></i>
                </div>

                <div>
                    <span>SolicitaÃ§Ãµes</span>
                    <strong id="homeTotalSolicitacoes">0</strong>
                </div>
            </div>

            <div class="home-card">
                <div class="home-card-icon">
                    <i class="fa-solid fa-hourglass-half"></i>
                </div>

                <div>
                    <span>Aguardando</span>
                    <strong id="homeAguardando">0</strong>
                </div>
            </div>

            <div class="home-card">
                <div class="home-card-icon">
                    <i class="fa-solid fa-link"></i>
                </div>

                <div>
                    <span>Vinculadas</span>
                    <strong id="homeVinculadas">0</strong>
                </div>
            </div>

            <div class="home-card">
                <div class="home-card-icon">
                    <i class="fa-solid fa-boxes-stacked"></i>
                </div>

                <div>
                    <span>Materiais</span>
                    <strong id="homeTotalItens">0</strong>
                </div>
            </div>
        </div>

        <div class="home-section">
            <div class="home-section-header">
                <div>
                    <span>Atalhos</span>

                    <h2>
                        O que deseja fazer?
                    </h2>
                </div>
            </div>

            <div class="home-actions">
                <button
                    id="atalhoNovaBusca"
                    type="button"
                    class="home-action-card"
                >
                    <i class="fa-solid fa-magnifying-glass"></i>

                    <strong>
                        Buscar material
                    </strong>

                    <span>
                        Consulte disponibilidade por cÃ³digo ou descriÃ§Ã£o.
                    </span>
                </button>

                <button
                    id="atalhoSolicitacoes"
                    type="button"
                    class="home-action-card"
                >
                    <i class="fa-solid fa-clock-rotate-left"></i>

                    <strong>
                        Ver solicitaÃ§Ãµes
                    </strong>

                    <span>
                        Acompanhe o histÃ³rico dos pedidos enviados.
                    </span>
                </button>
            </div>
        </div>

        <div class="home-section">
            <div class="home-section-header">
                <div>
                    <span>Ãšltima atividade</span>

                    <h2>
                        SolicitaÃ§Ãµes recentes
                    </h2>
                </div>
            </div>

            <div
                id="homeSolicitacoesRecentes"
                class="home-recentes"
            >
                <div class="empty-state">
                    <i class="fa-solid fa-spinner fa-spin"></i>

                    <p>
                        Carregando informaÃ§Ãµes...
                    </p>
                </div>
            </div>
        </div>
    `

    const viewSolicitacoes =
        document.createElement("section")

    viewSolicitacoes.id =
        "viewSolicitacoes"

    viewSolicitacoes.classList.add(
        "app-view",
        "view-solicitacoes",
        "hidden"
    )

    viewSolicitacoes.innerHTML = `
        <div class="solicitacoes-header">
            <div>
                <span class="home-label">HistÃ³rico</span>

                <h1>
                    SolicitaÃ§Ãµes
                </h1>

                <p>
                    Consulte os pedidos enviados e acompanhe o vÃ­nculo com as requisiÃ§Ãµes.
                </p>
            </div>
        </div>

        <div class="filtros-solicitacoes">
            <div class="form-group">
                <label for="filtroSolicitacaoTexto">
                    Buscar
                </label>

                <input
                    type="text"
                    id="filtroSolicitacaoTexto"
                    placeholder="GLPI, material, local ou requisiÃ§Ã£o..."
                    autocomplete="off"
                >
            </div>

            <div class="form-group">
                <label for="filtroSolicitacaoStatus">
                    Status
                </label>

                <select id="filtroSolicitacaoStatus">
                    <option value="todos">
                        Todos
                    </option>

                    <option value="aguardando_requisicao">
                        Aguardando requisiÃ§Ã£o
                    </option>

                    <option value="requisicao_vinculada">
                        RequisiÃ§Ã£o vinculada
                    </option>
                </select>
            </div>
        </div>

        <div
            id="listaSolicitacoesUsuario"
            class="lista-solicitacoes"
        >
            <div class="empty-state">
                <i class="fa-solid fa-spinner fa-spin"></i>

                <p>
                    Carregando solicitaÃ§Ãµes...ßtÚÚ$z{-®éÜj×Æö6ÂÇÀĞ¢$FFì:6ò–æf÷&ÖF Ğ Ğ¢6öç7B&WV—6–6õFW‡FòĞĞ¢ö'FW%FW‡Fõ&WV—6–6ò‡6öÆ–6—F6òĞ Ğ¢6öç7B&WV—6–6öW5f–æ7VÆF5FW‡FòĞĞ¢ö'FW%FW‡Fõ&WV—6–6öW5f–æ7VÆF2‡6öÆ–6—F6òĞ Ğ¢6öç7BF÷FÄW7F–ÖFòĞĞ¢ö'FW%F÷FÄW7F–ÖFõ6öÆ–6—F6ò‡6öÆ–6—F6òĞ Ğ¢6öç7BF÷FÄW7F–ÖFõFW‡FòĞĞ¢f÷&ÖF$ÖöVF‡F÷FÄW7F–ÖFò’ÇÂ$ì:6ò–æf÷&ÖFò Ğ Ğ¢6öç7B7FGW46Æ76RĞĞ¢€Ğ¢6öÆ–6—F6òç7FGW4FVæF–ÖVçFòÓÓÒ'&WV—6–6õ÷f–æ7VÆF"ÇÀĞ¢6öÆ–6—F6òç7FGW4FVæF–ÖVçFòÓÓÒ&6öæ6ÇV–F Ğ¢Ğ¢ò'f–æ7VÆF Ğ¢¢" Ğ Ğ¢6öç7BFÖ–ä–æfô‡FÖÂĞĞ¢W7V&–ôV„FÖ–â‚Ğ¢ò Ğ¢ÆF—càĞ¢Ç7ãå6öÆ–6—FçFSÂ÷7ãàĞ¢Ç7G&öæsâG¶W66$‡FÖÂ‡6öÆ–6—F6òçW7V&–ôæöÖRÇÂ6öÆ–6—F6òçW7V&–õ6öÆ–6—FçFSòææöÖRÇÂ$ì:6ò–æf÷&ÖFò"—ÓÂ÷7G&öæsàĞ¢ÂöF—càĞ Ğ¢ÆF—càĞ¢Ç7ãäÖG,:Ö7VÆ6öÆ–6—FçFSÂ÷7ãàĞ¢Ç7G&öæsâG¶W66$‡FÖÂ‡6öÆ–6—F6òçW7V&–ôÖG&–7VÆÇÂ6öÆ–6—F6òçW7V&–õ6öÆ–6—FçFSòæÖG&–7VÆÇÂ$ì:6ò–æf÷&ÖF"—ÓÂ÷7G&öæsàĞ¢ÂöF—càĞ¢ Ğ¢¢" Ğ Ğ¢6öç7B—FVç2ĞĞ¢6öÆ–6—F6òæ—FVç2ÇÂµĞĞ Ğ¢6öç7B—FVç5&W7VÖô‡FÖÂĞĞ¢—FVç0Ğ¢ç6Æ–6RƒÂ"Ğ¢æÖ†—FVÒÓâ°Ğ Ğ¢&WGW&â Ğ¢ÆÆ“àĞ¢Ç7G&öæsàĞ¢G¶W66$‡FÖÂ†—FVÒçVçF–FFRÇÂ—×€Ğ¢Â÷7G&öæsàĞ Ğ¢G¶W66$‡FÖÂ†—FVÒæFW67&–6òÇÂ$ÖFW&–Â"—ĞĞ Ğ¢Ç6ÖÆÃàĞ¢<;6F–vó¢G¶W66$‡FÖÂ†—FVÒæ6öF–vò—Ò+rG¶W66$‡FÖÂ†—FVÒæÆÖ÷†&–fFò—ĞĞ¢Â÷6ÖÆÃàĞ¢ÂöÆ“àĞ¢ Ğ Ğ¢ÒĞ¢æ¦ö–â‚""Ğ Ğ¢6öç7B—FVç4‡FÖÂĞĞ¢—FVç0Ğ¢æÖ†—FVÒÓâ°Ğ Ğ¢6öç7B7V'F÷FÅFW‡FòĞĞ¢f÷&ÖF$ÖöVF€Ğ¢ö'FW%fÆ÷%F÷FÄ—FVÔF6†&ö&B†—FVÒĞ¢’ÇÂ" Ğ Ğ¢&WGW&â Ğ¢ÆÆ“àĞ¢Ç7G&öæsàĞ¢G¶W66$‡FÖÂ†—FVÒçVçF–FFRÇÂ—×€Ğ¢Â÷7G&öæsàĞ Ğ¢G¶W66$‡FÖÂ†—FVÒæFW67&–6òÇÂ$ÖFW&–Â"—ĞĞ Ğ¢Ç6ÖÆÃàĞ¢<;6F–vó¢G¶W66$‡FÖÂ†—FVÒæ6öF–vò—Ò+rG¶W66$‡FÖÂ†—FVÒæÆÖ÷†&–fFò—ĞĞ¢G·7V'F÷FÅFW‡Fòò+rG¶W66$‡FÖÂ‡7V'F÷FÅFW‡Fò—Ö¢"'ĞĞ¢Â÷6ÖÆÃàĞ¢ÂöÆ“àĞ¢ Ğ Ğ¢ÒĞ¢æ¦ö–â‚""Ğ Ğ¢6&Bæ–ææW$…DÔÂÒ Ğ¢ÆF—b6Æ73Ò'6öÆ–6—F6òÖ6&B×F÷ò#àĞ¢ÆF—càĞ¢Ç7ãàĞ¢G¶W66$‡FÖÂ†FFFW‡Fò—ĞĞ¢Â÷7ãàĞ Ğ¢Æƒ3àĞ¢tÅ’G¶W66$‡FÖÂ‡6öÆ–6—F6òævÇ’—ĞĞ¢Âöƒ3àĞ¢ÂöF—càĞ Ğ¢Ç7â6Æ73Ò'6öÆ–6—F6ò×7FGW2G·7FGW46Æ76WÒ#àĞ¢G¶W66$‡FÖÂ‡7FGW5FW‡Fò—ĞĞ¢Â÷7ãàĞ¢ÂöF—càĞ Ğ¢ÆF—b6Æ73Ò'6öÆ–6—F6ò×&W7VÖò#àĞ¢G¶W66$‡FÖÂ†ö'FW%&W7VÖô—FVç2‡6öÆ–6—F6ò’—ĞĞ¢ÂöF—càĞ Ğ¢ÆF—b6Æ73Ò'6öÆ–6—F6òÖ–æfòÖw&–B#àĞ¢ÆF—càĞ¢Ç7ãå&WV—6œ:|:6óÂ÷7ãàĞ¢Ç7G&öæsâG¶W66$‡FÖÂ‡&WV—6–6õFW‡Fò—ÓÂ÷7G&öæsàĞ¢ÂöF—càĞ Ğ¢ÆF—càĞ¢Ç7ãå&WV—6œ:|;VW2f–æ7VÆF3Â÷7ãàĞ¢Ç7G&öæsâG¶W66$‡FÖÂ‡&WV—6–6öW5f–æ7VÆF5FW‡FòÇÂ$æVæ‡VÖ"—ÓÂ÷7G&öæsàĞ¢ÂöF—càĞ Ğ¢ÆF—càĞ¢Ç7ãäÆö6ÃÂ÷7ãàĞ¢Ç7G&öæsâG¶W66$‡FÖÂ‡6öÆ–6—F6òæÆö6ÅW6òÇÂ$ì:6ò–æf÷&ÖFò"—ÓÂ÷7G&öæsàĞ¢ÂöF—càĞ Ğ¢ÆF—càĞ¢Ç7ãå&WF—&FÂ÷7ãàĞ¢Ç7G&öæsâG¶W66$‡FÖÂ‡6öÆ–6—F6òææöÖU&WF—&FÇÂ$ì:6ò–æf÷&ÖFò"—ÓÂ÷7G&öæsàĞ¢ÂöF—càĞ Ğ¢ÆF—càĞ¢Ç7ãäÖG,:Ö7VÆÂ÷7ãàĞ¢Ç7G&öæsâG¶W66$‡FÖÂ‡6öÆ–6—F6òæÖG&–7VÆ&WF—&FÇÂ$ì:6ò–æf÷&ÖF"—ÓÂ÷7G&öæsàĞ¢ÂöF—càĞ Ğ¢ÆF—càĞ¢Ç7ãåF÷FÂFR—FVç3Â÷7ãàĞ¢Ç7G&öæsâG¶W66$‡FÖÂ‡6öÆ–6—F6òçF÷FÄ—FVç2ÇÂ—ÓÂ÷7G&öæsàĞ¢ÂöF—càĞ Ğ¢ÆF—càĞ¢Ç7ãåF÷FÂW7F–ÖFóÂ÷7ãàĞ¢Ç7G&öæsâG¶W66$‡FÖÂ‡F÷FÄW7F–ÖFõFW‡Fò—ÓÂ÷7G&öæsàĞ¢ÂöF—càĞ Ğ¢G¶FÖ–ä–æfô‡FÖÇĞĞ¢ÂöF—càĞ Ğ¢ÆF—b6Æ73Ò'6öÆ–6—F6òÖ—FVç2#àĞ¢Ç7ãàĞ¢ÖFW&–—0Ğ¢Â÷7ãàĞ Ğ¢ÇVÃàĞ¢G¶—FVç5&W7VÖô‡FÖÂÇÂ#ÆÆ“äæVæ‡VÒ—FVÒFWFÆ†FòãÂöÆ“â'ĞĞ¢Â÷VÃàĞ Ğ¢G°Ğ¢—FVç2æÆVæwF‚â Ğ¢ò Ğ¢ÆFWF–Ç26Æ73Ò'6öÆ–6—F6òÖFWFÆ†W2#àĞ¢Ç7VÖÖ'“àĞ¢fW"FöF÷2÷2—FVç2‚G¶—FVç2æÆVæwF‡ÒĞ¢Â÷7VÖÖ'“àĞ Ğ¢ÇVÃàĞ¢G¶—FVç4‡FÖÇĞĞ¢Â÷VÃàĞ¢ÂöFWF–Ç3àĞ¢ Ğ¢¢" Ğ¢Ğ¢ÂöF—cà ¢G°¢öFU&VVçf–%6öÆ–6—F6ò‡6öÆ–6—F6ò¢ò ¢ÆF—b6Æ73Ò'6öÆ–6—F6òÖ6öW2#à¢Æ'WGFöà¢6Æ73Ò&'Fâ×&VVçf–"×6öÆ–6—F6ò ¢G—SÒ&'WGFöâ ¢&–ÖÆ&VÃÒ%&VVçf–"6öÆ–6—F:|:6òtÅ’G¶W66$‡FÖÂ‡6öÆ–6—F6òævÇ’—Òæòv†G4 ¢à¢Æ’6Æ73Ò&fÖ'&æG2f×v†G6#ãÂö“à¢Ç7ãå&VVçf–"æòv†G4Â÷7ãà¢Âö'WGFöãà¢ÂöF—cà¢ ¢¢" ¢Ğ¢  ¢6öç7B&÷Fõ&VVçf–"Ğ¢6&BçVW'•6VÆV7F÷"‚"æ'Fâ×&VVçf–"×6öÆ–6—F6ò" ¢–b†&÷Fõ&VVçf–"’° ¢&÷Fõ&VVçf–"æFDWfVçDÆ—7FVæW"€¢&6Æ–6²"À¢‚’Óâ° ¢&VVçf–%6öÆ–6—F6õv†G6‡6öÆ–6—F6ò ¢Ğ¢ ¢Ğ ¢6öçF–æW"æVæD6†–ÆB†6&B ¢Ò ¢–b†W†—7FTÖ—56öÆ–6—F6öW2’° ¢6öç7B&÷FôÖ—2Ğ¢Fö7VÖVçBæ7&VFTVÆVÖVçB‚&'WGFöâ" ¢&÷FôÖ—2çG—RĞ¢&'WGFöâ  ¢&÷FôÖ—2æ6Æ74æÖRĞ¢&'FâÖ6'&Vv"ÖÖ—2  ¢&÷FôÖ—2æ–ææW$…DÔÂÒ ¢Æ’6Æ73Ò&f×6öÆ–BfÖ6†Wg&öâÖF÷vâ#ãÂö“à¢Ç7ãä6'&Vv"Ö—3Â÷7ãà¢  ¢&÷FôÖ—2æFDWfVçDÆ—7FVæW"€¢&6Æ–6²"À¢7–æ2‚’Óâ° ¢&÷FôÖ—2æF—6&ÆVBĞ¢G'VP ¢&÷FôÖ—2æ–ææW$…DÔÂÒ ¢Æ’6Æ73Ò&f×6öÆ–Bf×7–ææW"f×7–â#ãÂö“à¢Ç7ãä6'&VvæFòââãÂ÷7ãà¢  ¢v—B6'&Vv%6öÆ–6—F6öW5W7V&–ò€¢G'VRÀ¢G'VP¢ ¢Ğ¢ ¢6öçF–æW"æVæD6†–ÆB†&÷FôÖ—2 ¢Ğ §Ğ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ¢òò%U44DRÔDU$”•0¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ ¦gVæ7F–öâ'W66$ÖFW&–—56–×ÆW2‡FW‡Fô'W66’° ¢&WGW&âÖFW&–—2æf–ÇFW"†ÖFW&–ÂÓâ° ¢6öç7B6öF–vòĞ¢7G&–ær†ÖFW&–Âæ6öF–vòÇÂ""¢çFôÆ÷vW$66R‚ ¢&WGW&â6öF–vòæ–æ6ÇVFW2‡FW‡Fô'W66’ÇÀ¢FW‡Fô6öçFVÒ†ÖFW&–ÂæFW67&–6òÂFW‡Fô'W66 ¢Ò §Ğ ¦gVæ7F–öâ'W66$ÖFW&–—2‚’° ¢6öç7B6×ô'W66GVÂĞ¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&'W66" ¢6öç7B6VÆV7DÆÖ÷†&–fFôGVÂĞ¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚&ÆÖ÷†&–fFò" ¢6öç7BF—e&W7VÇFF÷4GVÂĞ¢Fö7VÖVçBævWDVÆVÖVçD'”–B‚'&W7VÇFF÷2" ¢–b€¢6×ô'W66GVÂÇÀ¢6VÆV7DÆÖ÷†&–fFôGVÂÇÀ¢F—e&W7VÇFF÷4GVÀ¢’° ¢&WGW&à ¢Ğ ¢–b†6'&VvæFôÖFW&–—2’° ¢F—e&W7VÇFF÷4GVÂæ–ææW$…DÔÂÒ ¢ÆF—b6Æ73Ò&V×G’×7FFR#à¢Æ’6Æ73Ò&f×6öÆ–Bf×7–ææW"f×7–â#ãÂö“à¢Çà¢6'&VvæFòÖFW&–—2ââà¢Â÷à¢ÂöF—cà¢  ¢&WGW&à ¢Ğ ¢–b‚ÖFW&–—46'&VvF÷2ÇÂÖFW&–—2æÆVæwF‚ÓÓÒ’° ¢–b†W'&ô6'&VvÖVçFôÖFW&–—2’° ¢Ö÷7G&$W'&ôÖFW&–—46'&VvÖVçFò‚ ¢&WGW&à ¢Ğ ¢6'&Vv$ÖFW&–—2‚ ¢&WGW&à ¢Ğ ¢6öç7BFW‡Fô'W66Ğ¢æ÷&ÖÆ—¦$'W66€¢6×ô'W66GVÂçfÇVP¢¢çG&–Ò‚ ¢6öç7BÆÖ÷†&–fFõ6VÆV6–öæFòĞ¢6VÆV7DÆÖ÷†&–fFôGVÂçfÇVP ¢F—e&W7VÇFF÷4GVÂæ–ææW$…DÔÂÒ"  Ğ¢–b‡FW‡Fô'W66æÆVæwF‚Â"’°Ğ Ğ¢&WGW&àĞ Ğ¢ĞĞ Ğ¢6öç7B'W66çVÖW&–6ĞĞ¢õåÆB²BòçFW7B‡FW‡Fô'W66Ğ Ğ¢ÆWB&W7VÇFF÷2ÒµĞĞ Ğ¢–b†'W66çVÖW&–6’°Ğ Ğ¢&W7VÇFF÷2ĞĞ¢ÖFW&–—2æf–ÇFW"†ÖFW&–ÂÓâ° ¢&WGW&â7G&–ær†ÖFW&–Âæ6öF–vòÇÂ""¢çFôÆ÷vW$66R‚¢æ–æ6ÇVFW2‡FW‡Fô'W66 ¢ÒĞ Ğ¢ĞĞ Ğ¢VÇ6R° ¢–b†gW6R’° ¢G'’° ¢&W7VÇFF÷2Ğ¢gW6P¢ç6V&6‚‡FW‡Fô'W66¢æÖ‡&W7VÇFFòÓâ&W7VÇFFòæ—FVÒ ¢Ğ ¢6F6‚†W'&ôgW6R’° ¢6öç6öÆRçv&â€¢$'W66gW6Ræ§2fÆ†÷RâW6æFò'W666–×ÆW3¢"À¢W'&ôgW6P¢ ¢&W7VÇFF÷2Ğ¢'W66$ÖFW&–—56–×ÆW2‡FW‡Fô'W66 ¢Ğ ¢Ğ ¢VÇ6R° ¢&W7VÇFF÷2Ğ¢'W66$ÖFW&–—56–×ÆW2‡FW‡Fô'W66 ¢Ğ ¢Ğ Ğ¢6öç7BW†—7FTF—7öæ—fVÄæõ6VÆV6–öæFòĞĞ¢&W7VÇFF÷2ç6öÖR†ÖFW&–ÂÓâ°Ğ Ğ¢&WGW&â€Ğ¢ÖFW&–ÂæÆÖ÷†&–fFòÓÓÒÆÖ÷†&–fFõ6VÆV6–öæFòb`Ğ¢ÖFW&–ÂæF—7öæ—fVÀĞ¢Ğ Ğ¢ÒĞ Ğ¢–b†W†—7FTF—7öæ—fVÄæõ6VÆV6–öæFò’°Ğ Ğ¢&W7VÇFF÷2ĞĞ¢&W7VÇFF÷2æf–ÇFW"†ÖFW&–ÂÓâ°Ğ Ğ¢&WGW&âÖFW&–ÂæÆÖ÷†&–fFòÓÓÒÆÖ÷†&–fFõ6VÆV6–öæFğĞ Ğ¢ÒĞ Ğ¢ĞĞ Ğ¢&W7VÇFF÷2ç6÷'B‚†Â"’Óâ°Ğ Ğ¢6öç7B&–÷&–FFTĞĞ¢æF—7öæ—fVÀĞ Ğ¢6öç7B&–÷&–FFT"ĞĞ¢"æF—7öæ—fVÀĞ Ğ¢–b‡&–÷&–FFTbb&–÷&–FFT"’°Ğ Ğ¢&WGW&âÓĞ Ğ¢ĞĞ Ğ¢–b‚&–÷&–FFTbb&–÷&–FFT"’°Ğ Ğ¢&WGW&âĞ Ğ¢ĞĞ Ğ¢&WGW&â Ğ Ğ¢ÒĞ Ğ¢6öç7BÖFW&–—5Væ–6÷2ÒµĞ¢6öç7B6†fW4¦F–6–öæF2ÒæWr6WB‚ ¢&W7VÇFF÷2æf÷$V6‚†ÖFW&–ÂÓâ° ¢6öç7B6†fTÖFW&–ÂĞ¢ö'FW$6†fT—FVÕ6öÆ–6—F6ò†ÖFW&–Â ¢–b€¢ÖFW&–ÂæF—7öæ—fVÂb`¢6†fW4¦F–6–öæF2æ†2†6†fTÖFW&–Â¢’° ¢&WGW&à ¢Ğ ¢6†fW4¦F–6–öæF2æFB€¢6†fTÖFW&–À¢ Ğ¢ÖFW&–—5Væ–6÷2çW6‚†ÖFW&–ÂĞ Ğ¢ÒĞ Ğ¢–b€Ğ¢'W66çVÖW&–6b`Ğ¢ÖFW&–—5Væ–6÷2æÆVæwF‚â Ğ¢’°Ğ Ğ¢6öç7BVæ6öçG&÷TF—7öæ—fVÂĞĞ¢ÖFW&–—5Væ–6÷2ç6öÖR†ÖFW&–ÂÓâ°Ğ Ğ¢&WGW&âÖFW&–ÂæF—7öæ—fVÀĞ Ğ¢ÒĞ Ğ¢–b‚Væ6öçG&÷TF—7öæ—fVÂ’°Ğ Ğ¢ÖFW&–—5Væ–6÷2ç7Æ–6RƒĞ Ğ¢ĞĞ Ğ¢ĞĞ Ğ¢–b†ÖFW&–—5Væ–6÷2æÆVæwF‚ÓÓÒ’°Ğ Ğ¢F—e&W7VÇFF÷4GVÂæ–ææW$…DÔÂÒ ¢ÆF—b6Æ73Ò&V×G’×7FFR#à¢Æ’6Æ73Ò&f×&VwVÆ"fÖf6RÖg&÷vâ#ãÂö“à Ğ¢ÇàĞ¢æVæ‡VÒÖFW&–ÂVæ6öçG&FòàĞ¢Â÷àĞ¢ÂöF—càĞ¢ Ğ Ğ¢&WGW&àĞ Ğ¢ĞĞ Ğ¢ÖFW&–—5Væ–6÷2æf÷$V6‚†ÖFW&–ÂÓâ°Ğ Ğ¢6öç7BF—bĞĞ¢Fö7VÖVçBæ7&VFTVÆVÖVçB‚&F—b"Ğ Ğ¢F—bæ6Æ74Æ—7BæFB€Ğ¢'&W7VÇFFòÖ—FVÒ Ğ¢Ğ Ğ¢F—bæ6Æ74Æ—7BæFB€Ğ¢ÖFW&–ÂæF—7öæ—fVÀĞ¢ò&F—7öæ—fVÂ Ğ¢¢&–æF—7öæ—fVÂ Ğ¢Ğ Ğ¢ÆWB7FGW5FW‡FòÒ" Ğ Ğ¢–b€Ğ¢ÖFW&–ÂæÆÖ÷†&–fFòÓÓÒÆÖ÷†&–fFõ6VÆV6–öæFòb`Ğ¢ÖFW&–ÂæF—7öæ—fVÀĞ¢’°Ğ Ğ¢7FGW5FW‡FòĞĞ¢)ÈRF—7öì:×fVÂæòG¶ÖFW&–ÂæÆÖ÷†&–fF÷Ö Ğ Ğ¢ĞĞ Ğ¢VÇ6R–b†ÖFW&–ÂæF—7öæ—fVÂ’°Ğ Ğ¢7FGW5FW‡FòĞĞ¢)ªûˆòF—7öì:×fVÂæòG¶ÖFW&–ÂæÆÖ÷†&–fF÷Ö Ğ Ğ¢ĞĞ Ğ¢VÇ6R°Ğ Ğ¢7FGW5FW‡FòĞĞ¢)ØÂ–æF—7öì:×fVÆ Ğ Ğ¢Ğ ¢6öç7BW7F÷VTFÖ–ä‡FÖÂĞ¢ÖöçF$W7F÷VTFÖ–ä‡FÖÂ†ÖFW&–Â ¢F—bæ–ææW$…DÔÂÒ ¢ÆF—b6Æ73Ò&6öF–vò#àĞ¢<;6F–vó¢G¶W66$‡FÖÂ†ÖFW&–Âæ6öF–vò—ĞĞ¢ÂöF—càĞ Ğ¢ÆF—b6Æ73Ò&FW67&–6ò#àĞ¢G¶W66$‡FÖÂ†ÖFW&–ÂæFW67&–6ò—ĞĞ¢ÂöF—càĞ Ğ¢ÆF—b6Æ73Ò'7FGW2#à¢G¶W66$‡FÖÂ‡7FGW5FW‡Fò—Ğ¢ÂöF—cà ¢G¶W7F÷VTFÖ–ä‡FÖÇĞ¢  Ğ¢F—bæFDWfVçDÆ—7FVæW"€Ğ¢&6Æ–6²"ÀĞ¢‚’Óâ'&—$ÖöFÂ†ÖFW&–ÂĞ¢Ğ Ğ¢F—e&W7VÇFF÷4GVÂæVæD6†–ÆB†F—b ¢Ò §Ğ ¦–b†6×ô'W66’° ¢µ°¢&–çWB"À¢&¶W—W"À¢&6†ævR"À¢'6V&6‚"À¢'7FR ¢Òæf÷$V6‚†WfVçFòÓâ° ¢6×ô'W66æFDWfVçDÆ—7FVæW"€¢WfVçFòÀ¢‚’Óâ° ¢6WEF–ÖV÷WB€¢'W66$ÖFW&–—2À¢ ¢ ¢Ğ¢ ¢Ò §Ğ Ğ¦–b‡6VÆV7DÆÖ÷†&–fFò’°Ğ Ğ¢6VÆV7DÆÖ÷†&–fFòæFDWfVçDÆ—7FVæW"€Ğ¢&6†ævR"ÀĞ¢'W66$ÖFW&–—0Ğ¢Ğ Ğ§ĞĞ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ¢òò”ä•@Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ Ğ¦7–æ2gVæ7F–öâ–æ–6–$Æ–66ò‚’°Ğ Ğ¢–b†¦–æ–6–Fò’°Ğ Ğ¢&WGW&àĞ Ğ¢ĞĞ Ğ¢¦–æ–6–FòÒG'VPĞ Ğ¢&W&$W7G'WGW&FVÆ2‚Ğ Ğ¢6'&Vv$6'&–æ†ôÆö6Â‚Ğ Ğ¢v—B6'&Vv$ÖFW&–—2‚¢–æ–6–$ö'6W'f6ôÖFW&–—2‚ Ğ¢GVÆ—¦$6'&–æ†ò‚Ğ Ğ¢–b‡FVÆGVÂÓÓÒ&–æ–6–ò"’°Ğ Ğ¢GVÆ—¦$F6†&ö&D–æ–6–ò‚Ğ Ğ¢ĞĞ Ğ§ĞĞ Ğ¦7–æ2gVæ7F–öâ–æ–6–Æ—¦"‚’°Ğ Ğ¢6öç7BW7V&–òĞĞ¢ö'FW%6W76õW7V&–ò‚Ğ Ğ¢–b‡W7V&–ò’°Ğ Ğ¢v—BÖ÷7G&$Æ–66ò‡W7V&–òĞ Ğ¢v—B–æ–6–$Æ–66ò‚Ğ Ğ¢ĞĞ Ğ¢VÇ6R°Ğ Ğ¢Ö÷7G&%FVÆÆöv–â‚Ğ Ğ¢ĞĞ Ğ§ĞĞ Ğ¦–æ–6–Æ—¦"‚Ğ 