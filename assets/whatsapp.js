export function gerarMensagemWhatsapp(
    dadosSolicitacao,
    idSolicitacaoFirebase,
    itens = []
) {

    let mensagem =
        `📦 *SOLICITAÇÃO DE MATERIAL*\n\n`

    mensagem +=
        `🆔 *ID INTERNO:* ${idSolicitacaoFirebase}\n\n`

    mensagem +=
        `🎫 *GLPI:* ${dadosSolicitacao.glpi}\n\n`

    mensagem +=
        `👤 *RETIRADA:*\n`

    mensagem +=
        `${dadosSolicitacao.nomeRetirada}\n`

    mensagem +=
        `Matrícula: ${dadosSolicitacao.matriculaRetirada}\n\n`

    mensagem +=
        `📍 *LOCAL:*\n`

    mensagem +=
        `${dadosSolicitacao.localUso}\n\n`

    mensagem +=
        `🧾 *MATERIAIS:*\n\n`

    itens.forEach(item => {

        mensagem +=
            `• ${item.quantidade}x ${item.descricao}\n`

        mensagem +=
            `Código: ${item.codigo}\n`

        mensagem +=
            `Almoxarifado: ${item.almoxarifado}\n\n`

    })

    return mensagem

}

export function criarUrlWhatsapp(
    dadosSolicitacao,
    idSolicitacaoFirebase,
    itens = []
) {

    const mensagem =
        gerarMensagemWhatsapp(
            dadosSolicitacao,
            idSolicitacaoFirebase,
            itens
        )

    return `https://wa.me/?text=${encodeURIComponent(mensagem)}`

}
