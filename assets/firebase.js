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
    query,
    where,
    orderBy,
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

function tratarNumero(valor) {

    const numero =
        Number(valor)

    if (!Number.isFinite(numero)) {

        return 0

    }

    return numero

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
        tratarNumero(item?.valorUnitario)

    if (valorInformado > 0) {

        return valorInformado

    }

    const codigo =
        String(item?.codigo || "")
            .trim()

    const almoxarifado =
        String(item?.almoxarifado || "")
            .trim()

    if (!codigo || !almoxarifado) {

        return 0

    }

    try {

        const idMaterial =
            `${codigo}_${normalizarIdMaterial(almoxarifado)}`

        const referenciaMaterial =
            doc(db, "materiais", idMaterial)

        const snapshotMaterial =
            await getDoc(referenciaMaterial)

        if (!snapshotMaterial.exists()) {

            return 0

        }

        const dadosMaterial =
            snapshotMaterial.data()

        return tratarNumero(
            dadosMaterial.valorUnitario
        )

    }

    catch (erro) {

        console.warn(
            "Nao foi possivel buscar valor unitario do material:",
            erro
        )

        return 0

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

                const valorUnitario =
                    await buscarValorUnitarioMaterial(item)

                const subtotal =
                    quantidade * valorUnitario

                return {

                    ...item,

                    quantidade:
                        quantidade,

                    valorUnitario:
                        valorUnitario,

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

    const totalEstimado =
        itens.reduce(
            (total, item) => {

                return total + tratarNumero(item.subtotal)

            },
            0
        )

    const documento =
        await addDoc(referencia, {

            ...dadosSolicitacao,

            itens:
                itens,

            totalEstimado:
                totalEstimado,

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

    }

    catch (erro) {

        return ""

    }

}

// =========================
// NORMALIZAR SOLICITAÇÃO
// =========================

function normalizarSolicitacaoFirebase(documento) {

    const dados =
        documento.data()

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
            dados.itens || [],

        totalItens:
            dados.totalItens || 0,

        totalEstimado:
            tratarNumero(
                dados.totalEstimado
            ),

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
// NORMALIZAR MATERIAL
// =========================

function normalizarMaterialFirebase(documento) {

    const dados =
        documento.data()

    return {

        id:
            documento.id,

        codigo:
            dados.codigo || "",

        descricao:
            dados.descricao || "",

        almoxarifado:
            dados.almoxarifado || "",

        estoque:
            Number(dados.estoque || 0),

        valorUnitario:
            tratarNumero(
                dados.valorUnitario
            ),

        disponivel:
            dados.disponivel === true,

        ativo:
            dados.ativo !== false

    }

}

// =========================
// LISTAR MATERIAIS
// =========================

async function listarMateriaisFirebase() {

    const referencia =
        collection(db, "materiais")

    const consulta =
        query(
            referencia,
            orderBy(
                "descricao",
                "asc"
            )
        )

    const snapshot =
        await getDocs(consulta)

    const materiais = []

    snapshot.forEach(documento => {

        const material =
            normalizarMaterialFirebase(documento)

        if (material.ativo) {

            materiais.push(material)

        }

    })

    return materiais

}

// =========================
// LISTAR MINHAS SOLICITAÇÕES
// =========================

async function listarMinhasSolicitacoesFirebase(usuarioUid) {

    const referencia =
        collection(db, "solicitacoes")

    const consulta =
        query(
            referencia,
            where(
                "usuarioUid",
                "==",
                usuarioUid
            ),
            orderBy(
                "criadoEm",
                "desc"
            )
        )

    const snapshot =
        await getDocs(consulta)

    const solicitacoes = []

    snapshot.forEach(documento => {

        solicitacoes.push(
            normalizarSolicitacaoFirebase(
                documento
            )
        )

    })

    return solicitacoes

}

// =========================
// LISTAR TODAS AS SOLICITAÇÕES
// USO ADMIN
// =========================

async function listarTodasSolicitacoesFirebase() {

    const referencia =
        collection(db, "solicitacoes")

    const consulta =
        query(
            referencia,
            orderBy(
                "criadoEm",
                "desc"
            )
        )

    const snapshot =
        await getDocs(consulta)

    const solicitacoes = []

    snapshot.forEach(documento => {

        solicitacoes.push(
            normalizarSolicitacaoFirebase(
                documento
            )
        )

    })

    return solicitacoes

}

// =========================
// LISTAR SOLICITAÇÕES
// CONFORME PERFIL
// =========================

async function listarSolicitacoesPorPerfilFirebase(usuario) {

    if (!usuario) {

        return []

    }

    if (usuario.perfil === "admin") {

        return await listarTodasSolicitacoesFirebase()

    }

    return await listarMinhasSolicitacoesFirebase(
        usuario.uid
    )

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
    listarMateriaisFirebase,
    salvarSolicitacaoFirebase,
    listarMinhasSolicitacoesFirebase,
    listarTodasSolicitacoesFirebase,
    listarSolicitacoesPorPerfilFirebase
}
