# Suporte: reportar um problema — desenho

**Data:** 2026-10-08 · **Status:** aprovado na conversa, aguardando revisão do spec

## Objetivo

Quem usa o NexoDoc consegue avisar o dev de um erro, bug, dúvida ou sugestão sem
precisar descrever o contexto — e os erros reais chegam ao dev mesmo quando
ninguém reporta. Tudo vai para uma caixa no `/admin` e para o e-mail do dev.

Referências: Sentry User Feedback (widget persistente + modal na hora do erro,
contexto anexado sem o usuário digitar), Instabug/Gleap (print congelado no
clique, anotação e borrão, trilha de passos).

## Decisões fechadas

| Pergunta | Decisão |
|---|---|
| Onde chega | Banco + caixa `/admin/suporte` + e-mail ao dev (Resend) |
| Erro real | Vira chamado sozinho; a pessoa só complementa. Repetidos agrupam |
| O que vai junto | Print automático (manual) com riscar/borrar + trilha dos últimos 30 passos |
| Depois do envio | Mão dupla simples: dev responde e muda status; pessoa recebe e-mail e vê "Meus chamados" |
| Construção | Própria (Postgres + Resend + `modern-screenshot` + `instrumentation.ts`). Sem Sentry |

## 1. Arquitetura

### Duas portas, um destino

- **Porta manual** — "Reportar um problema" na tela de Ajuda, no menu da conta do
  Topo e pelo atalho `Ctrl+Shift+B`. O print é tirado **antes** da gaveta abrir.
- **Porta automática**
  - Cliente: `app/error.tsx`, `app/global-error.tsx` (nova) e respostas 5xx
    observadas pelo `fetch` instrumentado.
  - Servidor: `onRequestError` em `instrumentation.ts` (Next 16) — rotas, APIs e
    server actions.
  - Cria o chamado sem ação da pessoa e mostra o aviso "já fomos avisados".

Ambas chamam o mesmo serviço `server/suporte/registrar.ts`, que grava, agrupa e
decide se manda e-mail.

### Dados (Prisma)

`ChamadoDeSuporte`
- `id`, `protocolo` (inteiro sequencial, exibido `#0042`)
- `origem`: `MANUAL | ERRO_CLIENTE | ERRO_SERVIDOR`
- `categoria`: `ERRO | SUGESTAO | DUVIDA`
- `status`: `ABERTO | EM_ANALISE | RESOLVIDO`
- `usuarioId?`, `organizacaoId?`
- `rota` (sem query string), `digest?`, `impressao?` (hash de agrupamento)
- `ocorrencias` (int, default 1), `ultimaOcorrencia`, `criadoEm`, `atualizadoEm`
- `contexto` (JSON): navegador, viewport, versão (sha do commit), projeto/auditoria
  aberta, trilha de passos, nome e mensagem do erro, stack (só servidor)
- `printId?` → `StoredFile`
- regra: no máximo um chamado não resolvido por `impressao` — garantida no
  serviço dentro de uma transação (busca + upsert), com índice comum em `impressao`

`MensagemDoChamado`
- `id`, `chamadoId`, `autorId?`, `papel`: `USUARIO | DEV`, `texto`, `criadoEm`

### Agrupamento

- `impressao = sha1(rotaNormalizada + nomeDoErro + primeiraLinhaDaMensagem)`.
  Rota normalizada troca ids (cuid/uuid/números) por `:id`.
- Chamado não resolvido com a mesma impressão → `ocorrencias += 1`,
  `ultimaOcorrencia = agora`, sem chamado novo.
- E-mail ao dev só na 1ª ocorrência e ao atingir 10, 100, 1000.
- Chamado `RESOLVIDO` cuja impressão volta → reabre (`ABERTO`), soma, avisa.
- Chamado manual não tem impressão (nunca agrupa), exceto quando complementa um
  chamado automático: aí vira `MensagemDoChamado` dele.

### Trilha de passos

Anel em memória no cliente (`lib/suporte/trilha.ts`), últimos 30 eventos:
- navegação (rota sem query)
- clique: rótulo acessível do elemento (`aria-label` / texto do botão), nunca valor digitado
- requisição: método, rota, status, duração
- `console.error` e `unhandledrejection`: mensagem truncada em 300 caracteres

Só é lida no momento do envio.

## 2. Telas

### Gaveta "Reportar um problema"

- Miniatura do print com **Editar**: abre o print grande com duas ferramentas,
  **riscar** e **borrar**. Marcas guardadas à parte e aplicadas só no envio.
  **Tirar print** remove.
- Categoria em três pílulas: Erro · Sugestão · Dúvida (Erro pré-marcada quando
  aberta por um erro).
- Campo "O que você estava fazendo?" (obrigatório na porta manual).
- "O que vai junto", recolhido: página, navegador, versão e a trilha em lista —
  a pessoa vê exatamente o que o dev verá.
- Ao enviar: "Recebido. Protocolo #0042. Você recebe um e-mail quando houver resposta."

### Aviso de erro

- Erro que derrubou a tela: `PaginaQueNaoCarregou` ganha "Já fomos avisados
  (#0042)" e o botão **Contar o que aconteceu**, que abre a gaveta ligada ao
  chamado (a mensagem entra nele).
- Erro de requisição com a tela de pé: toast discreto "Algo falhou ao salvar.
  Já fomos avisados." + mesmo botão. No máximo um toast a cada 30 s.

### Caixa do admin `/admin/suporte`

- Nova aba na casca do admin.
- Lista por atenção: abertos com ocorrência recente primeiro. Linha: protocolo,
  origem, rota, `×N`, quem abriu, há quanto tempo.
- Detalhe: print, mensagens, trilha em linha do tempo, contexto, digest com
  copiar (para buscar no log da Railway), campo de resposta, troca de status.
- Responder ou resolver manda e-mail para quem abriu (se houver usuário).

### "Meus chamados" na Ajuda

Lista do usuário: protocolo, status, última resposta do dev.

## 3. Robustez, privacidade, testes

### Robustez
- Falha do print → envia sem print. Falha da API → guarda em `localStorage`
  (try/catch) e reenvia na próxima carga.
- O reportador nunca reporta erro dele mesmo (flag de reentrância + rota da API
  de suporte excluída da instrumentação).
- Limites: 10 chamados manuais por usuário por hora; erros automáticos limitados
  por impressão (agrupam). Print ≤ 1,5 MB, WebP.

### Privacidade
- Trilha sem valor de campo; URL sem query string.
- Print só na porta manual, visto e editável pela pessoa antes do envio.
  **Erro automático não leva print.**
- Stack trace só do servidor, só visível no admin.

### E-mail
- Via `lib/correio.ts` (estados `enviado | gravado | nao-configurado | falhou`).
- Destinatário do dev: `NEXODOC_SUPORTE_PARA`. Sem ela, o chamado fica só na
  caixa e o admin mostra "e-mail de suporte não configurado".
- Falha de e-mail nunca desfaz o chamado.

### Testes
- Scripts de prova: agrupamento (mesma impressão soma, reabertura, marcos
  1/10/100), normalização de rota, limite por hora, fila do `localStorage`.
- Prova no navegador: fluxo manual com print riscado/borrado chegando no admin;
  erro forçado gerando chamado automático com aviso e complemento.

## Fora do escopo

Replay de sessão, chat por chamado, Sentry/sourcemaps, notificação por
mensageria, anexos além do print.
