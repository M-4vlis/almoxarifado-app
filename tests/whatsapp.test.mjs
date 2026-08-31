import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const codigoModulo =
    await readFile(
        new URL("../assets/whatsapp.js", import.meta.url),
        "utf8"
    )

const codigoAplicacao =
    await readFile(
        new URL("../assets/app.js", import.meta.url),
        "utf8"
    )

const moduloWhatsapp =
    await import(
        `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`
    )

const dadosSolicitacao = {
    glpi: "123456",
    nomeRetirada: "Usuário de Teste",
    matriculaRetirada: "9999",
    localUso: "Prédio das Procuradorias"
}

const itens = [
    {
        quantidade: 2,
        descricao: "Papel A4",
        codigo: "MAT-001",
        almoxarifado: "CENTRAL"
    },
    {
        quantidade: 1,
        descricao: "Caneta azul",
        codigo: "MAT-002",
        almoxarifado: "BENFICA"
    }
]

test("gera a mensagem completa usando a solicitação já salva", () => {

    const mensagem =
        moduloWhatsapp.gerarMensagemWhatsapp(
            dadosSolicitacao,
            "solicitacao-existente",
            itens
        )

    assert.match(mensagem, /ID INTERNO:\* solicitacao-existente/)
    assert.match(mensagem, /GLPI:\* 123456/)
    assert.match(mensagem, /2x Papel A4/)
    assert.match(mensagem, /Almoxarifado: CENTRAL/)
    assert.match(mensagem, /1x Caneta azul/)
    assert.match(mensagem, /Almoxarifado: BENFICA/)

})

test("cria uma URL do WhatsApp que preserva todo o conteúdo", () => {

    const url =
        moduloWhatsapp.criarUrlWhatsapp(
            dadosSolicitacao,
            "solicitacao-existente",
            itens
        )

    assert.ok(url.startsWith("https://wa.me/?text="))

    const mensagemDecodificada =
        decodeURIComponent(
            url.replace("https://wa.me/?text=", "")
        )

    assert.equal(
        mensagemDecodificada,
        moduloWhatsapp.gerarMensagemWhatsapp(
            dadosSolicitacao,
            "solicitacao-existente",
            itens
        )
    )

})

test("o reenvio usa a solicitação existente sem gravar outra no banco", () => {

    const trechoReenvio =
        codigoAplicacao.match(
            /function reenviarSolicitacaoWhatsapp[\s\S]*?function limparDadosAposEnvio/
        )?.[0] || ""

    assert.notEqual(trechoReenvio, "")
    assert.match(trechoReenvio, /solicitacao\.id/)
    assert.match(trechoReenvio, /solicitacao\.itens/)
    assert.doesNotMatch(trechoReenvio, /salvarSolicitacaoFirebase/)

})
