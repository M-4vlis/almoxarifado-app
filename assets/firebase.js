// =========================
// FIREBASE CONFIG
// =========================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"

import {
    getFirestore,
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"

// =========================
// CONFIGURAÇÃO DO PROJETO
// =========================

const firebaseConfig = {

    apiKey:
        "AIzaSyAca8VnUpDhF-Ea8j2mmthwakrgv7-Hw-8",

    authDomain:
        "almoxarifado-inteligente-6881c.firebaseapp.com",

    projectId:
        "almoxarifado-inteligente-6881c",

    storageBucket:
        "almoxarifado-inteligente-6881c.firebasestorage.app",

    messagingSenderId:
        "714608661076",

    appId:
        "1:714608661076:web:fd12e71b6534499a6853c1"

}

// =========================
// INICIALIZA FIREBASE
// =========================

const app =
    initializeApp(firebaseConfig)

const db =
    getFirestore(app)

const auth =
    getAuth(app)

const MATERIAIS_API_BASE_URL =
    "https://materiais.163-176-228-150.sslip.io"

const cacheValoresMateriais =
    new Map()

// =========================
// TRATAR MATRÍCULA
// =========================

function tratarMatricula(matricula) {

    return String(matricula || "")
        .trim()

}

// =========================
// TRATAR CPF
// =========================

function tratarCpf(cpf) {

    return String(cpf || "")
        .replace(/\D/g, "")
        .trim()

}

// =========================
// MONTAR E-MAIL DE LOGIN
// =========================

function montarEmailLogin(matricula) {

    const matriculaTratada =
        tratarMatricula(matricula)

    return `${matriculaTratada}@almox.local`

}

// =========================
// NORMALIZAR PERFIL
// =========================

function normalizarPerfil(perfil) {

    const perfilTratado =
        String(perfil || "")
            .trim()
            .toLowerCase()

    if (
        perfilTratado === "admin" ||
        perfilTratado === "usuario"
    ) {

        return perfilTratado

    }

    return "usuario"

}

// =========================
// TRATAR VALOR NUMERICO
// =========================

function normalizarNumeroMonetario(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return 0

    }

    if (typeof valor === "string") {

        let texto =
            valor
                .trim()
                .replace("R$", "")
                .replace("r$", "")
                .replace(/\s/g, "")

        if (
            texto === "" ||
            texto === "-" ||
            texto.toLowerCase() === "nan" ||
            texto.toLowerCase() === "null" ||
            texto.toLowerCase() === "none"
        ) {

            return 0

        }

        texto =
            texto.replace(/[^0-9,.-]/g, "")

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

        else if ((texto.match(/\./g) || []).length > 1) {

            texto =
                texto.replace(/\./g, "")

        }

        else if (texto.includes(".")) {

            const partes =
                texto.split(".")

            if (
                partes[partes.length - 1].length === 3 &&
                partes[0].length <= 3
            ) {

                texto =
                    texto.replace(/\./g, "")

            }

        }

        valor =
            texto

    }

    const numero =
        Number(valor)

    if (!Number.isFinite(numero)) {

        return 0

    }

    return numero

}

function tratarNumero(valor) {

    return normalizarNumeroMonetario(valor)

}

function formatarMoedaFirebase(valor) {

    const numero =
        normalizarNumeroMonetario(valor)

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

// =========================
// NORMALIZAR ID DE MATERIAL
// =========================

function normalizarIdMaterial(valor) {

    return String(valor || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")

}

// =========================
// BUSCAR USUÁRIO NO FIRESTORE
// =========================

async function buscarUsuarioFirebase(uid) {

    const referenciaUsuario =
        doc(db, "usuarios", uid)

    const snapshotUsuario =
        await getDoc(referenciaUsuario)

    if (!snapshotUsuario.exists()) {

        throw new Error(
            "Usuário autenticado, mas não encontrado no banco de dados."
        )

    }

    const dadosUsuario =
        snapshotUsuario.data()

    return {

        id:
            snapshotUsuario.id,

        uid:
            uid,

        nome:
            dadosUsuario.nome || "",

        matricula:
            dadosUsuario.matricula || "",

        cpf:
            dadosUsuario.cpf || "",

        emailLogin:
            dadosUsuario.emailLogin || "",

        perfil:
            normalizarPerfil(
                dadosUsuario.perfil
            ),

        ativo:
            dadosUsuario.ativo !== false

    }

}

// =========================
// LOGIN
// =========================

async function loginFirebase(matricula, cpf) {

    const emailLogin =
        montarEmailLogin(matricula)

    const senha =
        tratarCpf(cpf)

    const credencial =
        await signInWithEmailAndPassword(
            auth,
            emailLogin,
            senha
        )

    const usuarioAuth =
        credencial.user

    const usuarioFirestore =
        await buscarUsuarioFirebase(
            usuarioAuth.uid
        )

    if (!usuarioFirestore.ativo) {

        await signOut(auth)

        throw new Error(
            "Usuário inativo. Procure o responsável pelo sistema."
        )

    }

    return {

        uid:
            usuarioAuth.uid,

        email:
            usuarioAuth.email,

        nome:
            usuarioFirestore.nome,

        matricula:
            usuarioFirestore.matricula,

        cpf:
            usuarioFirestore.cpf,

        emailLogin:
            usuarioFirestore.emailLogin || emailLogin,

        perfil:
            usuarioFirestore.perfil,

        ativo:
            usuarioFirestore.ativo

    }

}

// =========================
// OBSERVAR USUÁRIO LOGADO
// =========================

function observarUsuarioLogado(callback) {

    return onAuthStateChanged(
        auth,
        async (usuarioAuth) => {

            if (!usuarioAuth) {

                callback(null)

                return

            }

            try {

                const usuarioFirestore =
                    await buscarUsuarioFirebase(
                        usuarioAuth.uid
                    )

                if (!usuarioFirestore.ativo) {

                    await signOut(auth)

                    callback(null)

                    return

                }

                callback({

                    uid:
                        usuarioAuth.uid,

                    email:
                        usuarioAuth.email,

                    nome:
                        usuarioFirestore.nome,

                    matricula:
                        usuarioFirestore.matricula,

                    cpf:
                        usuarioFirestore.cpf,

                    emailLogin:
                        usuarioFirestore.emailLogin,

                    perfil:
                        usuarioFirestore.perfil,

                    ativo:
                        usuarioFirestore.ativo

                })

            }

            catch (erro) {

                console.error(
                    "Erro ao verificar usuário logado:",
                    erro
                )

                callback(null)

            }

        }
    )

}

// =========================
// LOGOUT
// =========================

async function logoutFirebase() {

    await signOut(auth)

}

// =========================
// BUSCAR VALOR DO MATERIAL
// =========================

async function buscarValorUnitarioMaterial(item) {

    const valorInformado =
        tratarNumero(
            item?.valorUnitarioNumero ||
            item?.valorUnitario
        )

    if (valorInformado > 0) {

        return {
            valorUnitario:
                item?.valorUnitario ||
                formatarMoedaFirebase(valorInformado),
            valorUnitarioNumero:
                valorInformado
        }

    }

    const codigo =
        String(item?.codigo || "")
            .trim()

    const almoxarifado =
        String(item?.almoxarifado || "")
            .trim()

    if (!codigo || !almoxarifado) {

        return {
            valorUnitario:
                formatarMoedaFirebase(0),
            valorUnitarioNumero:
                0
        }

    }

    const idMaterial =
        `${codigo}_${normalizarIdMaterial(almoxarifado)}`

    if (cacheValoresMateriais.has(idMaterial)) {

        return cacheValoresMateriais.get(idMaterial)

    }

    try {

        const referenciaMaterial =
            doc(db, "materiais", idMaterial)

        const snapshotMaterial =
            await getDoc(referenciaMaterial)

        if (!snapshotMaterial.exists()) {

            const valorVazio = {
                valorUnitario:
                    formatarMoedaFirebase(0),
                valorUnitarioNumero:
                    0
            }

            cacheValoresMateriais.set(
                idMaterial,
                valorVazio
            )

            return valorVazio

        }

        const dadosMaterial =
            snapshotMaterial.data()

        const valorUnitarioNumero =
            tratarNumero(
                dadosMaterial.valorUnitarioNumero ||
                dadosMaterial.valorUnitario
            )

        const valorMaterial = {
            valorUnitario:
                dadosMaterial.valorUnitario ||
                formatarMoedaFirebase(valorUnitarioNumero),
            valorUnitarioNumero:
                valorUnitarioNumero
        }

        cacheValoresMateriais.set(
            idMaterial,
            valorMaterial
        )

        return valorMaterial

    }

    catch (erro) {

        console.warn(
            "Nao foi possivel buscar valor unitario do material:",
            erro
        )

        return {
            valorUnitario:
                formatarMoedaFirebase(0),
            valorUnitarioNumero:
                0
        }

    }

}

// =========================
// PREPARAR ITENS DA SOLICITACAO
// =========================

async function prepararItensSolicitacao(dadosSolicitacao) {

    const itensOriginais =
        Array.isArray(dadosSolicitacao.itens)
            ? dadosSolicitacao.itens
            : []

    const itens =
        await Promise.all(
            itensOriginais.map(async (item) => {

                const quantidade =
                    tratarNumero(item.quantidade)

                const valorMaterial =
                    await buscarValorUnitarioMaterial(item)

                const subtotal =
                    calcularSubtotalItem({
                        quantidade:
                            quantidade,
                        valorUnitarioNumero:
                            valorMaterial.valorUnitarioNumero
                    })

                return {

                    ...item,

                    quantidade:
                        quantidade,

                    valorUnitario:
                        valorMaterial.valorUnitario,

                    valorUnitarioNumero:
                        valorMaterial.valorUnitarioNumero,

                    valorTotalItem:
                        subtotal,

                    valorTotal:
                        subtotal,

                    subtotal:
                        subtotal

                }

            })
        )

    return itens

}

// =========================
// SALVAR SOLICITAÇÃO
// =========================

async function salvarSolicitacaoFirebase(dadosSolicitacao) {

    const referencia =
        collection(db, "solicitacoes")

    const itens =
        await prepararItensSolicitacao(
            dadosSolicitacao
        )

    const valorTotal =
        calcularTotalSolicitacao({
            itens:
                itens
        })

    const totalItens =
        itens.reduce(
            (total, item) => {

                return total + normalizarNumeroMonetario(
                    item.quantidade
                )

            },
            0
        )

    const documento =
        await addDoc(referencia, {

            ...dadosSolicitacao,

            itens:
                itens,

            totalItens:
                totalItens,

            valorTotal:
                valorTotal,

            totalEstimado:
                valorTotal,

            valorTotalEstimado:
                valorTotal,

            criadoEm:
                serverTimestamp(),

            status:
                "enviada_whatsapp",

            statusAtendimento:
                dadosSolicitacao.statusAtendimento ||
                "aguardando_requisicao"

        })

    return documento.id

}

// =========================
// FORMATAR DATA FIREBASE
// =========================

function formatarDataFirebase(timestamp) {

    if (!timestamp) {

        return ""

    }

    try {

        const data =
            timestamp.toDate()

        return data.toLocaleString(
            "pt-BR",
            {
                dateStyle: "short",
                timeStyle: "short"
            }
        )

  �mm�G����ƭy�     )

    return {

        id:
            documento.id,

        glpi:
            dados.glpi || "",

        localUso:
            dados.localUso || "",

        nomeRetirada:
            dados.nomeRetirada || "",

        matriculaRetirada:
            dados.matriculaRetirada || "",

        itens:
            itens,

        totalItens:
            dados.totalItens || 0,

        totalEstimado:
            valorTotal,

        valorTotal:
            valorTotal,

        valorTotalEstimado:
            valorTotal,

        usuarioUid:
            dados.usuarioUid || "",

        usuarioNome:
            dados.usuarioNome || "",

        usuarioMatricula:
            dados.usuarioMatricula || "",

        usuarioPerfil:
            normalizarPerfil(
                dados.usuarioPerfil
            ),

        usuarioSolicitante:
            dados.usuarioSolicitante || null,

        status:
            dados.status || "",

        statusAtendimento:
            dados.statusAtendimento ||
            "aguardando_requisicao",

        numeroRequisicao:
            dados.numeroRequisicao || "",

        requisicoesVinculadas:
            dados.requisicoesVinculadas || [],

        origem:
            dados.origem || "",

        dataLocal:
            dados.dataLocal || "",

        criadoEm:
            dados.criadoEm || null,

        criadoEmFormatado:
            formatarDataFirebase(
                dados.criadoEm
            )

    }

}

// =========================
// LISTAR MATERIAIS
// =========================

function observarVersaoMateriaisFirebase(aoAtualizar, aoFalhar) {

    const referencia =
        doc(
            db,
            "configuracoes",
            "materiais"
        )

    return onSnapshot(
        referencia,
        snapshot => {

            if (!snapshot.exists()) {

                aoAtualizar?.({
                    updateId: "",
                    atualizadoEm: "",
                    totalAtivos: 0
                })
                return

            }

            const dados =
                snapshot.data() || {}

            const atualizadoEm =
                dados.atualizadoEm

            aoAtualizar?.({
                updateId:
                    dados.updateId || "",
                atualizadoEm:
                    atualizadoEm?.toMillis?.() ||
                    atualizadoEm?.seconds ||
                    "",
                totalAtivos:
                    Number(dados.totalAtivos || 0)
            })

        },
        erro => {

            aoFalhar?.(erro)

        }
    )

}

async function requisitarMateriaisVps(caminho, renovarToken = false) {

    const usuario =
        auth.currentUser

    if (!usuario) {

        throw new Error(
            "Faça login novamente para carregar os materiais."
        )

    }

    const token =
        await usuario.getIdToken(renovarToken)

    const resposta =
        await fetch(
            `${MATERIAIS_API_BASE_URL}${caminho}`,
            {
                method:
                    "GET",
                cache:
                    "no-cache",
                headers:
                    {
                        Authorization:
                            `Bearer ${token}`
                    }
            }
        )

    if (
        resposta.status === 401 &&
        !renovarToken
    ) {

        return requisitarMateriaisVps(
            caminho,
            true
        )

    }

    if (!resposta.ok) {

        let detalhe = ""

        try {

            const erro =
                await resposta.json()

            detalhe =
                erro?.detail || ""

        }

        catch (erroLeitura) {

            detalhe = ""

        }

        throw new Error(
            detalhe ||
            `A API de materiais respondeu com status ${resposta.status}.`
        )

    }

    const payload =
        await resposta.json()

    if (!Array.isArray(payload?.materials)) {

        throw new Error(
            "A API de materiais retornou um formato inválido."
        )

    }

    return payload.materials

}

async function listarMateriaisVps(incluirEstoqueAdmin = false) {

    if (incluirEstoqueAdmin) {

        try {

            return await requisitarMateriaisVps(
                "/v1/app/admin/materials"
            )

        }

        catch (erroAdmin) {

            console.warn(
                "Detalhes administrativos indisponíveis. Carregando catálogo comum:",
                erroAdmin
            )

        }

    }

    return await requisitarMateriaisVps(
        "/v1/app/materials"
    )

}

// =========================
// LISTAR MINHAS SOLICITAÇÕES
// =========================

function obterDadosUsuarioConsulta(usuarioOuUid) {

    if (typeof usuarioOuUid === "string") {

        return {
            uid:
                tratarMatricula(usuarioOuUid),
            matricula:
                ""
        }

    }

    return {
        uid:
            tratarMatricula(usuarioOuUid?.uid),
        matricula:
            tratarMatricula(usuarioOuUid?.matricula)
    }

}

async function executarConsultaSolicitacoes(filtrosBase, opcoes = {}) {

    const limite =
        Number(opcoes.limite || 20)

    const limiteConsulta =
        opcoes.ordenar === false
            ? Math.max(limite, 100)
            : limite

    const cursor =
        opcoes.cursor || null

    const referencia =
        collection(db, "solicitacoes")

    const filtros = [
        ...filtrosBase
    ]

    if (opcoes.ordenar !== false) {

        filtros.push(
            orderBy(
                "criadoEm",
                "desc"
            )
        )

    }

    if (cursor && opcoes.ordenar !== false) {

        filtros.push(
            startAfter(cursor)
        )

    }

    filtros.push(
        limit(limiteConsulta + 1)
    )

    const consulta =
        query(
            referencia,
            ...filtros
        )

    const snapshot =
        await getDocs(consulta)

    const documentos =
        snapshot.docs

    const temMais =
        documentos.length > limiteConsulta

    const documentosPagina =
        documentos.slice(0, limiteConsulta)

    const solicitacoes =
        documentosPagina.map(documento => {

            return normalizarSolicitacaoFirebase(
                documento
            )

        })

    return {
        solicitacoes,
        documentosConsulta:
            documentos,
        ultimoDocumento:
            documentosPagina.length > 0
                ? documentosPagina[documentosPagina.length - 1]
                : cursor,
        temMais
    }

}

function obterTempoDocumentoSolicitacao(documento) {

    const dados =
        documento.data()

    const criadoEm =
        dados.criadoEm

    if (criadoEm?.toMillis) {

        return criadoEm.toMillis()

    }

    if (criadoEm?.toDate) {

        return criadoEm.toDate().getTime()

    }

    return 0

}

async function executarConsultaSolicitacoesSegura(chave, filtros, opcoes) {

    try {

        const cursor =
            opcoes.cursor?.tipo === "multiUsuario"
                ? opcoes.cursor.cursores?.[chave] || null
                : null

        return {
            chave,
            ...(await executarConsultaSolicitacoes(
                filtros,
                {
                    ...opcoes,
                    cursor,
                    ordenar:
                        false
                }
            ))
        }

    }

    catch (erro) {

        console.warn(
            `Consulta de solicitacoes por ${chave} falhou:`,
            erro
        )

        return {
            chave,
            solicitacoes:
                [],
            documentosConsulta:
                [],
            ultimoDocumento:
                null,
            temMais:
                false
        }

    }

}

async function listarMinhasSolicitacoesFirebase(usuarioOuUid, opcoes = {}) {

    const usuario =
        obterDadosUsuarioConsulta(usuarioOuUid)

    if (!usuario.uid && !usuario.matricula) {

        return {
            solicitacoes:
                [],
            ultimoDocumento:
                null,
            temMais:
                false
        }

    }

    const consultas = []

    if (usuario.uid) {

        consultas.push({
            chave:
                "uid",
            filtros:
                [
                    where(
                        "usuarioUid",
                        "==",
                        usuario.uid
                    )
                ]
        })

    }

    if (usuario.matricula) {

        consultas.push(
            {
                chave:
                    "matricula",
                filtros:
                    [
                        where(
                            "usuarioMatricula",
                            "==",
                            usuario.matricula
                        )
                    ]
            },
            {
                chave:
                    "matriculaSolicitante",
                filtros:
                    [
                        where(
                            "usuarioSolicitante.matricula",
                            "==",
                            usuario.matricula
                        )
                    ]
            }
        )

    }

    const resultados =
        await Promise.all(
            consultas.map(consulta => {

                return executarConsultaSolicitacoesSegura(
                    consulta.chave,
                    consulta.filtros,
                    opcoes
                )

            })
        )

    const documentosPorId =
        new Map()

    resultados.forEach(resultado => {

        ;(resultado.documentosConsulta || []).forEach(documento => {

            if (!documentosPorId.has(documento.id)) {

                documentosPorId.set(
                    documento.id,
                    {
                        documento,
                        chaves:
                            new Set()
                    }
                )

            }

            documentosPorId.get(documento.id).chaves.add(
                resultado.chave
            )

        })

    })

    const documentosOrdenados =
        Array.from(documentosPorId.values())
            .sort((a, b) => {

                return obterTempoDocumentoSolicitacao(b.documento) -
                    obterTempoDocumentoSolicitacao(a.documento)

            })

    const limite =
        Number(opcoes.limite || 20)

    const documentosPagina =
        documentosOrdenados.slice(0, limite)

    const cursores =
        {
            ...(opcoes.cursor?.tipo === "multiUsuario"
                ? opcoes.cursor.cursores || {}
                : {})
        }

    documentosPagina.forEach(item => {

        item.chaves.forEach(chave => {

            cursores[chave] =
                item.documento

        })

    })

    return {
        solicitacoes:
            documentosPagina.map(item => {

                return normalizarSolicitacaoFirebase(
                    item.documento
                )

            }),
        ultimoDocumento:
            {
                tipo:
                    "multiUsuario",
                cursores
            },
        temMais:
            false
    }

}

function calcularSubtotalItem(item) {

    const quantidade =
        normalizarNumeroMonetario(item?.quantidade)

    const valorUnitario =
        normalizarNumeroMonetario(
            item?.valorUnitarioNumero ||
            item?.valorUnitario
        )

    return quantidade * valorUnitario

}

function calcularTotalItemSalvo(item) {

    const subtotalCalculado =
        calcularSubtotalItem(item)

    if (subtotalCalculado > 0) {

        return subtotalCalculado

    }

    return normalizarNumeroMonetario(
        item?.valorTotal ||
        item?.valorTotalItem ||
        item?.subtotal
    )

}

function calcularTotalSolicitacao(solicitacao) {

    const itens =
        Array.isArray(solicitacao?.itens)
            ? solicitacao.itens
            : []

    return itens.reduce(
        (total, item) => {

            return total + calcularTotalItemSalvo(item)

        },
        0
    )

}

// =========================
// LISTAR TODAS AS SOLICITAÇÕES
// USO ADMIN
// =========================

async function listarTodasSolicitacoesFirebase(opcoes = {}) {

    const limite =
        Number(opcoes.limite || 20)

    const cursor =
        opcoes.cursor || null

    const referencia =
        collection(db, "solicitacoes")

    const filtros = [
        orderBy(
            "criadoEm",
            "desc"
        )
    ]

    if (cursor) {

        filtros.push(
            startAfter(cursor)
        )

    }

    filtros.push(
        limit(limite + 1)
    )

    const consulta =
        query(
            referencia,
            ...filtros
        )

    const snapshot =
        await getDocs(consulta)

    const documentos =
        snapshot.docs

    const temMais =
        documentos.length > limite

    const documentosPagina =
        documentos.slice(0, limite)

    const solicitacoes =
        documentosPagina.map(documento => {

            return normalizarSolicitacaoFirebase(
                documento
            )

        })

    return {
        solicitacoes,
        ultimoDocumento:
            documentosPagina.length > 0
                ? documentosPagina[documentosPagina.length - 1]
                : cursor,
        temMais
    }

}

// =========================
// LISTAR SOLICITAÇÕES
// CONFORME PERFIL
// =========================

async function listarSolicitacoesPorPerfilFirebase(usuario, opcoes = {}) {

    if (!usuario) {

        return {
            solicitacoes:
                [],
            ultimoDocumento:
                null,
            temMais:
                false
        }

    }

    if (usuario.perfil === "admin") {

        return await listarTodasSolicitacoesFirebase(opcoes)

    }

    return await listarMinhasSolicitacoesFirebase(
        usuario,
        opcoes
    )

}

// =========================
// RESUMO ADMIN
// =========================

async function buscarResumoAdminFirebase() {

    const referencia =
        doc(db, "resumosAdmin", "dashboardGeral")

    const snapshot =
        await getDoc(referencia)

    if (!snapshot.exists()) {

        return null

    }

    return snapshot.data()

}

// =========================
// EXPORTA FUNÇÕES
// =========================

export {
    auth,
    db,
    loginFirebase,
    logoutFirebase,
    observarUsuarioLogado,
    buscarUsuarioFirebase,
    listarMateriaisVps,
    observarVersaoMateriaisFirebase,
    salvarSolicitacaoFirebase,
    listarMinhasSolicitacoesFirebase,
    listarTodasSolicitacoesFirebase,
    listarSolicitacoesPorPerfilFirebase,
    buscarResumoAdminFirebase
}
