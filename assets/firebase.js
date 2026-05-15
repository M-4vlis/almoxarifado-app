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
            dadosUsuario.perfil || "usuario",

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
// SALVAR SOLICITAÇÃO
// =========================

async function salvarSolicitacaoFirebase(dadosSolicitacao) {

    const referencia =
        collection(db, "solicitacoes")

    const documento =
        await addDoc(referencia, {

            ...dadosSolicitacao,

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

        usuarioUid:
            dados.usuarioUid || "",

        usuarioNome:
            dados.usuarioNome || "",

        usuarioMatricula:
            dados.usuarioMatricula || "",

        usuarioPerfil:
            dados.usuarioPerfil || "usuario",

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
    salvarSolicitacaoFirebase,
    listarMinhasSolicitacoesFirebase,
    listarTodasSolicitacoesFirebase,
    listarSolicitacoesPorPerfilFirebase
}