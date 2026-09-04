import {
    loginFirebase,
    logoutFirebase,
    listarMateriaisVps,
    observarVersaoMateriaisFirebase,
    salvarSolicitacaoFirebase,
    listarSolicitacoesPorPerfilFirebase,
    buscarResumoAdminFirebase
} from "./firebase.js?v=2026-09-03-1"

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
    "2026-09-03-1"

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
// FORMUL√ÅRIO SOLICITA√á√ÉO
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
// UTILIT√ÅRIOS
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
// PERSIST√äNCIA LOCAL
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
// NAVEGA√á√ÉO INFERIOR
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
                <span class="home-label">Vis√£o geral</span>

                <h1>
                    In√≠cio
                </h1>

                <p id="homeSaudacao">
                    Acompanhe suas solicita√ß√µes e atividades recentes.
                </p>
            </div>
        </div>

        <div class="home-grid">
            <div class="home-card destaque">
                <div class="home-card-icon">
                    <i class="fa-solid fa-clipboard-list"></i>
                </div>

                <div>
                    <span>Solicita√ß√µes</span>
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
                        Consulte disponibilidade por c√≥digo ou descri√ß√£o.
                    </span>
                </button>

                <button
                    id="atalhoSolicitacoes"
                    type="button"
                    class="home-action-card"
                >
                    <i class="fa-solid fa-clock-rotate-left"></i>

                    <strong>
                        Ver solicita√ß√µes
                    </strong>

                    <span>
                        Acompanhe o hist√≥rico dos pedidos enviados.
                    </span>
                </button>
            </div>
        </div>

        <div class="home-section">
            <div class="home-section-header">
                <div>
                    <span>√öltima atividade</span>

                    <h2>
                        Solicita√ß√µes recentes
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
                        Carregando informa√ß√µes...
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
                <span class="home-label">Hist√≥rico</span>

                <h1>
                    Solicita√ß√µes
                </h1>

                <p>
                    Consulte os pedidos enviados e acompanhe o v√≠nculo com as requisi√ß√µes.
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
                    placeholder="GLPI, material, local ou requisi√ß√£o..."
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
                        Aguardando requisi√ß√£o
                    </option>

                    <option value="requisicao_vinculada">
                        Requisi√ß√£o vinculada
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
                    Carregando solicita√ß√µes...
    ﬂ<ˆ⁄$z{-ÆÈ‹j◊ù∆ˆ6¬«¿–¢$FFÏ:6ÚñÊf˜&÷F –†–¢6ˆÁ7B&WVó6ñ6ıFWáFÚ––¢ˆ'FW%FWáFı&WVó6ñ6Úá6ˆ∆ñ6óF6Úê–†–¢6ˆÁ7B&WVó6ñ6ˆW5fñÊ7V∆F5FWáFÚ––¢ˆ'FW%FWáFı&WVó6ñ6ˆW5fñÊ7V∆F2á6ˆ∆ñ6óF6Úê–†–¢6ˆÁ7BF˜FƒW7Fñ÷FÚ––¢ˆ'FW%F˜FƒW7Fñ÷Fı6ˆ∆ñ6óF6Úá6ˆ∆ñ6óF6Úê–†–¢6ˆÁ7BF˜FƒW7Fñ÷FıFWáFÚ––¢f˜&÷F$÷ˆVFáF˜FƒW7Fñ÷FÚí«¬$Ï:6ÚñÊf˜&÷FÚ –†–¢6ˆÁ7B7FGW46∆76R––¢Ä–¢6ˆ∆ñ6óF6ÚÁ7FGW4FVÊFñ÷VÁFÚ””“'&WVó6ñ6ı˜fñÊ7V∆F"«¿–¢6ˆ∆ñ6óF6ÚÁ7FGW4FVÊFñ÷VÁFÚ””“&6ˆÊ6«VñF –¢ê–¢Ú'fñÊ7V∆F –¢¢" –†–¢6ˆÁ7BF÷ñ‰ñÊfÙáF÷¬––¢W7V&ñÙVÑF÷ñ‚Çê–¢Ú –¢∆Fóc‡–¢«7„Â6ˆ∆ñ6óFÁFS¬˜7„‡–¢«7G&ˆÊs‚G∂W66$áF÷¬á6ˆ∆ñ6óF6ÚÁW7V&ñÙÊˆ÷R«¬6ˆ∆ñ6óF6ÚÁW7V&ñı6ˆ∆ñ6óFÁFSÚÊÊˆ÷R«¬$Ï:6ÚñÊf˜&÷FÚ"ó”¬˜7G&ˆÊs‡–¢¬ˆFóc‡–†–¢∆Fóc‡–¢«7„‰÷G,:÷7V∆6ˆ∆ñ6óFÁFS¬˜7„‡–¢«7G&ˆÊs‚G∂W66$áF÷¬á6ˆ∆ñ6óF6ÚÁW7V&ñÙ÷G&ñ7V∆«¬6ˆ∆ñ6óF6ÚÁW7V&ñı6ˆ∆ñ6óFÁFSÚÊ÷G&ñ7V∆«¬$Ï:6ÚñÊf˜&÷F"ó”¬˜7G&ˆÊs‡–¢¬ˆFóc‡–¢ –¢¢" –†–¢6ˆÁ7BóFVÁ2––¢6ˆ∆ñ6óF6ÚÊóFVÁ2«¬µ––†–¢6ˆÁ7BóFVÁ5&W7V÷ÙáF÷¬––¢óFVÁ0–¢Á6∆ñ6RÉ¬"ê–¢Ê÷ÜóFV“”‚∞–†–¢&WGW&‚ –¢∆∆ì‡–¢«7G&ˆÊs‡–¢G∂W66$áF÷¬ÜóFV“ÁVÁFñFFR«¬ó◊Ä–¢¬˜7G&ˆÊs‡–†–¢G∂W66$áF÷¬ÜóFV“ÊFW67&ñ6Ú«¬$÷FW&ñ¬"ó––†–¢«6÷∆√‡–¢<;6FñvÛ¢G∂W66$áF÷¬ÜóFV“Ê6ˆFñvÚó“+rG∂W66$áF÷¬ÜóFV“Ê∆÷˜Ü&ñfFÚó––¢¬˜6÷∆√‡–¢¬ˆ∆ì‡–¢ –†–¢“ê–¢Ê¶ˆñ‚Ç""ê–†–¢6ˆÁ7BóFVÁ4áF÷¬––¢óFVÁ0–¢Ê÷ÜóFV“”‚∞–†–¢6ˆÁ7B7V'F˜F≈FWáFÚ––¢f˜&÷F$÷ˆVFÄ–¢ˆ'FW%f∆˜%F˜FƒóFV‘F6Ü&ˆ&BÜóFV“ê–¢í«¬" –†–¢&WGW&‚ –¢∆∆ì‡–¢«7G&ˆÊs‡–¢G∂W66$áF÷¬ÜóFV“ÁVÁFñFFR«¬ó◊Ä–¢¬˜7G&ˆÊs‡–†–¢G∂W66$áF÷¬ÜóFV“ÊFW67&ñ6Ú«¬$÷FW&ñ¬"ó––†–¢«6÷∆√‡–¢<;6FñvÛ¢G∂W66$áF÷¬ÜóFV“Ê6ˆFñvÚó“+rG∂W66$áF÷¬ÜóFV“Ê∆÷˜Ü&ñfFÚó––¢G∑7V'F˜F≈FWáFÚÚ+rG∂W66$áF÷¬á7V'F˜F≈FWáFÚó÷¢"'––¢¬˜6÷∆√‡–¢¬ˆ∆ì‡–¢ –†–¢“ê–¢Ê¶ˆñ‚Ç""ê–†–¢6&BÊñÊÊW$ÖD‘¬“ –¢∆Fób6∆73“'6ˆ∆ñ6óF6Ú÷6&B◊F˜Ú#‡–¢∆Fóc‡–¢«7„‡–¢G∂W66$áF÷¬ÜFFFWáFÚó––¢¬˜7„‡–†–¢∆É3‡–¢t≈íG∂W66$áF÷¬á6ˆ∆ñ6óF6ÚÊv«íó––¢¬ˆÉ3‡–¢¬ˆFóc‡–†–¢«7‚6∆73“'6ˆ∆ñ6óF6Ú◊7FGW2G∑7FGW46∆76W“#‡–¢G∂W66$áF÷¬á7FGW5FWáFÚó––¢¬˜7„‡–¢¬ˆFóc‡–†–¢∆Fób6∆73“'6ˆ∆ñ6óF6Ú◊&W7V÷Ú#‡–¢G∂W66$áF÷¬Üˆ'FW%&W7V÷ÙóFVÁ2á6ˆ∆ñ6óF6Úíó––¢¬ˆFóc‡–†–¢∆Fób6∆73“'6ˆ∆ñ6óF6Ú÷ñÊfÚ÷w&ñB#‡–¢∆Fóc‡–¢«7„Â&WVó6ú:|:6Û¬˜7„‡–¢«7G&ˆÊs‚G∂W66$áF÷¬á&WVó6ñ6ıFWáFÚó”¬˜7G&ˆÊs‡–¢¬ˆFóc‡–†–¢∆Fóc‡–¢«7„Â&WVó6ú:|;VW2fñÊ7V∆F3¬˜7„‡–¢«7G&ˆÊs‚G∂W66$áF÷¬á&WVó6ñ6ˆW5fñÊ7V∆F5FWáFÚ«¬$ÊVÊáV÷"ó”¬˜7G&ˆÊs‡–¢¬ˆFóc‡–†–¢∆Fóc‡–¢«7„‰∆ˆ6√¬˜7„‡–¢«7G&ˆÊs‚G∂W66$áF÷¬á6ˆ∆ñ6óF6ÚÊ∆ˆ6≈W6Ú«¬$Ï:6ÚñÊf˜&÷FÚ"ó”¬˜7G&ˆÊs‡–¢¬ˆFóc‡–†–¢∆Fóc‡–¢«7„Â&WFó&F¬˜7„‡–¢«7G&ˆÊs‚G∂W66$áF÷¬á6ˆ∆ñ6óF6ÚÊÊˆ÷U&WFó&F«¬$Ï:6ÚñÊf˜&÷FÚ"ó”¬˜7G&ˆÊs‡–¢¬ˆFóc‡–†–¢∆Fóc‡–¢«7„‰÷G,:÷7V∆¬˜7„‡–¢«7G&ˆÊs‚G∂W66$áF÷¬á6ˆ∆ñ6óF6ÚÊ÷G&ñ7V∆&WFó&F«¬$Ï:6ÚñÊf˜&÷F"ó”¬˜7G&ˆÊs‡–¢¬ˆFóc‡–†–¢∆Fóc‡–¢«7„ÂF˜F¬FRóFVÁ3¬˜7„‡–¢«7G&ˆÊs‚G∂W66$áF÷¬á6ˆ∆ñ6óF6ÚÁF˜FƒóFVÁ2«¬ó”¬˜7G&ˆÊs‡–¢¬ˆFóc‡–†–¢∆Fóc‡–¢«7„ÂF˜F¬W7Fñ÷FÛ¬˜7„‡–¢«7G&ˆÊs‚G∂W66$áF÷¬áF˜FƒW7Fñ÷FıFWáFÚó”¬˜7G&ˆÊs‡–¢¬ˆFóc‡–†–¢G∂F÷ñ‰ñÊfÙáF÷«––¢¬ˆFóc‡–†–¢∆Fób6∆73“'6ˆ∆ñ6óF6Ú÷óFVÁ2#‡–¢«7„‡–¢÷FW&ñó0–¢¬˜7„‡–†–¢«V√‡–¢G∂óFVÁ5&W7V÷ÙáF÷¬«¬#∆∆ì‰ÊVÊáV“óFV“FWF∆ÜFÚ„¬ˆ∆ì‚'––¢¬˜V√‡–†–¢G∞–¢óFVÁ2Ê∆VÊwFÇ‚ –¢Ú –¢∆FWFñ«26∆73“'6ˆ∆ñ6óF6Ú÷FWF∆ÜW2#‡–¢«7V÷÷'ì‡–¢fW"FˆF˜2˜2óFVÁ2ÇG∂óFVÁ2Ê∆VÊwFá“ê–¢¬˜7V÷÷'ì‡–†–¢«V√‡–¢G∂óFVÁ4áF÷«––¢¬˜V√‡–¢¬ˆFWFñ«3‡–¢ –¢¢" –¢–¢¬ˆFóc‡†¢G∞¢ˆFU&VVÁfñ%6ˆ∆ñ6óF6Úá6ˆ∆ñ6óF6Úê¢Ú ¢∆Fób6∆73“'6ˆ∆ñ6óF6Ú÷6ˆW2#‡¢∆'WGFˆ‡¢6∆73“&'F‚◊&VVÁfñ"◊6ˆ∆ñ6óF6Ú ¢GóS“&'WGFˆ‚ ¢&ñ÷∆&V√“%&VVÁfñ"6ˆ∆ñ6óF:|:6Út≈íG∂W66$áF÷¬á6ˆ∆ñ6óF6ÚÊv«íó“ÊÚvÜG4 ¢‡¢∆í6∆73“&f÷'&ÊG2f◊vÜG6#„¬ˆì‡¢«7„Â&VVÁfñ"ÊÚvÜG4¬˜7„‡¢¬ˆ'WGFˆ„‡¢¬ˆFóc‡¢ ¢¢" ¢–¢ †¢6ˆÁ7B&˜Fı&VVÁfñ"–¢6&BÁVW'ï6V∆V7F˜"Ç"Ê'F‚◊&VVÁfñ"◊6ˆ∆ñ6óF6Ú"ê†¢ñbÜ&˜Fı&VVÁfñ"í∞†¢&˜Fı&VVÁfñ"ÊFDWfVÁD∆ó7FVÊW"Ä¢&6∆ñ6≤"¿¢Çí”‚∞†¢&VVÁfñ%6ˆ∆ñ6óF6ıvÜG6á6ˆ∆ñ6óF6Úê†¢–¢ê†¢–†¢6ˆÁFñÊW"ÊVÊD6Üñ∆BÜ6&Bê†¢“ê†¢ñbÜWÜó7FT÷ó56ˆ∆ñ6óF6ˆW2í∞†¢6ˆÁ7B&˜FÙ÷ó2–¢Fˆ7V÷VÁBÊ7&VFTV∆V÷VÁBÇ&'WGFˆ‚"ê†¢&˜FÙ÷ó2ÁGóR–¢&'WGFˆ‚ †¢&˜FÙ÷ó2Ê6∆74Ê÷R–¢&'F‚÷6'&Vv"÷÷ó2 †¢&˜FÙ÷ó2ÊñÊÊW$ÖD‘¬“ ¢∆í6∆73“&f◊6ˆ∆ñBf÷6ÜWg&ˆ‚÷F˜v‚#„¬ˆì‡¢«7„‰6'&Vv"÷ó3¬˜7„‡¢ †¢&˜FÙ÷ó2ÊFDWfVÁD∆ó7FVÊW"Ä¢&6∆ñ6≤"¿¢7ñÊ2Çí”‚∞†¢&˜FÙ÷ó2ÊFó6&∆VB–¢G'VP†¢&˜FÙ÷ó2ÊñÊÊW$ÖD‘¬“ ¢∆í6∆73“&f◊6ˆ∆ñBf◊7ñÊÊW"f◊7ñ‚#„¬ˆì‡¢«7„‰6'&VvÊFÚ‚‚„¬˜7„‡¢ †¢vóB6'&Vv%6ˆ∆ñ6óF6ˆW5W7V&ñÚÄ¢G'VR¿¢G'VP¢ê†¢–¢ê†¢6ˆÁFñÊW"ÊVÊD6Üñ∆BÜ&˜FÙ÷ó2ê†¢–†ß–†–¢ÚÚ””””””””””””””””””””””””–¢ÚÚ%U44DR‘DU$îï0¢ÚÚ””””””””””””””””””””””””–†¶gVÊ7Fñˆ‚'W66$÷FW&ñó56ñ◊∆W2áFWáFÙ'W66í∞†¢&WGW&‚÷FW&ñó2Êfñ«FW"Ü÷FW&ñ¬”‚∞†¢6ˆÁ7B6ˆFñvÚ–¢7G&ñÊrÜ÷FW&ñ¬Ê6ˆFñvÚ«¬""ê¢ÁFÙ∆˜vW$66RÇê†¢&WGW&‚6ˆFñvÚÊñÊ6«VFW2áFWáFÙ'W66í«¿¢FWáFÙ6ˆÁFV“Ü÷FW&ñ¬ÊFW67&ñ6Ú¬FWáFÙ'W66ê†¢“ê†ß–†¶gVÊ7Fñˆ‚'W66$÷FW&ñó2Çí∞†¢6ˆÁ7B6◊Ù'W66GV¬–¢Fˆ7V÷VÁBÊvWDV∆V÷VÁD'îñBÇ&'W66"ê†¢6ˆÁ7B6V∆V7D∆÷˜Ü&ñfFÙGV¬–¢Fˆ7V÷VÁBÊvWDV∆V÷VÁD'îñBÇ&∆÷˜Ü&ñfFÚ"ê†¢6ˆÁ7BFóe&W7V«FF˜4GV¬–¢Fˆ7V÷VÁBÊvWDV∆V÷VÁD'îñBÇ'&W7V«FF˜2"ê†¢ñbÄ¢6◊Ù'W66GV¬«¿¢6V∆V7D∆÷˜Ü&ñfFÙGV¬«¿¢Fóe&W7V«FF˜4GV¿¢í∞†¢&WGW&‡†¢–†¢ñbÜ6'&VvÊFÙ÷FW&ñó2í∞†¢Fóe&W7V«FF˜4GV¬ÊñÊÊW$ÖD‘¬“ ¢∆Fób6∆73“&V◊Gí◊7FFR#‡¢∆í6∆73“&f◊6ˆ∆ñBf◊7ñÊÊW"f◊7ñ‚#„¬ˆì‡¢«‡¢6'&VvÊFÚ÷FW&ñó2‚‚‡¢¬˜‡¢¬ˆFóc‡¢ †¢&WGW&‡†¢–†¢ñbÇ÷FW&ñó46'&VvF˜2«¬÷FW&ñó2Ê∆VÊwFÇ””“í∞†¢ñbÜW'&Ù6'&Vv÷VÁFÙ÷FW&ñó2í∞†¢÷˜7G&$W'&Ù÷FW&ñó46'&Vv÷VÁFÚÇê†¢&WGW&‡†¢–†¢6'&Vv$÷FW&ñó2Çê†¢&WGW&‡†¢–†¢6ˆÁ7BFWáFÙ'W66–¢Ê˜&÷∆ó¶$'W66Ä¢6◊Ù'W66GV¬Áf«VP¢ê¢ÁG&ñ“Çê†¢6ˆÁ7B∆÷˜Ü&ñfFı6V∆V6ñˆÊFÚ–¢6V∆V7D∆÷˜Ü&ñfFÙGV¬Áf«VP†¢Fóe&W7V«FF˜4GV¬ÊñÊÊW$ÖD‘¬“" †–¢ñbáFWáFÙ'W66Ê∆VÊwFÇ¬"í∞–†–¢&WGW&‡–†–¢––†–¢6ˆÁ7B'W66ÁV÷W&ñ6––¢ıÂ∆B≤BÚÁFW7BáFWáFÙ'W66ê–†–¢∆WB&W7V«FF˜2“µ––†–¢ñbÜ'W66ÁV÷W&ñ6í∞–†–¢&W7V«FF˜2––¢÷FW&ñó2Êfñ«FW"Ü÷FW&ñ¬”‚∞†¢&WGW&‚7G&ñÊrÜ÷FW&ñ¬Ê6ˆFñvÚ«¬""ê¢ÁFÙ∆˜vW$66RÇê¢ÊñÊ6«VFW2áFWáFÙ'W66ê†¢“ê–†–¢––†–¢V«6R∞†¢ñbÜgW6Rí∞†¢G'í∞†¢&W7V«FF˜2–¢gW6P¢Á6V&6ÇáFWáFÙ'W66ê¢Ê÷á&W7V«FFÚ”‚&W7V«FFÚÊóFV“ê†¢–†¢6F6ÇÜW'&ÙgW6Rí∞†¢6ˆÁ6ˆ∆RÁv&‚Ä¢$'W66gW6RÊß2f∆Ü˜R‚W6ÊFÚ'W666ñ◊∆W3¢"¿¢W'&ÙgW6P¢ê†¢&W7V«FF˜2–¢'W66$÷FW&ñó56ñ◊∆W2áFWáFÙ'W66ê†¢–†¢–†¢V«6R∞†¢&W7V«FF˜2–¢'W66$÷FW&ñó56ñ◊∆W2áFWáFÙ'W66ê†¢–†¢–†–¢6ˆÁ7BWÜó7FTFó7ˆÊófVƒÊı6V∆V6ñˆÊFÚ––¢&W7V«FF˜2Á6ˆ÷RÜ÷FW&ñ¬”‚∞–†–¢&WGW&‚Ä–¢÷FW&ñ¬Ê∆÷˜Ü&ñfFÚ””“∆÷˜Ü&ñfFı6V∆V6ñˆÊFÚb`–¢÷FW&ñ¬ÊFó7ˆÊófV¿–¢ê–†–¢“ê–†–¢ñbÜWÜó7FTFó7ˆÊófVƒÊı6V∆V6ñˆÊFÚí∞–†–¢&W7V«FF˜2––¢&W7V«FF˜2Êfñ«FW"Ü÷FW&ñ¬”‚∞–†–¢&WGW&‚÷FW&ñ¬Ê∆÷˜Ü&ñfFÚ””“∆÷˜Ü&ñfFı6V∆V6ñˆÊF–†–¢“ê–†–¢––†–¢&W7V«FF˜2Á6˜'BÇÜ¬"í”‚∞–†–¢6ˆÁ7B&ñ˜&ñFFT––¢ÊFó7ˆÊófV¿–†–¢6ˆÁ7B&ñ˜&ñFFT"––¢"ÊFó7ˆÊófV¿–†–¢ñbá&ñ˜&ñFFTbb&ñ˜&ñFFT"í∞–†–¢&WGW&‚”–†–¢––†–¢ñbÇ&ñ˜&ñFFTbb&ñ˜&ñFFT"í∞–†–¢&WGW&‚–†–¢––†–¢&WGW&‚ –†–¢“ê–†–¢6ˆÁ7B÷FW&ñó5VÊñ6˜2“µ–¢6ˆÁ7B6ÜfW4¶Fñ6ñˆÊF2“ÊWr6WBÇê†¢&W7V«FF˜2Êf˜$V6ÇÜ÷FW&ñ¬”‚∞†¢6ˆÁ7B6ÜfT÷FW&ñ¬–¢ˆ'FW$6ÜfTóFV’6ˆ∆ñ6óF6ÚÜ÷FW&ñ¬ê†¢ñbÄ¢÷FW&ñ¬ÊFó7ˆÊófV¬b`¢6ÜfW4¶Fñ6ñˆÊF2ÊÜ2Ü6ÜfT÷FW&ñ¬ê¢í∞†¢&WGW&‡†¢–†¢6ÜfW4¶Fñ6ñˆÊF2ÊFBÄ¢6ÜfT÷FW&ñ¿¢ê†–¢÷FW&ñó5VÊñ6˜2ÁW6ÇÜ÷FW&ñ¬ê–†–¢“ê–†–¢ñbÄ–¢'W66ÁV÷W&ñ6b`–¢÷FW&ñó5VÊñ6˜2Ê∆VÊwFÇ‚ –¢í∞–†–¢6ˆÁ7BVÊ6ˆÁG&˜TFó7ˆÊófV¬––¢÷FW&ñó5VÊñ6˜2Á6ˆ÷RÜ÷FW&ñ¬”‚∞–†–¢&WGW&‚÷FW&ñ¬ÊFó7ˆÊófV¿–†–¢“ê–†–¢ñbÇVÊ6ˆÁG&˜TFó7ˆÊófV¬í∞–†–¢÷FW&ñó5VÊñ6˜2Á7∆ñ6RÉê–†–¢––†–¢––†–¢ñbÜ÷FW&ñó5VÊñ6˜2Ê∆VÊwFÇ””“í∞–†–¢Fóe&W7V«FF˜4GV¬ÊñÊÊW$ÖD‘¬“ ¢∆Fób6∆73“&V◊Gí◊7FFR#‡¢∆í6∆73“&f◊&VwV∆"f÷f6R÷g&˜v‚#„¬ˆì‡†–¢«‡–¢ÊVÊáV“÷FW&ñ¬VÊ6ˆÁG&FÚ‡–¢¬˜‡–¢¬ˆFóc‡–¢ –†–¢&WGW&‡–†–¢––†–¢÷FW&ñó5VÊñ6˜2Êf˜$V6ÇÜ÷FW&ñ¬”‚∞–†–¢6ˆÁ7BFób––¢Fˆ7V÷VÁBÊ7&VFTV∆V÷VÁBÇ&Fób"ê–†–¢FóbÊ6∆74∆ó7BÊFBÄ–¢'&W7V«FFÚ÷óFV“ –¢ê–†–¢FóbÊ6∆74∆ó7BÊFBÄ–¢÷FW&ñ¬ÊFó7ˆÊófV¿–¢Ú&Fó7ˆÊófV¬ –¢¢&ñÊFó7ˆÊófV¬ –¢ê–†–¢∆WB7FGW5FWáFÚ“" –†–¢ñbÄ–¢÷FW&ñ¬Ê∆÷˜Ü&ñfFÚ””“∆÷˜Ü&ñfFı6V∆V6ñˆÊFÚb`–¢÷FW&ñ¬ÊFó7ˆÊófV¿–¢í∞–†–¢7FGW5FWáFÚ––¢)»RFó7ˆÏ:◊fV¬ÊÚG∂÷FW&ñ¬Ê∆÷˜Ü&ñfF˜÷ –†–¢––†–¢V«6RñbÜ÷FW&ñ¬ÊFó7ˆÊófV¬í∞–†–¢7FGW5FWáFÚ––¢)™˚àÚFó7ˆÏ:◊fV¬ÊÚG∂÷FW&ñ¬Ê∆÷˜Ü&ñfF˜÷ –†–¢––†–¢V«6R∞–†–¢7FGW5FWáFÚ––¢)ÿ¬ñÊFó7ˆÏ:◊fV∆ –†–¢–†¢6ˆÁ7BW7F˜VTF÷ñ‰áF÷¬–¢÷ˆÁF$W7F˜VTF÷ñ‰áF÷¬Ü÷FW&ñ¬ê†¢FóbÊñÊÊW$ÖD‘¬“ ¢∆Fób6∆73“&6ˆFñvÚ#‡–¢<;6FñvÛ¢G∂W66$áF÷¬Ü÷FW&ñ¬Ê6ˆFñvÚó––¢¬ˆFóc‡–†–¢∆Fób6∆73“&FW67&ñ6Ú#‡–¢G∂W66$áF÷¬Ü÷FW&ñ¬ÊFW67&ñ6Úó––¢¬ˆFóc‡–†–¢∆Fób6∆73“'7FGW2#‡¢G∂W66$áF÷¬á7FGW5FWáFÚó–¢¬ˆFóc‡†¢G∂W7F˜VTF÷ñ‰áF÷«–¢ †–¢FóbÊFDWfVÁD∆ó7FVÊW"Ä–¢&6∆ñ6≤"¿–¢Çí”‚'&ó$÷ˆF¬Ü÷FW&ñ¬ê–¢ê–†–¢Fóe&W7V«FF˜4GV¬ÊVÊD6Üñ∆BÜFóbê†¢“ê†ß–†¶ñbÜ6◊Ù'W66í∞†¢µ∞¢&ñÁWB"¿¢&∂WóW"¿¢&6ÜÊvR"¿¢'6V&6Ç"¿¢'7FR ¢“Êf˜$V6ÇÜWfVÁFÚ”‚∞†¢6◊Ù'W66ÊFDWfVÁD∆ó7FVÊW"Ä¢WfVÁFÚ¿¢Çí”‚∞†¢6WEFñ÷V˜WBÄ¢'W66$÷FW&ñó2¿¢ ¢ê†¢–¢ê†¢“ê†ß–†–¶ñbá6V∆V7D∆÷˜Ü&ñfFÚí∞–†–¢6V∆V7D∆÷˜Ü&ñfFÚÊFDWfVÁD∆ó7FVÊW"Ä–¢&6ÜÊvR"¿–¢'W66$÷FW&ñó0–¢ê–†–ß––†–¢ÚÚ””””””””””””””””””””””””––¢ÚÚî‰ï@–¢ÚÚ””””””””””””””””””””””””––†–¶7ñÊ2gVÊ7Fñˆ‚ñÊñ6ñ$∆ñ66ÚÇí∞–†–¢ñbÜ¶ñÊñ6ñFÚí∞–†–¢&WGW&‡–†–¢––†–¢¶ñÊñ6ñFÚ“G'VP–†–¢&W&$W7G'WGW&FV∆2Çê–†–¢6'&Vv$6'&ñÊÜÙ∆ˆ6¬Çê–†–¢vóB6'&Vv$÷FW&ñó2Çê¢ñÊñ6ñ$ˆ'6W'f6Ù÷FW&ñó2Çê†–¢GV∆ó¶$6'&ñÊÜÚÇê–†–¢ñbáFV∆GV¬””“&ñÊñ6ñÚ"í∞–†–¢GV∆ó¶$F6Ü&ˆ&DñÊñ6ñÚÇê–†–¢––†–ß––†–¶7ñÊ2gVÊ7Fñˆ‚ñÊñ6ñ∆ó¶"Çí∞–†–¢6ˆÁ7BW7V&ñÚ––¢ˆ'FW%6W76ıW7V&ñÚÇê–†–¢ñbáW7V&ñÚí∞–†–¢vóB÷˜7G&$∆ñ66ÚáW7V&ñÚê–†–¢vóBñÊñ6ñ$∆ñ66ÚÇê–†–¢––†–¢V«6R∞–†–¢÷˜7G&%FV∆∆ˆvñ‚Çê–†–¢––†–ß––†–¶ñÊñ6ñ∆ó¶"Çê–†