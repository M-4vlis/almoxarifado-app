# AGENTS.md — Instruções para o Codex no VS Code

## Projeto

Projeto: **Almoxarifado Inteligente**

Objetivo: aplicação web/mobile-first para consulta de materiais, criação de solicitações via WhatsApp, persistência das solicitações no Firebase/Firestore e, em fases seguintes, histórico, relatórios, dashboard e gestão por perfil de usuário.

## Perfil do desenvolvedor responsável

O usuário principal do projeto é Mario. Ele está aprendendo desenvolvimento e prefere ser guiado de forma prática. Ao modificar código, mantenha explicações curtas e objetivas.

## Regra principal de trabalho

Antes de alterar qualquer arquivo, peça o código atual do arquivo que será modificado.

Quando alterar um arquivo, devolva sempre o código completo do arquivo, pronto para copiar e colar, sem trechos soltos, sem patches parciais e sem omitir partes existentes.

Nunca peça vários arquivos ao mesmo tempo. Trabalhe em ciclo:

1. pedir um arquivo;
2. analisar;
3. devolver o arquivo completo alterado;
4. só depois pedir o próximo arquivo necessário.

## Estilo de resposta esperado

- Seja direto.
- Explique apenas o necessário.
- Evite respostas longas quando o usuário estiver executando alterações.
- Quando houver risco de quebrar algo, avise antes.
- Priorize estabilidade, clareza e evolução incremental.
- Não entregue soluções pela metade.

## Stack atual

- HTML
- CSS
- JavaScript puro
- Fuse.js para busca local
- Firebase Web SDK modular
- Firebase Authentication
- Cloud Firestore
- GitHub Pages como hospedagem
- Python com pandas para scripts de atualização de dados

## Arquivos principais esperados

- `index.html`
- `assets/style.css`
- `assets/app.js`
- `assets/firebase.js`
- `atualizar.py`
- `data/materiais.json`
- Possivelmente futuros scripts auxiliares para importar usuários, materiais e vínculos GLPI/requisição para o Firestore.

## Regras de arquitetura

### 1. Mobile-first

A aplicação deve ser pensada prioritariamente para celular.

Referências visuais desejadas:
- iFood
- Nubank
- Uber
- YouTube mobile
- Apps modernos com cards, navegação inferior fixa, telas bem separadas e boa hierarquia visual.

### 2. Navegação

A navegação deve seguir o modelo de **menu inferior fixo**, com as abas:

- **Início**
  - Painel geral do usuário.
  - Cards de estatísticas.
  - Atalhos rápidos.
  - Solicitações recentes.

- **Busca**
  - Tela principal de consulta de materiais.
  - Deve manter a busca por descrição e código já existente.
  - Deve manter filtro por almoxarifado.
  - Deve manter modal de material.
  - Deve manter carrinho/lista de solicitação.

- **Solicitações**
  - Histórico de solicitações.
  - Filtros por período, status, GLPI, requisição e outros.
  - Geração futura de relatórios.

- **Perfil**
  - Informações do usuário logado.
  - Nome.
  - Matrícula.
  - Perfil.
  - Botão de sair.
  - Futuras preferências.

### 3. Não usar menu lateral neste momento

Foi testado um menu lateral/sanduíche, mas o resultado visual não ficou bom. A decisão atual é seguir com navegação inferior fixa.

### 4. Autenticação

A aplicação deve usar Firebase Authentication.

A regra de login do negócio é:

- Usuário: matrícula do colaborador.
- Senha: CPF do colaborador.

Por limitação do Firebase Authentication, o login técnico pode usar um e-mail artificial baseado na matrícula, por exemplo:

`0005376@almox.local`

Mas para o usuário final a interface deve continuar mostrando matrícula e CPF.

### 5. Dados de usuários

Os dados dos usuários devem ficar no Firestore, e não mais em JSON público no GitHub, sempre que possível.

Coleção sugerida:

`usuarios`

Campos sugeridos:

- `uid`
- `nome`
- `matricula`
- `cpf`
- `emailLogin`
- `perfil`
- `ativo`

Perfis previstos:

- `usuario`
- `admin`

O admin/superusuário terá acesso total aos dados. Usuários comuns devem visualizar apenas suas próprias solicitações.

### 6. Solicitações

As solicitações devem ser salvas no Firestore.

Coleção atual:

`solicitacoes`

Campos já observados/salvos:

- `criadoEm`
- `dataLocal`
- `glpi`
- `itens`
- `localUso`
- `matriculaRetirada`
- `nomeRetirada`
- `numeroRequisicao`
- `origem`
- `requisicoesVinculadas`
- `status`
- `statusAtendimento`
- `totalItens`
- `usuarioMatricula`
- `usuarioNome`
- `usuarioPerfil`
- `usuarioSolicitante`
- `usuarioUid`

Status atuais/importantes:

- `enviada_whatsapp`
- `aguardando_requisicao`

Status de atendimento sugeridos:

- `aguardando_requisicao`
- `requisicao_vinculada`
- `concluida`
- `cancelada`

### 7. GLPI e requisição

Fluxo real do processo:

1. O usuário cria a solicitação no app.
2. O app abre o WhatsApp com a mensagem pronta.
3. A equipe responsável atende a solicitação em outro sistema.
4. Só depois é gerado um número de requisição.
5. A equipe alimenta uma planilha ou base com o vínculo GLPI x número de requisição.
6. A aplicação deve cruzar depois esse vínculo com as solicitações salvas.

Importante: uma GLPI pode gerar mais de uma requisição.

Por isso a modelagem deve suportar:

- `glpi`
- `numeroRequisicao`
- `requisicoesVinculadas` como array
- identificador único da solicitação no Firestore
- possibilidade de múltiplas requisições para uma mesma GLPI

### 8. Materiais

Hoje os materiais são atualizados diariamente a partir da planilha:

`data/LISTA de MATERIAIS.xlsx`

O script atual `atualizar.py` gera:

`data/materiais.json`

Futuramente, se for simples e seguro, os materiais também poderão ir para o Firestore, mas a atualização diária precisa continuar prática.

### 9. Cuidado com zeros à esquerda

Matrícula e CPF devem ser tratados como texto/string.

Nunca converter matrícula ou CPF para número.

Preservar exatamente como está na planilha.

Exemplo:
- matrícula: `0005376`
- CPF: manter formato string, inclusive zeros à esquerda se existirem.

### 10. Segurança

Evitar deixar dados pessoais em arquivos públicos no GitHub.

Priorizar Firestore e Authentication para usuários.

Mesmo que o usuário tenha optado por usar CPF como senha, trate o dado com cuidado no código e evite expor em tela, logs ou arquivos públicos.

### 11. Firestore Rules

Quando trabalhar com regras, manter a lógica:

- usuário comum só lê/escreve suas próprias solicitações;
- admin lê todas as solicitações;
- dados sensíveis de usuários não devem ser abertos publicamente.

Não alterar regras de segurança sem explicar o impacto.

### 12. UI/UX

A interface deve seguir visual moderno:

- cards arredondados;
- espaçamento generoso;
- boa legibilidade;
- ícones Font Awesome;
- navegação inferior fixa;
- modo claro/escuro;
- responsividade;
- foco em celular;
- telas separadas por abas;
- sem poluir a tela de busca.

### 13. Modo claro e escuro

O sistema já possui modo claro e escuro.

Deve:
- detectar preferência do aparelho;
- permitir alternância manual;
- salvar escolha no `localStorage`.

Preservar essa funcionalidade.

### 14. Carrinho/lista

A lista de solicitação deve:

- permitir adicionar materiais;
- aumentar/diminuir quantidade;
- remover item;
- persistir temporariamente no `localStorage`;
- limpar dados depois do envio via WhatsApp e salvamento da solicitação.

### 15. Firebase

Arquivo esperado:

`assets/firebase.js`

Responsabilidades:
- inicializar Firebase;
- exportar `db`;
- exportar funções de login/logout se já existirem;
- exportar funções de salvar e listar solicitações;
- manter imports modulares do Firebase Web SDK.

Não duplicar inicialização do Firebase em outros arquivos.

### 16. Padrão de código

Manter código simples e didático.

Preferir funções pequenas e nomes claros.

Evitar frameworks neste momento, salvo decisão explícita posterior.

Preservar o estilo do projeto, mas melhorar a organização progressivamente.

### 17. Ao corrigir bugs

Quando houver bug visual ou funcional:

1. identificar o arquivo provável;
2. pedir somente esse arquivo;
3. devolver completo;
4. pedir teste;
5. só depois avançar.

### 18. Ao criar nova funcionalidade

Implementar em pequenas etapas.

Exemplo para navegação inferior:

1. ajustar HTML;
2. ajustar CSS;
3. ajustar JS;
4. testar navegação;
5. só depois integrar Firestore/relatórios.

### 19. Não quebrar o que já funciona

Funcionalidades que devem ser preservadas:

- login;
- modo claro/escuro;
- busca de materiais;
- modal do material;
- carrinho/lista;
- envio via WhatsApp;
- salvamento da solicitação no Firestore;
- limpeza da lista após envio;
- carregamento de materiais;
- histórico baseado no Firestore.

### 20. Comunicação com Mario

Trate Mario como dono do produto e desenvolvedor em evolução.

Quando ele pedir “me envie completo”, envie o arquivo inteiro.

Quando o arquivo for muito grande, ainda assim priorize enviar completo em bloco de copiar e colar.
