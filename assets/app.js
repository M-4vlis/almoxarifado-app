import {
    loginFirebase,
    logoutFirebase,
    listarMateriaisFirebase,
    salvarSolicitacaoFirebase,
    listarSolicitacoesPorPerfilFirebase,
    buscarResumoAdminFirebase
} from "./firebase.js"

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

const LIMITE_SOLICITACOES =
    20

const CHAVE_CACHE_MATERIAIS =
    "materiaisCacheLocal"

const TEMPO_CACHE_MATERIAIS =
    12 * 60 * 60 * 1000

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
// FORMULÁRIO SOLICITAÇÃO
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
// UTILITÁRIOS
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
// PERSISTÊNCIA LOCAL
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
// NAVEGAÇÃO INFERIOR
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
                <span class="home-label">Visão geral</span>

                <h1>
                    Início
                </h1>

                <p id="homeSaudacao">
                    Acompanhe suas solicitações e atividades recentes.
                </p>
            </div>
        </div>

        <div class="home-grid">
            <div class="home-card destaque">
                <div class="home-card-icon">
                    <i class="fa-solid fa-clipboard-list"></i>
                </div>

                <div>
                    <span>Solicitações</span>
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
                        Consulte disponibilidade por código ou descrição.
                    </span>
                </button>

                <button
                    id="atalhoSolicitacoes"
                    type="button"
                    class="home-action-card"
                >
                    <i class="fa-solid fa-clock-rotate-left"></i>

                    <strong>
                        Ver solicitações
                    </strong>

                    <span>
                        Acompanhe o histórico dos pedidos enviados.
                    </span>
                </button>
            </div>
        </div>

        <div class="home-section">
            <div class="home-section-header">
                <div>
                    <span>Última atividade</span>

                    <h2>
                        Solicitações recentes
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
                        Carregando informações...
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
                <span class="home-label">Histórico</span>

                <h1>
                    Solicitações
                </h1>

                <p>
                    Consulte os pedidos enviados e acompanhe o vínculo com as requisições.
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
                    placeholder="GLPI, material, local ou requisição..."
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
                        Aguardando requisição
                    </option>

                    <option value="requisicao_vinculada">
                        Requisição vinculada
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
                    Carregando solicitações...
                </p>
            </div>
        </div>
    `

    const viewPerfil =
        document.createElement("section")

    viewPerfil.id =
        "viewPerfil"

    viewPerfil.classList.add(
        "app-view",
        "view-perfil",
        "hidden"
    )

    viewPerfil.innerHTML = `
        <div class="perfil-card">
            <div class="perfil-avatar">
                <i class="fa-solid fa-user"></i>
            </div>

            <div>
                <span>
                    Perfil
                </span>

                <h2 id="perfilNome">
                    Usuário
                </h2>

                <p id="perfilMatricula">
                    Matrícula -
                </p>
            </div>
        </div>

        <div class="perfil-info-grid">
            <div class="perfil-info-card">
                <span>Nome</span>
                <strong id="perfilInfoNome">-</strong>
            </div>

            <div class="perfil-info-card">
                <span>Matrícula</span>
                <strong id="perfilInfoMatricula">-</strong>
            </div>

            <div class="perfil-info-card">
                <span>Perfil de acesso</span>
                <strong id="perfilInfoPerfil">-</strong>
            </div>

            <div class="perfil-info-card">
                <span>Status</span>
                <strong id="perfilInfoStatus">Ativo</strong>
            </div>
        </div>

        <button
            id="btnSairPerfil"
            type="button"
            class="btn-sair-perfil"
        >
            <i class="fa-solid fa-right-from-bracket"></i>
            Sair do sistema
        </button>
    `

    appContainer.innerHTML = ""

    appContainer.appendChild(viewInicio)
    appContainer.appendChild(viewBusca)
    appContainer.appendChild(viewSolicitacoes)
    appContainer.appendChild(viewPerfil)

    configurarEventosTelas()

}

function configurarEventosTelas() {

    if (eventosTelasConfigurados) {

        return

    }

    eventosTelasConfigurados =
        true

    const atalhoNovaBusca =
        document.getElementById("atalhoNovaBusca")

    const atalhoSolicitacoes =
        document.getElementById("atalhoSolicitacoes")

    const btnSairPerfil =
        document.getElementById("btnSairPerfil")

    const btnAtualizarSolicitacoes =
        document.getElementById("btnAtualizarSolicitacoes")

    const btnGerarRelatorio =
        document.getElementById("btnGerarRelatorio")

    const btnLimparFiltrosSolicitacoes =
        document.getElementById("btnLimparFiltrosSolicitacoes")

    const homeAtalhoBusca =
        document.getElementById("homeAtalhoBusca")

    const homeAtalhoSolicitacoes =
        document.getElementById("homeAtalhoSolicitacoes")

    if (atalhoNovaBusca) {

        atalhoNovaBusca.addEventListener(
            "click",
            async () => {

                await mostrarTela("busca")

            }
        )

    }

    if (atalhoSolicitacoes) {

        atalhoSolicitacoes.addEventListener(
            "click",
            async () => {

                await mostrarTela("solicitacoes")

            }
        )

    }

    if (btnSairPerfil) {

        btnSairPerfil.addEventListener(
            "click",
            sairDoSistema
        )

    }

    [
        "filtroDataInicio",
        "filtroDataFim",
        "filtroGlpi",
        "filtroMaterial",
        "filtroAlmoxarifado",
        "filtroUsuarioNome",
        "filtroUsuarioMatricula",
        "filtroUsuarioPerfil"
    ].forEach(idFiltro => {

        const campo =
            document.getElementById(idFiltro)

        if (!campo) {

            return

        }

        const evento =
            campo.tagName === "SELECT"
                ? "change"
                : "input"

        campo.addEventListener(
            evento,
            renderizarSolicitacoes
        )

    })

    if (btnLimparFiltrosSolicitacoes) {

        btnLimparFiltrosSolicitacoes.addEventListener(
            "click",
            limparFiltrosSolicitacoes
        )

    }

    if (homeAtalhoBusca) {

        homeAtalhoBusca.addEventListener(
            "click",
            async () => {

                await mostrarTela("busca")

            }
        )

    }

    if (homeAtalhoSolicitacoes) {

        homeAtalhoSolicitacoes.addEventListener(
            "click",
            async () => {

                await mostrarTela("solicitacoes")

            }
        )

    }

    [
        "homeFiltroDataInicio",
        "homeFiltroDataFim",
        "homeFiltroUsuario",
        "homeFiltroGlpi",
        "homeFiltroAlmoxarifado",
        "homeFiltroMaterial"
    ].forEach(idFiltro => {

        const campo =
            document.getElementById(idFiltro)

        if (!campo) {

            return

        }

        const evento =
            campo.tagName === "SELECT"
                ? "change"
                : "input"

        campo.addEventListener(
            evento,
            async () => {

                if (
                    usuarioEhAdmin() &&
                    existemFiltrosDashboardAdminAtivos() &&
                    solicitacoesCarregadas.length === 0
                ) {

                    await carregarSolicitacoesUsuario(false)

                }

                atualizarDashboardInicio()

            }
        )

    })

    if (btnAtualizarSolicitacoes) {

        btnAtualizarSolicitacoes.addEventListener(
            "click",
            async () => {

                await carregarSolicitacoesUsuario(true)

            }
        )

    }

    if (btnGerarRelatorio) {

        btnGerarRelatorio.addEventListener(
            "click",
            gerarRelatorioSolicitacoes
        )

    }

}

// =========================
// TROCA DE TELAS
// =========================

async function mostrarTela(nomeTela) {

    const mapa = {

        inicio:
            "telaInicio",

        busca:
            "telaBusca",

        solicitacoes:
            "telaSolicitacoes",

        perfil:
            "telaPerfil"

    }

    const telaEscolhida =
        mapa[nomeTela]
            ? nomeTela
            : "inicio"

    telaAtual =
        telaEscolhida

    const telas =
        document.querySelectorAll(".app-page")

    telas.forEach(tela => {

        tela.classList.add("hidden")

        tela.classList.remove("active")

    })

    const tela =
        document.getElementById(
            mapa[telaEscolhida]
        )

    if (tela) {

        tela.classList.remove("hidden")

        tela.classList.add("active")

    }

    marcarNavegacaoAtiva(telaEscolhida)

    atualizarCarrinho()

    if (telaEscolhida === "inicio") {

        if (usuarioEhAdmin()) {

            await carregarResumoAdminDashboard()

            if (!resumoAdminDashboard) {

                await carregarSolicitacoesUsuario(false)

            }

        }

        else {

            await carregarSolicitacoesUsuario(false)

        }

        atualizarDashboardInicio()

    }

    if (telaEscolhida === "solicitacoes") {

        await carregarSolicitacoesUsuario(true)

    }

    if (telaEscolhida === "perfil") {

        atualizarTelaPerfil()

    }

}

// =========================
// DASHBOARD INÍCIO
// =========================

function atualizarDashboardInicio() {

    const usuario =
        obterSessaoUsuario()

    const admin =
        usuarioEhAdmin()

    const boasVindas =
        document.getElementById("homeBoasVindas")

    if (boasVindas) {

        boasVindas.innerText =
            admin
                ? `Painel admin, ${usuario?.nome || "usuário"}`
                : `Bem-vindo, ${usuario?.nome || "usuário"}`

    }

    const saudacao =
        document.getElementById("homeSaudacao")

    if (saudacao) {

        saudacao.innerText =
            admin
                ? "Resumo geral das solicitações, custos estimados e principais movimentações."
                : `Olá, ${usuario?.nome || "usuário"}. Acompanhe suas solicitações por aqui.`

    }

    alternarBlocosInicio(admin)

    const listaDashboard =
        admin
            ? obterDadosDashboardAdmin()
            : [...solicitacoesCarregadas]

    renderizarResumoDashboard(
        listaDashboard,
        admin
    )

    if (admin) {

        if (resumoAdminDashboard && !existemFiltrosDashboardAdminAtivos()) {

            renderizarRankingsAdminResumo(resumoAdminDashboard)

        }

        else {

            renderizarRankingsAdmin(listaDashboard)

        }

    }

    else {

        renderizarSolicitacoesRecentes(listaDashboard)

    }

}

function converterValorNumero(valor) {

    if (typeof valor === "string") {

        let texto =
            valor
                .trim()
                .replace("R$", "")
                .replace(/\s/g, "")

        if (texto.includes(",") && texto.includes(".")) {

            if (texto.lastIndexOf(",") > texto.lastIndexOf(".")) {

                texto =
                    texto
                        .replace(/\./g, "")
                        .replace(",", ".")

            }

            else {

                texto =
                    texto.replace(/,/g, "")

            }

        }

        else if (texto.includes(",")) {

            texto =
                texto
                    .replace(/\./g, "")
                    .replace(",", ".")

        }

        valor =
            texto

    }

    const numero =
        Number(valor || 0)

    if (!Number.isFinite(numero)) {

        return 0

    }

    return numero

}

function formatarMoedaTexto(valor) {

    const numero =
        converterValorNumero(valor)

    return numero.toLocaleString(
        "pt-BR",
        {
            style:
                "currency",
            currency:
                "BRL"
        }
    )

}

function obterValorUnitarioNumeroMaterial(material) {

    return converterValorNumero(
        material?.valorUnitarioNumero ||
        material?.valorUnitario
    )

}

function obterValorUnitarioTextoMaterial(material) {

    const valorNumero =
        obterValorUnitarioNumeroMaterial(material)

    return (
        material?.valorUnitario ||
        formatarMoedaTexto(valorNumero)
    )

}

function buscarMaterialPorItem(item) {

    const codigo =
        String(item?.codigo || "").trim()

    const almoxarifado =
        String(item?.almoxarifado || "").trim().toUpperCase()

    if (!codigo) {

        return null

    }

    return materiais.find(material => {

        const mesmoCodigo =
            String(material.codigo || "").trim() === codigo

        const mesmoAlmoxarifado =
            !almoxarifado ||
            String(material.almoxarifado || "").trim().toUpperCase() === almoxarifado

        return mesmoCodigo && mesmoAlmoxarifado

    }) || null

}

function recalcularItemSolicitacao(item) {

    const materialReferencia =
        buscarMaterialPorItem(item)

    const quantidade =
        converterValorNumero(item?.quantidade)

    const valorItem =
        converterValorNumero(
            item?.valorUnitarioNumero ||
            item?.valorUnitario
        )

    const valorReferencia =
        converterValorNumero(
            materialReferencia?.valorUnitarioNumero ||
            materialReferencia?.valorUnitario
        )

    const valorUnitarioNumero =
        valorItem > 0
            ? valorItem
            : valorReferencia

    const valorUnitario =
        valorUnitarioNumero === valorReferencia && materialReferencia?.valorUnitario
            ? materialReferencia.valorUnitario
            : item?.valorUnitario || formatarMoedaTexto(valorUnitarioNumero)


    const valorTotalItem =
        quantidade * valorUnitarioNumero

    item.quantidade =
        quantidade

    item.valorUnitario =
        valorUnitario

    item.valorUnitarioNumero =
        valorUnitarioNumero

    item.valorTotalItem =
        valorTotalItem

    item.subtotal =
        valorTotalItem

    return item

}

function recalcularListaSolicitacao() {

    listaSolicitacao =
        listaSolicitacao.map(item => {

            return recalcularItemSolicitacao(item)

        })

}

function alternarBlocosInicio(admin) {

    const filtrosAdmin =
        document.getElementById("homeFiltrosAdmin")

    const rankingsAdmin =
        document.getElementById("homeAdminRankings")

    const acoesUsuario =
        document.getElementById("homeAcoesUsuario")

    const recentesUsuario =
        document.getElementById("homeSolicitacoesRecentesSecao")

    if (filtrosAdmin) {

        filtrosAdmin.classList.toggle(
            "hidden",
            !admin
        )

    }

    if (rankingsAdmin) {

        rankingsAdmin.classList.toggle(
            "hidden",
            !admin
        )

    }

    if (acoesUsuario) {

        acoesUsuario.classList.toggle(
            "hidden",
            admin
        )

    }

    if (recentesUsuario) {

        recentesUsuario.classList.toggle(
            "hidden",
            admin
        )

    }

}

function solicitacaoEstaVinculada(solicitacao) {

    return (
        solicitacao.statusAtendimento === "requisicao_vinculada" ||
        solicitacao.statusAtendimento === "concluida" ||
        Boolean(solicitacao.numeroRequisicao) ||
        Number(solicitacao.requisicoesVinculadas?.length || 0) > 0
    )

}

function obterResumoDashboard(lista) {

    const totalSolicitacoes =
        lista.length

    const aguardando =
        lista.filter(item => {

            return item.statusAtendimento === "aguardando_requisicao"

        }).length

    const vinculadas =
        lista.filter(solicitacaoEstaVinculada).length

    const totalItens =
        lista.reduce(
            (total, solicitacao) => {

                const totalItensSolicitacao =
                    Number(solicitacao.totalItens || 0)

                if (Number.isFinite(totalItensSolicitacao) && totalItensSolicitacao > 0) {

                    return total + totalItensSolicitacao

                }

                return total + (solicitacao.itens || [])
                    .reduce(
                        (subtotal, item) => {

                            return subtotal + converterValorNumero(item.quantidade)

                        },
                        0
                    )

            },
            0
        )

    const totalEstimado =
        lista.reduce(
            (total, solicitacao) => {

                return total + obterTotalEstimadoSolicitacao(solicitacao)

            },
            0
        )

    const usuariosSolicitantes =
        new Set()

    const glpis =
        new Set()

    const requisicoes =
        new Set()

    const materiaisSolicitados =
        new Map()

    lista.forEach(solicitacao => {

        const chave =
            solicitacao.usuarioUid ||
            solicitacao.usuarioMatricula ||
            solicitacao.usuarioSolicitante?.matricula ||
            solicitacao.usuarioNome

        if (chave) {

            usuariosSolicitantes.add(chave)

        }

        if (solicitacao.glpi) {

            glpis.add(solicitacao.glpi)

        }

        const requisicoesSolicitacao =
            [
                solicitacao.numeroRequisicao,
                ...(solicitacao.requisicoesVinculadas || [])
            ].filter(Boolean)

        requisicoesSolicitacao.forEach(requisicao => {

            requisicoes.add(requisicao)

        })

        ;(solicitacao.itens || []).forEach(item => {

            const chaveMaterial =
                `${item.codigo || "-"} - ${item.descricao || "Material"}`

            const quantidade =
                converterValorNumero(item.quantidade)

            materiaisSolicitados.set(
                chaveMaterial,
                (materiaisSolicitados.get(chaveMaterial) || 0) + quantidade
            )

        })

    })

    const itemMaisSolicitado =
        Array.from(materiaisSolicitados.entries())
            .sort((a, b) => {

                return b[1] - a[1]

            })[0]

    return {
        totalSolicitacoes,
        aguardando,
        vinculadas,
        totalItens,
        totalEstimado,
        totalUsuarios:
            usuariosSolicitantes.size,
        totalGlpis:
            glpis.size,
        totalRequisicoes:
            requisicoes.size,
        ticketMedio:
            totalSolicitacoes > 0
                ? totalEstimado / totalSolicitacoes
                : 0,
        itemMaisSolicitado:
            itemMaisSolicitado
                ? itemMaisSolicitado[0]
                : "Sem item"
    }

}

function criarCardResumoDashboard(opcao) {

    const classeIcone =
        opcao.classeIcone
            ? ` ${opcao.classeIcone}`
            : ""

    const classeCard =
        opcao.destaque
            ? " destaque-dashboard"
            : ""

    const subtitulo =
        opcao.subtitulo
            ? `<small>${escaparHtml(opcao.subtitulo)}</small>`
            : ""

    return `
        <div class="dashboard-card${classeCard}">
            <div class="dashboard-card-icon${classeIcone}">
                <i class="${opcao.icone}"></i>
            </div>

            <div>
                <span>${escaparHtml(opcao.rotulo)}</span>
                <strong>${escaparHtml(opcao.valor)}</strong>
                ${subtitulo}
            </div>
        </div>
    `

}

function renderizarResumoDashboard(dadosDashboard, admin) {

    const container =
        document.getElementById("homeResumoDashboard")

    if (!container) {

        return

    }

    const resumo =
        Array.isArray(dadosDashboard)
            ? obterResumoDashboard(dadosDashboard)
            : {
                totalSolicitacoes:
                    Number(dadosDashboard?.totalSolicitacoes || 0),
                aguardando:
                    Number(dadosDashboard?.aguardando || 0),
                vinculadas:
                    Number(dadosDashboard?.vinculadas || 0),
                totalItens:
                    Number(dadosDashboard?.totalItens || 0),
                totalEstimado:
                    Number(dadosDashboard?.totalEstimado || 0),
                totalUsuarios:
                    Number(dadosDashboard?.totalUsuarios || 0),
                totalGlpis:
                    Number(dadosDashboard?.totalGlpis || 0),
                totalRequisicoes:
                    Number(dadosDashboard?.totalRequisicoes || 0),
                ticketMedio:
                    Number(dadosDashboard?.ticketMedio || 0),
                itemMaisSolicitado:
                    dadosDashboard?.itemMaisSolicitado || "Sem item"
            }

    const cards = [
        {
            rotulo:
                admin ? "Solicitações" : "Minhas solicitações",
            valor:
                resumo.totalSolicitacoes,
            icone:
                "fa-solid fa-clipboard-list",
            subtitulo:
                admin ? "Total no periodo" : "Seu historico",
            destaque:
                true
        },
        {
            rotulo:
                "Aguardando requisição",
            valor:
                resumo.aguardando,
            icone:
                "fa-solid fa-hourglass-half",
            classeIcone:
                "warning",
            subtitulo:
                "Sem requisicao vinculada"
        },
        {
            rotulo:
                "Vinculadas/concluídas",
            valor:
                resumo.vinculadas,
            icone:
                "fa-solid fa-circle-check",
            classeIcone:
                "success",
            subtitulo:
                "Com atendimento avancado"
        },
        {
            rotulo:
                "Total estimado",
            valor:
                formatarMoeda(resumo.totalEstimado) || "R$ 0,00",
            icone:
                "fa-solid fa-coins",
            subtitulo:
                "Baseado nos itens salvos"
        }
    ]

    if (admin) {

        cards.splice(1, 2)

        cards.push(
            {
                rotulo:
                    "Usuários solicitantes",
                valor:
                    resumo.totalUsuarios,
                icone:
                    "fa-solid fa-users"
            },
            {
                rotulo:
                    "Materiais solicitados",
                valor:
                    resumo.totalItens,
                icone:
                    "fa-solid fa-boxes-stacked"
            },
            {
                rotulo:
                    "GLPIs registradas",
                valor:
                    resumo.totalGlpis,
                icone:
                    "fa-solid fa-ticket",
                subtitulo:
                    "Chamados informados"
            },
            {
                rotulo:
                    "Requisicoes vinculadas",
                valor:
                    resumo.totalRequisicoes,
                icone:
                    "fa-solid fa-file-invoice",
                subtitulo:
                    "Numeros preenchidos"
            },
            {
                rotulo:
                    "Ticket medio",
                valor:
                    formatarMoeda(resumo.ticketMedio) || "R$ 0,00",
                icone:
                    "fa-solid fa-chart-line",
                subtitulo:
                    "Por solicitacao"
            },
            {
                rotulo:
                    "Item mais solicitado",
                valor:
                    resumo.itemMaisSolicitado,
                icone:
                    "fa-solid fa-star",
                classeIcone:
                    "success",
                subtitulo:
                    "Por quantidade"
            }
        )

    }

    else {

        cards.push({

            rotulo:
                "Materiais solicitados",
            valor:
                resumo.totalItens,
            icone:
                "fa-solid fa-boxes-stacked",
            subtitulo:
                "Itens do seu historico"

        })

    }

    container.innerHTML =
        cards
            .map(criarCardResumoDashboard)
            .join("")

}

function obterFiltrosDashboardAdmin() {

    return {

        dataInicio:
            document
                .getElementById("homeFiltroDataInicio")
                ?.value || "",

        dataFim:
            document
                .getElementById("homeFiltroDataFim")
                ?.value || "",

        usuario:
            document
                .getElementById("homeFiltroUsuario")
                ?.value
                ?.trim() || "",

        glpi:
            document
                .getElementById("homeFiltroGlpi")
                ?.value
                ?.trim() || "",

        almoxarifado:
            document
                .getElementById("homeFiltroAlmoxarifado")
                ?.value || "",

        material:
            document
                .getElementById("homeFiltroMaterial")
                ?.value
                ?.trim() || ""

    }

}

function existemFiltrosDashboardAdminAtivos() {

    const filtros =
        obterFiltrosDashboardAdmin()

    return Object.values(filtros)
        .some(valor => {

            return Boolean(String(valor || "").trim())

        })

}

function obterDadosDashboardAdmin() {

    if (resumoAdminDashboard && !existemFiltrosDashboardAdminAtivos()) {

        return resumoAdminDashboard

    }

    return obterSolicitacoesDashboardAdmin()

}

async function carregarResumoAdminDashboard() {

    if (!usuarioEhAdmin()) {

        resumoAdminDashboard =
            null

        return

    }

    if (resumoAdminDashboard) {

        return

    }

    try {

        resumoAdminDashboard =
            await buscarResumoAdminFirebase()

    }

    catch (erro) {

        console.warn(
            "Nao foi possivel carregar resumo admin:",
            erro
        )

        resumoAdminDashboard =
            null

    }

}

function obterSolicitacoesDashboardAdmin() {

    const filtros =
        obterFiltrosDashboardAdmin()

    let lista =
        [...solicitacoesCarregadas]

    if (filtros.dataInicio || filtros.dataFim) {

        lista =
            lista.filter(solicitacao => {

                const dataItem =
                    obterDataInputSolicitacao(solicitacao)

                if (!dataItem) {

                    return false

                }

                return (
                    (!filtros.dataInicio || dataItem >= filtros.dataInicio) &&
                    (!filtros.dataFim || dataItem <= filtros.dataFim)
                )

            })

    }

    if (filtros.usuario) {

        lista =
            lista.filter(solicitacao => {

                return textoContem(
                    [
                        solicitacao.usuarioNome,
                        solicitacao.usuarioMatricula,
                        solicitacao.usuarioSolicitante?.nome,
                        solicitacao.usuarioSolicitante?.matricula
                    ].join(" "),
                    filtros.usuario
                )

            })

    }

    if (filtros.glpi) {

        lista =
            lista.filter(solicitacao => {

                return textoContem(
                    solicitacao.glpi,
                    filtros.glpi
                )

            })

    }

    if (filtros.almoxarifado) {

        lista =
            lista.filter(solicitacao => {

                return (solicitacao.itens || [])
                    .some(item => {

                        return item.almoxarifado === filtros.almoxarifado

                    })

            })

    }

    if (filtros.material) {

        lista =
            lista.filter(solicitacao => {

                return (solicitacao.itens || [])
                    .some(item => {

                        return textoContem(
                            `${item.codigo || ""} ${item.descricao || ""}`,
                            filtros.material
                        )

                    })

            })

    }

    return lista

}

function obterNomeUsuarioSolicitacao(solicitacao) {

    return (
        solicitacao.usuarioNome ||
        solicitacao.usuarioSolicitante?.nome ||
        "Não informado"
    )

}

function obterMatriculaUsuarioSolicitacao(solicitacao) {

    return (
        solicitacao.usuarioMatricula ||
        solicitacao.usuarioSolicitante?.matricula ||
        ""
    )

}

function somarRanking(mapa, chave, incremento, detalhe = "") {

    const chaveFinal =
        String(chave || "").trim() || "Não informado"

    if (!mapa.has(chaveFinal)) {

        mapa.set(
            chaveFinal,
            {
                label:
                    chaveFinal,
                detalhe:
                    detalhe,
                quantidade:
                    0,
                total:
                    0
            }
        )

    }

    const item =
        mapa.get(chaveFinal)

    item.quantidade +=
        Number(incremento.quantidade || 0)

    item.total +=
        Number(incremento.total || 0)

    if (detalhe && !item.detalhe) {

        item.detalhe =
            detalhe

    }

}

function obterTopRanking(mapa, campo = "total", limite = 5) {

    return Array.from(mapa.values())
        .sort((a, b) => {

            return Number(b[campo] || 0) - Number(a[campo] || 0)

        })
        .slice(0, limite)

}

function renderizarListaRanking(titulo, icone, itens, tipoValor = "moeda") {

    const maiorValor =
        itens.reduce(
            (maior, item) => {

                const valor =
                    tipoValor === "quantidade"
                        ? Number(item.quantidade || 0)
                        : Number(item.total || 0)

                return Math.max(maior, valor)

            },
            0
        )

    const linhas =
        itens.length > 0
            ? itens
                .map((item, indice) => {

                    const valor =
                        tipoValor === "quantidade"
                            ? `${item.quantidade || 0}`
                            : formatarMoeda(item.total) || "R$ 0,00"

                    const valorBarra =
                        tipoValor === "quantidade"
                            ? Number(item.quantidade || 0)
                            : Number(item.total || 0)

                    const larguraBarra =
                        maiorValor > 0
                            ? Math.max(8, (valorBarra / maiorValor) * 100)
                            : 0

                    return `
                        <li>
                            <div>
                                <span>${indice + 1}. ${escaparHtml(item.label)}</span>
                                <small>${escaparHtml(item.detalhe || "")}</small>
                                <div class="ranking-bar">
                                    <span style="width: ${larguraBarra}%"></span>
                                </div>
                            </div>

                            <strong>${escaparHtml(valor)}</strong>
                        </li>
                    `

                })
                .join("")
            : `
                <li class="ranking-empty">
                    Nenhum dado disponível.
                </li>
            `

    return `
        <div class="ranking-card">
            <div class="ranking-card-header">
                <i class="${icone}"></i>
                <h3>${escaparHtml(titulo)}</h3>
            </div>

            <ul>
                ${linhas}
            </ul>
        </div>
    `

}

function renderizarRankingsAdmin(lista) {

    const container =
        document.getElementById("homeAdminRankings")

    if (!container) {

        return

    }

    const porUsuarioQuantidade =
        new Map()

    const porUsuarioValor =
        new Map()

    const porGlpiValor =
        new Map()

    const porRequisicaoValor =
        new Map()

    const porMaterial =
        new Map()

    const porAlmoxarifado =
        new Map()

    lista.forEach(solicitacao => {

        const total =
            obterTotalEstimadoSolicitacao(solicitacao)

        const nomeUsuario =
            obterNomeUsuarioSolicitacao(solicitacao)

        const matriculaUsuario =
            obterMatriculaUsuarioSolicitacao(solicitacao)

        somarRanking(
            porUsuarioQuantidade,
            `${nomeUsuario}${matriculaUsuario ? ` (${matriculaUsuario})` : ""}`,
            {
                quantidade:
                    1,
                total:
                    total
            }
        )

        somarRanking(
            porUsuarioValor,
            `${nomeUsuario}${matriculaUsuario ? ` (${matriculaUsuario})` : ""}`,
            {
                quantidade:
                    1,
                total:
                    total
            }
        )

        somarRanking(
            porGlpiValor,
            solicitacao.glpi || "Sem GLPI",
            {
                quantidade:
                    1,
                total:
                    total
            },
            `${solicitacao.totalItens || 0} item(ns)`
        )

        const requisicoes =
            [
                solicitacao.numeroRequisicao,
                ...(solicitacao.requisicoesVinculadas || [])
            ]
                .filter(Boolean)
                .filter((valor, indice, listaValores) => {

                    return listaValores.indexOf(valor) === indice

                })

        requisicoes.forEach(requisicao => {

            somarRanking(
                porRequisicaoValor,
                requisicao,
                {
                    quantidade:
                        1,
                    total:
                        total
                },
                `GLPI ${solicitacao.glpi || "-"}`
            )

        })

        const itensSolicitacao =
            solicitacao.itens || []

        itensSolicitacao.forEach(item => {

            const quantidade =
                Number(item.quantidade || 0)

            const subtotal =
                obterValorTotalItemDashboard(item)

            somarRanking(
                porMaterial,
                `${item.codigo || "-"} - ${item.descricao || "Material"}`,
                {
                    quantidade:
                        quantidade,
                    total:
                        subtotal
                },
                item.almoxarifado || ""
            )

            somarRanking(
                porAlmoxarifado,
                item.almoxarifado || "Não informado",
                {
                    quantidade:
                        quantidade,
                    total:
                        subtotal
                }
            )

        })

    })

    const recentesHtml =
        lista
            .slice()
            .sort((a, b) => {

                return (obterDataSolicitacao(b)?.getTime() || 0) -
                    (obterDataSolicitacao(a)?.getTime() || 0)

            })
            .slice(0, 5)
            .map(solicitacao => {

                const total =
                    formatarMoeda(
                        obterTotalEstimadoSolicitacao(solicitacao)
                    ) || "R$ 0,00"

                return `
                    <li>
                        <div>
                            <span>GLPI ${escaparHtml(solicitacao.glpi || "-")}</span>
                            <small>${escaparHtml(obterNomeUsuarioSolicitacao(solicitacao))}</small>
                        </div>

                        <strong>${escaparHtml(total)}</strong>
                    </li>
                `

            })
            .join("") || `
                <li class="ranking-empty">
                    Nenhuma solicitacao recente.
                </li>
            `

    container.innerHTML = `
        <div class="section-header-simple">
            <span>Rankings</span>
            <h2>Principais indicadores</h2>
        </div>

        <div class="ranking-grid">
            ${renderizarListaRanking(
                "Usuários por solicitações",
                "fa-solid fa-users",
                obterTopRanking(porUsuarioQuantidade, "quantidade"),
                "quantidade"
            )}

            ${renderizarListaRanking(
                "Usuários por valor",
                "fa-solid fa-coins",
                obterTopRanking(porUsuarioValor, "total"),
                "moeda"
            )}

            ${renderizarListaRanking(
                "GLPIs por valor",
                "fa-solid fa-ticket",
                obterTopRanking(porGlpiValor, "total"),
                "moeda"
            )}

            ${renderizarListaRanking(
                "Requisições por valor",
                "fa-solid fa-file-invoice",
                obterTopRanking(porRequisicaoValor, "total"),
                "moeda"
            )}

            ${renderizarListaRanking(
                "Materiais solicitados",
                "fa-solid fa-box",
                obterTopRanking(porMaterial, "quantidade"),
                "quantidade"
            )}

            ${renderizarListaRanking(
                "Distribuição por almoxarifado",
                "fa-solid fa-warehouse",
                obterTopRanking(porAlmoxarifado, "quantidade"),
                "quantidade"
            )}

            <div class="ranking-card ranking-card-wide">
                <div class="ranking-card-header">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <h3>Solicitacoes recentes</h3>
                </div>

                <ul>
                    ${recentesHtml}
                </ul>
            </div>
        </div>
    `

}

function renderizarRankingsAdminResumo(resumo) {

    const container =
        document.getElementById("homeAdminRankings")

    if (!container) {

        return

    }

    const recentes =
        Array.isArray(resumo?.recentes)
            ? resumo.recentes
            : []

    const recentesHtml =
        recentes
            .map(solicitacao => {

                const total =
                    formatarMoeda(
                        solicitacao.totalEstimado ||
                        solicitacao.valorTotalEstimado
                    ) || "R$ 0,00"

                return `
                    <li>
                        <div>
                            <span>GLPI ${escaparHtml(solicitacao.glpi || "-")}</span>
                            <small>${escaparHtml(solicitacao.usuarioNome || "Nao informado")}</small>
                        </div>

                        <strong>${escaparHtml(total)}</strong>
                    </li>
                `

            })
            .join("") || `
                <li class="ranking-empty">
                    Nenhuma solicitacao recente.
                </li>
            `

    container.innerHTML = `
        <div class="section-header-simple">
            <span>Rankings</span>
            <h2>Principais indicadores</h2>
        </div>

        <div class="ranking-grid">
            ${renderizarListaRanking(
                "Usuarios por solicitacoes",
                "fa-solid fa-users",
                resumo?.usuariosPorSolicitacoes || [],
                "quantidade"
            )}

            ${renderizarListaRanking(
                "Usuarios por valor",
                "fa-solid fa-coins",
                resumo?.usuariosPorValor || [],
                "moeda"
            )}

            ${renderizarListaRanking(
                "GLPIs por valor",
                "fa-solid fa-ticket",
                resumo?.glpisPorValor || [],
                "moeda"
            )}

            ${renderizarListaRanking(
                "Requisicoes por valor",
                "fa-solid fa-file-invoice",
                resumo?.requisicoesPorValor || [],
                "moeda"
            )}

            ${renderizarListaRanking(
                "Materiais solicitados",
                "fa-solid fa-box",
                resumo?.materiaisPorQuantidade || [],
                "quantidade"
            )}

            ${renderizarListaRanking(
                "Distribuicao por almoxarifado",
                "fa-solid fa-warehouse",
                resumo?.almoxarifadosPorQuantidade || [],
                "quantidade"
            )}

            <div class="ranking-card ranking-card-wide">
                <div class="ranking-card-header">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <h3>Solicitacoes recentes</h3>
                </div>

                <ul>
                    ${recentesHtml}
                </ul>
            </div>
        </div>
    `

}

function renderizarSolicitacoesRecentes(lista = solicitacoesCarregadas) {

    const container =
        document.getElementById("homeSolicitacoesRecentes")

    if (!container) {

        return

    }

    container.innerHTML = ""

    if (lista.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-inbox"></i>

                <p>
                    Nenhuma solicitação encontrada.
                </p>
            </div>
        `

        return

    }

    lista
        .slice(0, 3)
        .forEach(solicitacao => {

            const card =
                document.createElement("button")

            card.type =
                "button"

            card.classList.add(
                "home-recente-card"
            )

            const statusTexto =
                obterTextoStatusAtendimento(
                    solicitacao.statusAtendimento
                )

            const dataTexto =
                solicitacao.criadoEmFormatado ||
                solicitacao.dataLocal ||
                "Data não informada"

            card.innerHTML = `
                <div>
                    <span>
                        ${escaparHtml(dataTexto)}
                    </span>

                    <strong>
                        GLPI ${escaparHtml(solicitacao.glpi)}
                    </strong>

                    <small>
                        ${escaparHtml(statusTexto)}
                    </small>
                </div>

                <i class="fa-solid fa-chevron-right"></i>
            `

            card.addEventListener(
                "click",
                async () => {

                    await mostrarTela("solicitacoes")

                }
            )

            container.appendChild(card)

        })

}

// =========================
// PERFIL
// =========================

function atualizarTelaPerfil() {

    const usuario =
        obterSessaoUsuario()

    if (!usuario) {

        return

    }

    const nome =
        usuario.nome || "Usuário"

    const matricula =
        usuario.matricula || "-"

    const perfil =
        usuario.perfil === "admin"
            ? "Administrador"
            : "Usuário"

    const status =
        usuario.ativo !== false
            ? "Ativo"
            : "Inativo"

    const campos = {

        perfilUsuarioNome:
            nome,

        perfilUsuarioMatricula:
            matricula,

        perfilUsuarioPerfil:
            perfil,

        perfilNome:
            nome,

        perfilMatricula:
            `Matrícula ${matricula}`,

        perfilInfoNome:
            nome,

        perfilInfoMatricula:
            matricula,

        perfilInfoPerfil:
            perfil,

        perfilInfoStatus:
            status

    }

    Object.entries(campos).forEach(([id, valor]) => {

        const elemento =
            document.getElementById(id)

        if (elemento) {

            elemento.innerText =
                valor

        }

    })

}

// =========================
// LOGIN
// =========================

function salvarSessaoUsuario(usuario) {

    const dadosSessao = {

        uid:
            usuario.uid,

        nome:
            usuario.nome,

        matricula:
            String(usuario.matricula || "").trim(),

        email:
            usuario.email || "",

        emailLogin:
            usuario.emailLogin || "",

        perfil:
            usuario.perfil || "usuario",

        ativo:
            usuario.ativo !== false

    }

    localStorage.setItem(
        "usuarioLogado",
        JSON.stringify(dadosSessao)
    )

}

function limparSessaoUsuario() {

    localStorage.removeItem(
        "usuarioLogado"
    )

}

function mostrarTelaLogin() {

    if (telaLogin) {

        telaLogin.classList.remove("hidden")

    }

    if (appContainer) {

        appContainer.classList.add("hidden")

    }

    if (btnCarrinho) {

        btnCarrinho.classList.add("hidden")

    }

    esconderNavegacaoInferior()

}

async function mostrarAplicacao(usuario) {

    if (telaLogin) {

        telaLogin.classList.add("hidden")

    }

    if (appContainer) {

        appContainer.classList.remove("hidden")

    }

    prepararEstruturaTelas()

    criarNavegacaoInferior()

    mostrarNavegacaoInferior()

    await mostrarTela("inicio")

}

async function validarLogin(matriculaDigitada, cpfDigitado) {

    const usuario =
        await loginFirebase(
            matriculaDigitada,
            cpfDigitado
        )

    return usuario

}

if (formLogin) {

    formLogin.addEventListener(
        "submit",
        async (evento) => {

            evento.preventDefault()

            esconderErroLogin()

            const matricula =
                campoLoginMatricula.value

            const cpf =
                campoLoginCpf.value

            if (!matricula || !cpf) {

                mostrarErroLogin(
                    "Informe matrícula e CPF."
                )

                return

            }

            const botaoLogin =
                formLogin.querySelector("button")

            const textoOriginalBotao =
                botaoLogin?.innerHTML

            try {

                if (botaoLogin) {

                    botaoLogin.disabled = true

                    botaoLogin.innerHTML = `
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        Entrando...
                    `

                }

                const usuario =
                    await validarLogin(
                        matricula,
                        cpf
                    )

                salvarSessaoUsuario(usuario)

                await mostrarAplicacao(usuario)

                campoLoginCpf.value = ""

                mostrarToast(
                    `Bem-vindo, ${usuario.nome}!`
                )

                await iniciarAplicacao()

            }

            catch (erro) {

                console.error(
                    "Erro no login:",
                    erro
                )

                mostrarErroLogin(
                    erro.message ||
                    "Matrícula ou CPF inválido."
                )

            }

            finally {

                if (botaoLogin) {

                    botaoLogin.disabled = false

                    if (textoOriginalBotao) {

                        botaoLogin.innerHTML =
                            textoOriginalBotao

                    }

                }

            }

        }
    )

}

// =========================
// LOGOUT
// =========================

async function sairDoSistema() {

    try {

        await logoutFirebase()

    }

    catch (erro) {

        console.error(
            "Erro ao sair do Firebase:",
            erro
        )

    }

    limparSessaoUsuario()

    solicitacoesCarregadas = []

    if (campoBusca) {

        campoBusca.value = ""

    }

    if (divResultados) {

        divResultados.innerHTML = ""

    }

    if (drawerCarrinho) {

        drawerCarrinho.classList.add("hidden")

    }

    if (modal) {

        modal.classList.add("hidden")

    }

    mostrarTelaLogin()

    mostrarToast(
        "Você saiu do sistema"
    )

}

if (btnSair) {

    btnSair.addEventListener(
        "click",
        sairDoSistema
    )

}

// =========================
// CARREGAR MATERIAIS
// =========================

async function carregarMateriaisJsonLocal() {

    const resposta =
        await fetch("data/materiais.json")

    return await resposta.json()

}

function carregarMateriaisCacheLocal() {

    try {

        const cache =
            JSON.parse(
                localStorage.getItem(CHAVE_CACHE_MATERIAIS) || "null"
            )

        if (!cache || !Array.isArray(cache.materiais)) {

            return null

        }

        const cacheAindaValido =
            Date.now() - Number(cache.salvoEm || 0) < TEMPO_CACHE_MATERIAIS

        if (!cacheAindaValido) {

            return null

        }

        return cache.materiais

    }

    catch (erro) {

        localStorage.removeItem(CHAVE_CACHE_MATERIAIS)

        return null

    }

}

function salvarMateriaisCacheLocal(lista) {

    if (!Array.isArray(lista) || lista.length === 0) {

        return

    }

    try {

        localStorage.setItem(
            CHAVE_CACHE_MATERIAIS,
            JSON.stringify({
                salvoEm:
                    Date.now(),
                materiais:
                    lista
            })
        )

    }

    catch (erro) {

        console.warn(
            "Nao foi possivel salvar cache local de materiais:",
            erro
        )

    }

}

function prepararBuscaMateriais() {

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

}

async function carregarMateriais() {

    try {

        if (divLoading) {

            divLoading.classList.remove("hidden")

        }

        materiais =
            carregarMateriaisCacheLocal()

        if (!materiais || materiais.length === 0) {

            materiais =
                await carregarMateriaisJsonLocal()

            salvarMateriaisCacheLocal(materiais)

        }

        console.log(
            "Materiais carregados:",
            materiais.length
        )

        prepararBuscaMateriais()

    }

    catch (erro) {

        console.error(
            "Erro ao carregar materiais do JSON local/cache:",
            erro
        )

        try {

            materiais =
                await listarMateriaisFirebase()

            console.log(
                "Materiais carregados do Firebase:",
                materiais.length
            )

            salvarMateriaisCacheLocal(materiais)

            prepararBuscaMateriais()

        }

        catch (erroFirebase) {

            console.error(
                "Erro ao carregar materiais do Firebase:",
                erroFirebase
            )

        }

    }

    finally {

        if (divLoading) {

            divLoading.classList.add("hidden")

        }

        recalcularListaSolicitacao()
        salvarCarrinhoLocal()

    }

}

// =========================
// IMAGEM MATERIAL
// =========================

function carregarImagemMaterial(codigo) {

    if (!modalImagem) {

        return

    }

    const caminhos = [

        `assets/imagens/${codigo}.jpg`,
        `assets/imagens/${codigo}.png`

    ]

    let indiceAtual = 0

    function tentarProximaImagem() {

        if (
            indiceAtual >= caminhos.length
        ) {

            modalImagem.src =
                "assets/imagens/placeholder.png"

            return

        }

        const imgTeste =
            new Image()

        imgTeste.onload = () => {

            modalImagem.src =
                caminhos[indiceAtual]

        }

        imgTeste.onerror = () => {

            indiceAtual++

            tentarProximaImagem()

        }

        imgTeste.src =
            caminhos[indiceAtual]

    }

    tentarProximaImagem()

}

// =========================
// MODAL MATERIAL
// =========================

function abrirModal(material) {

    materialSelecionado =
        material

    modalCodigo.innerHTML =
        `Código: ${escaparHtml(material.codigo)}`

    modalDescricao.innerHTML =
        escaparHtml(material.descricao)

    if (material.disponivel) {

        modalStatus.innerHTML =
            `✅ Disponível no ${escaparHtml(material.almoxarifado)}`

        btnAdicionarLista.disabled =
            false

        btnAdicionarLista.innerHTML = `
            <i class="fa-solid fa-cart-plus"></i>
            Adicionar à Lista
        `

    }

    else {

        modalStatus.innerHTML =
            `❌ Indisponível`

        btnAdicionarLista.disabled =
            true

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

if (fecharModal) {

    fecharModal.addEventListener(
        "click",
        () => {

            modal.classList.add("hidden")

        }
    )

}

if (modal) {

    modal.addEventListener(
        "click",
        (evento) => {

            if (evento.target === modal) {

                modal.classList.add("hidden")

            }

        }
    )

}

// =========================
// ADICIONAR ITEM
// =========================

if (btnAdicionarLista) {

    btnAdicionarLista.addEventListener(
        "click",
        () => {

            if (!materialSelecionado) {

                return

            }

            btnAdicionarLista.innerHTML = `
                <i class="fa-solid fa-check"></i>
                Adicionado
            `

            const itemExistente =
                listaSolicitacao.find(item => {

                    return item.codigo === materialSelecionado.codigo

                })

            if (itemExistente) {

                itemExistente.quantidade += 1
                recalcularItemSolicitacao(itemExistente)

            }

            else {

                listaSolicitacao.push(
                    recalcularItemSolicitacao({

                        codigo:
                            materialSelecionado.codigo,

                        descricao:
                            materialSelecionado.descricao,

                        almoxarifado:
                            materialSelecionado.almoxarifado,

                        quantidade:
                            1,

                        valorUnitario:
                            obterValorUnitarioTextoMaterial(materialSelecionado),

                        valorUnitarioNumero:
                            obterValorUnitarioNumeroMaterial(materialSelecionado)

                    })
                )

            }

            salvarCarrinhoLocal()

            atualizarCarrinho()

            animarCarrinho()

            mostrarToast(
                "Material adicionado à lista"
            )

            if (campoBusca) {

                campoBusca.value = ""

            }

            if (divResultados) {

                divResultados.innerHTML = ""

            }

            setTimeout(() => {

                modal.classList.add("hidden")

            }, 450)

        }
    )

}

// =========================
// CARRINHO
// =========================

function animarCarrinho() {

    if (!btnCarrinho) {

        return

    }

    btnCarrinho.classList.add(
        "pulse-carrinho"
    )

    setTimeout(() => {

        btnCarrinho.classList.remove(
            "pulse-carrinho"
        )

    }, 450)

}

function atualizarCarrinho() {

    const totalItens =
        listaSolicitacao.reduce(
            (total, item) => {

                return total + Number(item.quantidade || 0)

            },
            0
        )

    if (contadorCarrinho) {

        contadorCarrinho.innerText =
            totalItens

    }

    const usuarioLogado =
        obterSessaoUsuario()

    const appVisivel =
        appContainer &&
        !appContainer.classList.contains("hidden")

    const estaNaTelaBusca =
        telaAtual === "busca"

    if (
        usuarioLogado &&
        appVisivel &&
        estaNaTelaBusca &&
        listaSolicitacao.length > 0
    ) {

        btnCarrinho.classList.remove("hidden")

    }

    else if (btnCarrinho) {

        btnCarrinho.classList.add("hidden")

    }

    renderizarCarrinho()

}

function renderizarCarrinho() {

    if (!listaCarrinho) {

        return

    }

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
                Código: ${escaparHtml(item.codigo)}
            </div>

            <div class="item-carrinho-descricao">
                ${escaparHtml(item.descricao)}
            </div>

            <div class="item-carrinho-footer">
                <div class="controle-quantidade">
                    <button
                        class="btn-qtd"
                        onclick="diminuirQuantidade('${escaparHtml(item.codigo)}')"
                    >
                        -
                    </button>

                    <span>
                        ${escaparHtml(item.quantidade)}
                    </span>

                    <button
                        class="btn-qtd"
                        onclick="aumentarQuantidade('${escaparHtml(item.codigo)}')"
                    >
                        +
                    </button>
                </div>

                <button
                    class="btn-remover"
                    onclick="removerItem('${escaparHtml(item.codigo)}')"
                >
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `

        listaCarrinho.appendChild(div)

    })

}

function aumentarQuantidade(codigo) {

    const item =
        listaSolicitacao.find(item => {

            return item.codigo === codigo

        })

    if (item) {

        item.quantidade += 1
        recalcularItemSolicitacao(item)

    }

    salvarCarrinhoLocal()

    atualizarCarrinho()

}

function diminuirQuantidade(codigo) {

    const item =
        listaSolicitacao.find(item => {

            return item.codigo === codigo

        })

    if (!item) {

        return

    }

    item.quantidade -= 1
    recalcularItemSolicitacao(item)

    if (item.quantidade <= 0) {

        removerItem(codigo)

        return

    }

    salvarCarrinhoLocal()

    atualizarCarrinho()

}

function removerItem(codigo) {

    listaSolicitacao =
        listaSolicitacao.filter(item => {

            return item.codigo !== codigo

        })

    salvarCarrinhoLocal()

    atualizarCarrinho()

}

window.aumentarQuantidade =
    aumentarQuantidade

window.diminuirQuantidade =
    diminuirQuantidade

window.removerItem =
    removerItem

if (btnCarrinho) {

    btnCarrinho.addEventListener(
        "click",
        () => {

            drawerCarrinho.classList.remove("hidden")

        }
    )

}

if (fecharDrawer) {

    fecharDrawer.addEventListener(
        "click",
        () => {

            drawerCarrinho.classList.add("hidden")

        }
    )

}

if (drawerCarrinho) {

    drawerCarrinho.addEventListener(
        "click",
        (evento) => {

            if (evento.target === drawerCarrinho) {

                drawerCarrinho.classList.add("hidden")

            }

        }
    )

}

// =========================
// SOLICITAÇÃO
// =========================

function obterDadosFormularioSolicitacao() {

    const glpi =
        campoGLPI.value.trim()

    const nome =
        campoNome.value.trim()

    const matricula =
        campoMatricula.value.trim()

    const local =
        campoLocal.value.trim()

    if (!glpi) {

        alert("Informe o número GLPI.")

        return null

    }

    if (!nome) {

        alert("Informe o nome de quem irá retirar.")

        return null

    }

    if (!matricula) {

        alert("Informe a matrícula.")

        return null

    }

    if (!local) {

        alert("Informe o local de utilização.")

        return null

    }

    if (listaSolicitacao.length === 0) {

        alert("Adicione materiais à lista.")

        return null

    }

    return {

        glpi:
            glpi,

        nomeRetirada:
            nome,

        matriculaRetirada:
            matricula,

        localUso:
            local

    }

}

function montarDadosSolicitacaoFirebase(dadosFormulario) {

    const usuarioLogado =
        obterSessaoUsuario()

    recalcularListaSolicitacao()

    const itens =
        listaSolicitacao.map(item => {

            const itemCalculado =
                recalcularItemSolicitacao(item)

            return {

                codigo:
                    itemCalculado.codigo,

                descricao:
                    itemCalculado.descricao,

                almoxarifado:
                    itemCalculado.almoxarifado,

                quantidade:
                    itemCalculado.quantidade,

                valorUnitario:
                    itemCalculado.valorUnitario,

                valorUnitarioNumero:
                    itemCalculado.valorUnitarioNumero,

                valorTotalItem:
                    itemCalculado.valorTotalItem,

                subtotal:
                    itemCalculado.subtotal

            }

        })

    const valorTotalEstimado =
        itens.reduce(
            (total, item) => {

                return total + converterValorNumero(
                    item.valorTotalItem ||
                    item.subtotal
                )

            },
            0
        )

    return {

        glpi:
            dadosFormulario.glpi,

        nomeRetirada:
            dadosFormulario.nomeRetirada,

        matriculaRetirada:
            dadosFormulario.matriculaRetirada,

        localUso:
            dadosFormulario.localUso,

        usuarioUid:
            usuarioLogado?.uid || "",

        usuarioNome:
            usuarioLogado?.nome || "Não identificado",

        usuarioMatricula:
            usuarioLogado?.matricula || "Não identificada",

        usuarioPerfil:
            usuarioLogado?.perfil || "usuario",

        usuarioSolicitante: {

            uid:
                usuarioLogado?.uid || "",

            nome:
                usuarioLogado?.nome || "Não identificado",

            matricula:
                usuarioLogado?.matricula || "Não identificada",

            perfil:
                usuarioLogado?.perfil || "usuario"

        },

        itens:
            itens,

        totalItens:
            itens.reduce(
                (total, item) => {

                    return total + Number(item.quantidade || 0)

                },
                0
            ),

        valorTotalEstimado:
            valorTotalEstimado,

        totalEstimado:
            valorTotalEstimado,

        origem:
            "app_web_github_pages",

        statusAtendimento:
            "aguardando_requisicao",

        numeroRequisicao:
            "",

        requisicoesVinculadas:
            [],

        dataLocal:
            obterDataLocalFormatada()

    }

}

function gerarMensagemWhatsapp(
    dadosFormulario,
    idSolicitacaoFirebase
) {

    let mensagem =
        `📦 *SOLICITAÇÃO DE MATERIAL*\n\n`

    mensagem +=
        `🆔 *ID INTERNO:* ${idSolicitacaoFirebase}\n\n`

    mensagem +=
        `🎫 *GLPI:* ${dadosFormulario.glpi}\n\n`

    mensagem +=
        `👤 *RETIRADA:*\n`

    mensagem +=
        `${dadosFormulario.nomeRetirada}\n`

    mensagem +=
        `Matrícula: ${dadosFormulario.matriculaRetirada}\n\n`

    mensagem +=
        `📍 *LOCAL:*\n`

    mensagem +=
        `${dadosFormulario.localUso}\n\n`

    mensagem +=
        `🧾 *MATERIAIS:*\n\n`

    listaSolicitacao.forEach(item => {

        mensagem +=
            `• ${item.quantidade}x ${item.descricao}\n`

        mensagem +=
            `Código: ${item.codigo}\n`

        mensagem +=
            `Almoxarifado: ${item.almoxarifado}\n\n`

    })

    return mensagem

}

function limparDadosAposEnvio() {

    listaSolicitacao = []

    limparCarrinhoLocal()

    atualizarCarrinho()

    campoGLPI.value = ""
    campoNome.value = ""
    campoMatricula.value = ""
    campoLocal.value = ""

    if (drawerCarrinho) {

        drawerCarrinho.classList.add("hidden")

    }

}

if (btnEnviarWhatsapp) {

    btnEnviarWhatsapp.addEventListener(
        "click",
        async () => {

            const dadosFormulario =
                obterDadosFormularioSolicitacao()

            if (!dadosFormulario) {

                return

            }

            const textoOriginal =
                btnEnviarWhatsapp.innerHTML

            try {

                btnEnviarWhatsapp.disabled = true

                btnEnviarWhatsapp.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Salvando...
                `

                const dadosFirebase =
                    montarDadosSolicitacaoFirebase(
                        dadosFormulario
                    )

                const idSolicitacaoFirebase =
                    await salvarSolicitacaoFirebase(
                        dadosFirebase
                    )

                const mensagem =
                    gerarMensagemWhatsapp(
                        dadosFormulario,
                        idSolicitacaoFirebase
                    )

                const texto =
                    encodeURIComponent(mensagem)

                const url =
                    `https://wa.me/?text=${texto}`

                window.open(
                    url,
                    "_blank"
                )

                limparDadosAposEnvio()

                solicitacoesCarregadas = []
                resumoAdminDashboard = null

                mostrarToast(
                    "Solicitação salva e enviada"
                )

                if (telaAtual === "inicio") {

                    if (usuarioEhAdmin()) {

                        await carregarResumoAdminDashboard()

                        if (!resumoAdminDashboard) {

                            await carregarSolicitacoesUsuario(false)

                        }

                    }

                    else {

                        await carregarSolicitacoesUsuario(false)

                    }

                    atualizarDashboardInicio()

                }

            }

            catch (erro) {

                console.error(
                    "Erro ao salvar solicitação:",
                    erro
                )

                alert(
                    "Não foi possível salvar a solicitação. Verifique a conexão e tente novamente."
                )

            }

            finally {

                btnEnviarWhatsapp.disabled = false

                btnEnviarWhatsapp.innerHTML =
                    textoOriginal

            }

        }
    )

}

// =========================
// LISTAR SOLICITAÇÕES
// =========================

function obterContainerSolicitacoes() {

    return (
        document.getElementById("listaSolicitacoesHistorico") ||
        document.getElementById("listaSolicitacoesUsuario")
    )

}

function obterDataSolicitacao(solicitacao) {

    if (solicitacao.criadoEm?.toDate) {

        return solicitacao.criadoEm.toDate()

    }

    const dataLocal =
        solicitacao.dataLocal || ""

    const partes =
        dataLocal.match(/(\d{2})\/(\d{2})\/(\d{4})/)

    if (!partes) {

        return null

    }

    return new Date(
        Number(partes[3]),
        Number(partes[2]) - 1,
        Number(partes[1])
    )

}

function atualizarFiltrosAdminSolicitacoes() {

    const admin =
        usuarioEhAdmin()

    document
        .querySelectorAll(".filtro-admin-solicitacoes")
        .forEach(elemento => {

            elemento.classList.toggle(
                "hidden",
                !admin
            )

        })

    if (!admin) {

        [
            "filtroUsuarioNome",
            "filtroUsuarioMatricula",
            "filtroUsuarioPerfil"
        ].forEach(idFiltro => {

            const campo =
                document.getElementById(idFiltro)

            if (campo) {

                campo.value = ""

            }

        })

    }

    const titulo =
        document.querySelector("#secaoMinhasSolicitacoes .historico-header h2")

    if (titulo) {

        titulo.innerText =
            admin
                ? "Solicitações"
                : "Minhas solicitações"

    }

}

async function carregarSolicitacoesUsuario(renderizarTela, carregarMais = false) {

    const usuario =
        obterSessaoUsuario()

    if (!usuario) {

        return

    }

    atualizarFiltrosAdminSolicitacoes()

    if (carregandoSolicitacoes) {

        return

    }

    carregandoSolicitacoes =
        true

    if (!carregarMais) {

        ultimoDocumentoSolicitacoes =
            null

        existeMaisSolicitacoes =
            false

    }

    if (renderizarTela && !carregarMais) {

        const container =
            obterContainerSolicitacoes()

        if (container) {

            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-spinner fa-spin"></i>

                    <p>
                        Carregando solicitações...
                    </p>
                </div>
            `

        }

    }

    try {

        const resultado =
            await listarSolicitacoesPorPerfilFirebase(
                usuario,
                {
                    limite:
                        LIMITE_SOLICITACOES,
                    cursor:
                        carregarMais
                            ? ultimoDocumentoSolicitacoes
                            : null
                }
            )

        solicitacoesCarregadas =
            carregarMais
                ? [
                    ...solicitacoesCarregadas,
                    ...resultado.solicitacoes
                ]
                : resultado.solicitacoes

        ultimoDocumentoSolicitacoes =
            resultado.ultimoDocumento || null

        existeMaisSolicitacoes =
            resultado.temMais === true

        if (renderizarTela) {

            renderizarSolicitacoes()

        }

    }

    catch (erro) {

        console.error(
            "Erro ao carregar solicitações:",
            erro
        )

        if (renderizarTela) {

            const container =
                obterContainerSolicitacoes()

            if (container) {

                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-triangle-exclamation"></i>

                        <p>
                            Não foi possível carregar as solicitações.
                        </p>
                    </div>
                `

            }

        }

    }

    finally {

        carregandoSolicitacoes =
            false

    }

}

function obterTextoStatusAtendimento(status) {

    const mapa = {

        aguardando_requisicao:
            "Aguardando requisição",

        requisicao_vinculada:
            "Requisição vinculada",

        enviada_whatsapp:
            "Enviada pelo WhatsApp",

        concluida:
            "Concluída",

        cancelada:
            "Cancelada"

    }

    return mapa[status] || "Em acompanhamento"

}

function obterTextoRequisicao(solicitacao) {

    return solicitacao.numeroRequisicao ||
        (
            solicitacao.requisicoesVinculadas &&
                solicitacao.requisicoesVinculadas.length > 0
                ? solicitacao.requisicoesVinculadas.join(", ")
                : "Aguardando"
        )

}

function normalizarBusca(texto) {

    return String(texto || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")

}

function textoContem(valor, filtro) {

    const filtroNormalizado =
        normalizarBusca(filtro)

    if (!filtroNormalizado) {

        return true

    }

    return normalizarBusca(valor)
        .includes(filtroNormalizado)

}

function obterDataInputSolicitacao(solicitacao) {

    const data =
        obterDataSolicitacao(solicitacao)

    if (!data) {

        return ""

    }

    const ano =
        data.getFullYear()

    const mes =
        String(data.getMonth() + 1)
            .padStart(2, "0")

    const dia =
        String(data.getDate())
            .padStart(2, "0")

    return `${ano}-${mes}-${dia}`

}

function obterTotalEstimadoSolicitacao(solicitacao) {

    const valorTotalEstimado =
        converterValorNumero(solicitacao.valorTotalEstimado)

    if (valorTotalEstimado > 0) {

        return valorTotalEstimado

    }

    const totalEstimado =
        converterValorNumero(solicitacao.totalEstimado)

    if (totalEstimado > 0) {

        return totalEstimado

    }

    return (solicitacao.itens || [])
        .reduce(
            (total, item) => {

                return total + obterValorTotalItemDashboard(item)

            },
            0
        )

}

function obterValorTotalItemDashboard(item) {

    const valorTotalItem =
        converterValorNumero(item.valorTotalItem)

    if (valorTotalItem > 0) {

        return valorTotalItem

    }

    const subtotal =
        converterValorNumero(item.subtotal)

    if (subtotal > 0) {

        return subtotal

    }

    const quantidade =
        converterValorNumero(item.quantidade)

    const materialReferencia =
        buscarMaterialPorItem(item)

    const valorItem =
        converterValorNumero(
            item.valorUnitarioNumero ||
            item.valorUnitario
        )

    const valorReferencia =
        converterValorNumero(
            materialReferencia?.valorUnitarioNumero ||
            materialReferencia?.valorUnitario
        )

    const valorUnitario =
        valorItem > 0
            ? valorItem
            : valorReferencia

    return quantidade * valorUnitario

}

function formatarMoeda(valor) {

    const numero =
        Number(valor || 0)

    if (!Number.isFinite(numero) || numero <= 0) {

        return ""

    }

    return numero.toLocaleString(
        "pt-BR",
        {
            style:
                "currency",
            currency:
                "BRL"
        }
    )

}

function obterResumoItens(solicitacao) {

    const itens =
        solicitacao.itens || []

    if (itens.length === 0) {

        return "Sem itens detalhados"

    }

    const primeiroItem =
        itens[0]

    const restante =
        itens.length - 1

    const textoPrimeiro =
        `${primeiroItem.quantidade || 0}x ${primeiroItem.descricao || "Material"}`

    if (restante <= 0) {

        return textoPrimeiro

    }

    return `${textoPrimeiro} + ${restante} item(ns)`

}

function obterTextoRequisicoesVinculadas(solicitacao) {

    const requisicoes =
        solicitacao.requisicoesVinculadas || []

    if (requisicoes.length === 0) {

        return ""

    }

    return requisicoes.join(", ")

}

function obterFiltrosSolicitacoes() {

    return {

        dataInicio:
            document
                .getElementById("filtroDataInicio")
                ?.value || "",

        dataFim:
            document
                .getElementById("filtroDataFim")
                ?.value || "",

        glpi:
            document
                .getElementById("filtroGlpi")
                ?.value
                ?.trim() || "",

        material:
            document
                .getElementById("filtroMaterial")
                ?.value
                ?.trim() || "",

        almoxarifado:
            document
                .getElementById("filtroAlmoxarifado")
                ?.value || "",

        usuarioNome:
            document
                .getElementById("filtroUsuarioNome")
                ?.value
                ?.trim() || "",

        usuarioMatricula:
            document
                .getElementById("filtroUsuarioMatricula")
                ?.value
                ?.trim() || "",

        usuarioPerfil:
            document
                .getElementById("filtroUsuarioPerfil")
                ?.value || ""

    }

}

function obterSolicitacoesFiltradas() {

    const filtros =
        obterFiltrosSolicitacoes()

    let lista =
        [...solicitacoesCarregadas]

    const usuarioAdmin =
        usuarioEhAdmin()

    if (filtros.dataInicio || filtros.dataFim) {

        lista =
            lista.filter(item => {

                const dataItem =
                    obterDataInputSolicitacao(item)

                if (!dataItem) {

                    return false

                }

                return (
                    (!filtros.dataInicio || dataItem >= filtros.dataInicio) &&
                    (!filtros.dataFim || dataItem <= filtros.dataFim)
                )

            })

    }

    if (filtros.glpi) {

        lista =
            lista.filter(item => {

                return textoContem(
                    item.glpi,
                    filtros.glpi
                )

            })

    }

    if (filtros.material) {

        lista =
            lista.filter(item => {

                return (item.itens || [])
                    .some(material => {

                        return textoContem(
                            `${material.codigo || ""} ${material.descricao || ""}`,
                            filtros.material
                        )

                    })

            })

    }

    if (filtros.almoxarifado) {

        lista =
            lista.filter(item => {

                return (item.itens || [])
                    .some(material => {

                        return material.almoxarifado === filtros.almoxarifado

                    })

            })

    }

    if (usuarioAdmin && filtros.usuarioNome) {

        lista =
            lista.filter(item => {

                return textoContem(
                    item.usuarioNome ||
                        item.usuarioSolicitante?.nome,
                    filtros.usuarioNome
                )

            })

    }

    if (usuarioAdmin && filtros.usuarioMatricula) {

        lista =
            lista.filter(item => {

                return textoContem(
                    item.usuarioMatricula ||
                        item.usuarioSolicitante?.matricula,
                    filtros.usuarioMatricula
                )

            })

    }

    if (usuarioAdmin && filtros.usuarioPerfil) {

        lista =
            lista.filter(item => {

                return item.usuarioPerfil === filtros.usuarioPerfil

            })

    }

    return lista

}

function limparFiltrosSolicitacoes() {

    [
        "filtroDataInicio",
        "filtroDataFim",
        "filtroGlpi",
        "filtroMaterial",
        "filtroAlmoxarifado",
        "filtroUsuarioNome",
        "filtroUsuarioMatricula",
        "filtroUsuarioPerfil"
    ].forEach(idFiltro => {

        const campo =
            document.getElementById(idFiltro)

        if (campo) {

            campo.value = ""

        }

    })

    renderizarSolicitacoes()

}

function prepararCampoCsv(valor) {

    const texto =
        String(valor ?? "")
            .replace(/\r?\n/g, " ")
            .trim()

    return `"${texto.replace(/"/g, '""')}"`

}

function baixarArquivoTexto(nomeArquivo, conteudo, tipo) {

    const blob =
        new Blob(
            [conteudo],
            {
                type:
                    tipo
            }
        )

    const url =
        URL.createObjectURL(blob)

    const link =
        document.createElement("a")

    link.href =
        url

    link.download =
        nomeArquivo

    document.body.appendChild(link)

    link.click()

    link.remove()

    setTimeout(
        () => URL.revokeObjectURL(url),
        1000
    )

}

function montarNomeRelatorio() {

    const hoje =
        new Date()

    const data =
        hoje.toISOString().slice(0, 10)

    return `relatorio-solicitacoes-${data}.csv`

}

function gerarRelatorioSolicitacoes() {

    const lista =
        obterSolicitacoesFiltradas()

    if (lista.length === 0) {

        mostrarToast(
            "Nenhuma solicitação para gerar relatório"
        )

        return

    }

    const cabecalho = [
        "Data",
        "GLPI",
        "Status",
        "Requisicao",
        "Solicitante",
        "Matricula solicitante",
        "Retirada por",
        "Matricula retirada",
        "Local de uso",
        "Total itens",
        "Total estimado",
        "Codigo material",
        "Descricao material",
        "Almoxarifado",
        "Quantidade",
        "Valor unitario",
        "Subtotal"
    ]

    const linhas = []

    lista.forEach(solicitacao => {

        const itens =
            solicitacao.itens?.length
                ? solicitacao.itens
                : [{}]

        itens.forEach(item => {

            linhas.push([
                solicitacao.criadoEmFormatado ||
                    solicitacao.dataLocal ||
                    "",
                solicitacao.glpi || "",
                obterTextoStatusAtendimento(
                    solicitacao.statusAtendimento
                ),
                obterTextoRequisicao(solicitacao),
                solicitacao.usuarioNome ||
                    solicitacao.usuarioSolicitante?.nome ||
                    "",
                solicitacao.usuarioMatricula || "",
                solicitacao.nomeRetirada || "",
                solicitacao.matriculaRetirada || "",
                solicitacao.localUso || "",
                solicitacao.totalItens || "",
                obterTotalEstimadoSolicitacao(solicitacao) || "",
                item.codigo || "",
                item.descricao || "",
                item.almoxarifado || "",
                item.quantidade || "",
                item.valorUnitario || "",
                obterValorTotalItemDashboard(item) || ""
            ])

        })

    })

    const conteudo =
        "\uFEFF" +
        [
            cabecalho,
            ...linhas
        ]
            .map(linha => {

                return linha
                    .map(prepararCampoCsv)
                    .join(";")

            })
            .join("\n")

    baixarArquivoTexto(
        montarNomeRelatorio(),
        conteudo,
        "text/csv;charset=utf-8"
    )

    mostrarToast(
        "Relatório gerado"
    )

}

function renderizarSolicitacoes() {

    const container =
        obterContainerSolicitacoes()

    if (!container) {

        return

    }

    const lista =
        obterSolicitacoesFiltradas()

    container.innerHTML = ""

    if (lista.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-inbox"></i>

                <p>
                    Nenhuma solicitação encontrada.
                </p>
            </div>
        `

        return

    }

    lista.forEach(solicitacao => {

        const card =
            document.createElement("div")

        card.classList.add(
            "solicitacao-card"
        )

        const statusTexto =
            obterTextoStatusAtendimento(
                solicitacao.statusAtendimento
            )

        const dataTexto =
            solicitacao.criadoEmFormatado ||
            solicitacao.dataLocal ||
            "Data não informada"

        const requisicaoTexto =
            obterTextoRequisicao(solicitacao)

        const requisicoesVinculadasTexto =
            obterTextoRequisicoesVinculadas(solicitacao)

        const totalEstimado =
            obterTotalEstimadoSolicitacao(solicitacao)

        const totalEstimadoTexto =
            formatarMoeda(totalEstimado) || "Não informado"

        const statusClasse =
            (
                solicitacao.statusAtendimento === "requisicao_vinculada" ||
                solicitacao.statusAtendimento === "concluida"
            )
                ? "vinculada"
                : ""

        const adminInfoHtml =
            usuarioEhAdmin()
                ? `
                    <div>
                        <span>Solicitante</span>
                        <strong>${escaparHtml(solicitacao.usuarioNome || solicitacao.usuarioSolicitante?.nome || "Não informado")}</strong>
                    </div>

                    <div>
                        <span>Matrícula solicitante</span>
                        <strong>${escaparHtml(solicitacao.usuarioMatricula || solicitacao.usuarioSolicitante?.matricula || "Não informada")}</strong>
                    </div>
                `
                : ""

        const itens =
            solicitacao.itens || []

        const itensResumoHtml =
            itens
                .slice(0, 2)
                .map(item => {

                    return `
                        <li>
                            <strong>
                                ${escaparHtml(item.quantidade || 0)}x
                            </strong>

                            ${escaparHtml(item.descricao || "Material")}

                            <small>
                                Código: ${escaparHtml(item.codigo)} · ${escaparHtml(item.almoxarifado)}
                            </small>
                        </li>
                    `

                })
                .join("")

        const itensHtml =
            itens
                .map(item => {

                    const subtotalTexto =
                        formatarMoeda(
                            obterValorTotalItemDashboard(item)
                        ) || ""

                    return `
                        <li>
                            <strong>
                                ${escaparHtml(item.quantidade || 0)}x
                            </strong>

                            ${escaparHtml(item.descricao || "Material")}

                            <small>
                                Código: ${escaparHtml(item.codigo)} · ${escaparHtml(item.almoxarifado)}
                                ${subtotalTexto ? ` · ${escaparHtml(subtotalTexto)}` : ""}
                            </small>
                        </li>
                    `

                })
                .join("")

        card.innerHTML = `
            <div class="solicitacao-card-topo">
                <div>
                    <span>
                        ${escaparHtml(dataTexto)}
                    </span>

                    <h3>
                        GLPI ${escaparHtml(solicitacao.glpi)}
                    </h3>
                </div>

                <span class="solicitacao-status ${statusClasse}">
                    ${escaparHtml(statusTexto)}
                </span>
            </div>

            <div class="solicitacao-resumo">
                ${escaparHtml(obterResumoItens(solicitacao))}
            </div>

            <div class="solicitacao-info-grid">
                <div>
                    <span>Requisição</span>
                    <strong>${escaparHtml(requisicaoTexto)}</strong>
                </div>

                <div>
                    <span>Requisições vinculadas</span>
                    <strong>${escaparHtml(requisicoesVinculadasTexto || "Nenhuma")}</strong>
                </div>

                <div>
                    <span>Local</span>
                    <strong>${escaparHtml(solicitacao.localUso || "Não informado")}</strong>
                </div>

                <div>
                    <span>Retirada</span>
                    <strong>${escaparHtml(solicitacao.nomeRetirada || "Não informado")}</strong>
                </div>

                <div>
                    <span>Matrícula</span>
                    <strong>${escaparHtml(solicitacao.matriculaRetirada || "Não informada")}</strong>
                </div>

                <div>
                    <span>Total de itens</span>
                    <strong>${escaparHtml(solicitacao.totalItens || 0)}</strong>
                </div>

                <div>
                    <span>Total estimado</span>
                    <strong>${escaparHtml(totalEstimadoTexto)}</strong>
                </div>

                ${adminInfoHtml}
            </div>

            <div class="solicitacao-itens">
                <span>
                    Materiais
                </span>

                <ul>
                    ${itensResumoHtml || "<li>Nenhum item detalhado.</li>"}
                </ul>

                ${
                    itens.length > 2
                        ? `
                            <details class="solicitacao-detalhes">
                                <summary>
                                    Ver todos os itens (${itens.length})
                                </summary>

                                <ul>
                                    ${itensHtml}
                                </ul>
                            </details>
                        `
                        : ""
                }
            </div>
        `

        container.appendChild(card)

    })

    if (existeMaisSolicitacoes) {

        const botaoMais =
            document.createElement("button")

        botaoMais.type =
            "button"

        botaoMais.className =
            "btn-carregar-mais"

        botaoMais.innerHTML = `
            <i class="fa-solid fa-chevron-down"></i>
            <span>Carregar mais</span>
        `

        botaoMais.addEventListener(
            "click",
            async () => {

                botaoMais.disabled =
                    true

                botaoMais.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Carregando...</span>
                `

                await carregarSolicitacoesUsuario(
                    true,
                    true
                )

            }
        )

        container.appendChild(botaoMais)

    }

}

// =========================
// BUSCA DE MATERIAIS
// =========================

function buscarMateriais() {

    if (!fuse) {

        return

    }

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

    const buscaNumerica =
        /^\d+$/.test(textoBusca)

    let resultados = []

    if (buscaNumerica) {

        resultados =
            materiais.filter(material => {

                return material.codigo
                    .toLowerCase()
                    .includes(textoBusca)

            })

    }

    else {

        resultados =
            fuse
                .search(textoBusca)
                .map(resultado => resultado.item)

    }

    const existeDisponivelNoSelecionado =
        resultados.some(material => {

            return (
                material.almoxarifado === almoxarifadoSelecionado &&
                material.disponivel
            )

        })

    if (existeDisponivelNoSelecionado) {

        resultados =
            resultados.filter(material => {

                return material.almoxarifado === almoxarifadoSelecionado

            })

    }

    resultados.sort((a, b) => {

        const prioridadeA =
            a.disponivel

        const prioridadeB =
            b.disponivel

        if (prioridadeA && !prioridadeB) {

            return -1

        }

        if (!prioridadeA && prioridadeB) {

            return 1

        }

        return 0

    })

    const materiaisUnicos = []
    const codigosJaAdicionados = new Set()

    resultados.forEach(material => {

        if (
            !material.disponivel &&
            codigosJaAdicionados.has(material.codigo)
        ) {

            return

        }

        codigosJaAdicionados.add(
            material.codigo
        )

        materiaisUnicos.push(material)

    })

    if (
        buscaNumerica &&
        materiaisUnicos.length > 0
    ) {

        const encontrouDisponivel =
            materiaisUnicos.some(material => {

                return material.disponivel

            })

        if (!encontrouDisponivel) {

            materiaisUnicos.splice(1)

        }

    }

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
            material.almoxarifado === almoxarifadoSelecionado &&
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
                Código: ${escaparHtml(material.codigo)}
            </div>

            <div class="descricao">
                ${escaparHtml(material.descricao)}
            </div>

            <div class="status">
                ${escaparHtml(statusTexto)}
            </div>
        `

        div.addEventListener(
            "click",
            () => abrirModal(material)
        )

        divResultados.appendChild(div)

    })

}

if (campoBusca) {

    campoBusca.addEventListener(
        "input",
        buscarMateriais
    )

}

if (selectAlmoxarifado) {

    selectAlmoxarifado.addEventListener(
        "change",
        buscarMateriais
    )

}

// =========================
// INIT
// =========================

async function iniciarAplicacao() {

    if (appJaIniciado) {

        return

    }

    appJaIniciado = true

    prepararEstruturaTelas()

    carregarCarrinhoLocal()

    await carregarMateriais()

    atualizarCarrinho()

    if (telaAtual === "inicio") {

        atualizarDashboardInicio()

    }

}

async function inicializar() {

    const usuario =
        obterSessaoUsuario()

    if (usuario) {

        await mostrarAplicacao(usuario)

        await iniciarAplicacao()

    }

    else {

        mostrarTelaLogin()

    }

}

inicializar()
