# Revisão do relatório do gpt-6-astra sobre o Audit — 26/09/2026

> Cada afirmação concreta do relatório foi conferida no código da `main`
> (`5057e90`) mais as correções locais de 26/09 (validação em lotes, rede por
> página, versão com prompts). Nenhuma chamada de IA foi feita.
>
> Legenda: **✅ procede** · **◐ procede com ressalva** · **⚖ é decisão de
> produto, não defeito** · **✗ não procede** · **— não conferido**.

## 0. Veredito

O relatório é sério e, no essencial, **correto**. Das ~45 afirmações
verificáveis, ~35 procedem como escritas e ~7 procedem com ressalva. Três são
decisões de produto já registradas (e revisáveis), uma está fraca (P22) e uma
não procede hoje (P11, que é latente). Não encontrei afirmação inventada.

O P11 (orçamento por `userId` × gravação por `userEmail`) **não é defeito
ativo**: o Auth.js v5 não põe `id` na sessão e o `auth.ts` não acrescenta, então
a verificação cai no ramo do e-mail e o teto funciona. É armadilha latente — e eu
mesmo afirmei o contrário antes de conferir a sessão (§4). O gasto do **chat**,
esse sim, sai sem dono e fora do teto.

Os mais graves ativos: o corpo do upload é lido **antes** da autenticação, sem
proxy na frente (§4); cancelar não para o motor (§3); o selo pode dizer
"LIBERADO" ao lado do aviso de leitura incompleta (§3).

O que **ele não viu** e a conferência achou está em §4.

A tese central dele — separar *suspeita*, *prova* e *cobertura*, e dar a cada
uma um contrato — é a mesma direção das análises de 17/08 e 26/09 e está certa.

---

## 1. Pipeline e entrada (seções 2 a 6 dele)

| Afirmação | | Evidência |
|---|---|---|
| Até 5 PDFs, 40 MB por arquivo, MIME **ou** extensão `.pdf` | ✅ | `route.ts:147` `MAX_FILES`; `isPdf` aceita só pelo nome |
| Mínimo de 300 caracteres extraídos | ✅ | `MIN_TEXT_CHARS_FOR_DEEP_AUDIT`, `route.ts:3879` |
| Nenhum teto de páginas ou de complexidade | ✅ | não há `MAX_PAGES` em lugar nenhum |
| O PDF não vai ao modelo; vai texto extraído | ✅ | nenhum `input_file`/`file_search` no motor |
| Tabela entra duas vezes (achatada + grade) | ✅ | `textoDaPaginaParaIA` (`pdf-text.ts:282`) — e o prompt de sistema **avisa** o modelo disso, então o risco de "achado de tabela duplicada" está tratado; o custo de tokens não |
| Página muda: limiar 120 caracteres; render em escala 2; cache no IndexedDB por checksum+página+versão | ✅ | `pagina-muda.ts:58`, `pagina-muda-render.ts:53,143` |
| Prancha com texto suficiente não é "muda" e o desenho nunca é lido | ✅ | é o desenho: visão só transcreve folha muda |
| A extração se repete em classify, delta e auditoria, sem cache no servidor | ✅ | `extractPdfText` chamado nas três rotas |
| Arquivos extraídos em paralelo, auditados em série | ✅ | `Promise.all` em `route.ts:3850`; `for (const file …)` |
| Registro inicial pode falhar (`null`) e a auditoria segue | ✅ | `createPendingAudit` devolve `null` no `catch` |
| Não há expiração automática de documentos | ✅ | o expurgo existe mas é gesto manual do admin (`server/admin/expurgo.ts`) |

## 2. IA, prompts e contexto (seções 7, 8 e 10)

| Afirmação | | Evidência |
|---|---|---|
| Defaults `gpt-6-sol`; transcrição e selo em `gpt-6-luna`; cache de overrides de 15 s | ✅ | `ai-providers.ts:91-155`, `ai-model-config.ts:63` |
| `temperature` nunca é enviada | ✅ | nenhuma ocorrência no runner nem na rota |
| Profundo de memorial em `medium`; Profundo de **volume** em `high` | ✅ | `configuracao-do-auditor.ts:32,85` |
| Identidade por IA: 140k de contexto | ✅ | `buildIdentityContext` → `.slice(0, 140_000)` (passada desligada) |
| Refutação recebe a amostra de 90k mesmo no Profundo | ✅ | `buildDocumentContext(args.extracted)` sem nível, `route.ts:2975` (desligada) |
| Confronto por IA: 45k por arquivo, 120k no total, prefixos | ✅ | `route.ts:2687-2689` (desligado) |
| Chat: 1.400 de saída, últimas 6 mensagens, 8 voltas (máx. 20), esforço `low` | ✅ | `chat/route.ts:198,269`; `run-chat-turn.ts:96` |
| Jev: `jev-1.13.0`, 20 s, 3 tentativas, até 200 pares no dedupe | ✅ | `jev.ts:56-72`; `encaixe-4-dedupe.ts:141` |
| **Contradição: o sistema manda CONSOLIDAR ocorrências; a global e o bloco mandam UMA OCORRÊNCIA, UM ACHADO** | ✅ | `auditor-prompt.ts` (seção CONSOLIDAÇÃO) × `prompts-da-leitura.ts` |
| **Contradição: "responda em 7 seções" × JSON estrito** | ✅ | `auditor-prompt.ts` (seção FORMATO) |
| **O prompt global afirma "você recebeu o documento inteiro"** — falso na amostra, no reuso e com folha muda | ✅ | `prompts-da-leitura.ts`, parágrafo do SUMÁRIO |
| O teto de 60 achados favorece o começo | ◐ | só o editorial é mandado priorizar "menor página"; o técnico não |
| O agrupador de blocos não divide bloco grande | ✅ | `agruparBlocosParaLeitura` só junta (`pdf-text.ts:402`); só afeta cobertura total |
| **Validação com vários arquivos: arquivo sem achado consome 45k e o terceiro fica sem página** | ✅ | `buildValidationContext` (`audit-validation-prompt.ts:337`). **Defeito no código que escrevi hoje** — o lote mede só as páginas-alvo, mas o montador ainda amostra os arquivos sem alvo |
| Hash do auditor ainda não cobre regras, extrator, gabarito, aprendizados, flags | ✅ | `configuracaoDoAuditor` |

## 3. Achados, evidência, reuso e persistência (seções 11, 12, 15)

| Afirmação | | Evidência |
|---|---|---|
| **Grounding: basta uma janela de 24 caracteres em qualquer página** | ✅ | `hasWindowMatch`/`isFindingGrounded` (`audit-verify.ts`). Ressalva: a medição offline de agosto (`prova:evidencia-ancorada`, 170 achados) não achou evidência inventada — mas a página nunca é conferida em produção |
| Passam por fora da ancoragem: regra, rede, confronto por IA, herdados | ✅ | `analyzeCrossDocumentsWithModel` não chama `filterGroundedFindings`; herdados entram depois da validação (`route.ts:4181`) |
| O chat exige ancoragem na página para registrar achado | ✅ | `registrarAchado` (`ferramentas.ts:281`) |
| "Remover" da validação vira Sugestão, não sai | ⚖ | `decisao-da-validacao.ts` — decisão "nunca apagar achado por conveniência" (21/09). Revisável |
| Regra vale sempre certeza **alta**, mesmo contestada | ⚖◐ | `severidade.ts:68`. A blindagem é deliberada; o que **não** é deliberado é a contestação (validação ou Jev) não mover nada dentro da faixa |
| IDs `INC-001…` são renumerados a cada parecer | ✅ | `route.ts:4306` |
| Consolidação de identidade ignora o arquivo | ✅ | `getAlternateIdentityKey` não usa `arquivo` |
| **P04 — capítulo removido passa por "documento idêntico"** | ✅ | condição olha `alterados` e `novos`, ignora `sumidos` |
| A recusa por idêntico olha só o primeiro arquivo | ✅ | `arquivoPrincipal = uploadedFiles[0]` |
| **P05 — reuso herda achados de qualquer arquivo da base** | ◐ | `planejarReuso` recebe `relatorioBase.incongruencias` inteiro. Só morde em base com vários arquivos, que no memorial é raro |
| Herdado multipágina vira página única | ✅ | `pagina: String(pagina)` em `audit-reuso.ts` |
| Base com cobertura parcial pode servir | ◐ | `avaliarBase` barra passada incompleta e folha muda pendente, **não** barra leitura amostrada (documento > janela) |
| `/api/audit/delta` calcula a versão como nível Padrão | ✅ | `versaoDoAuditorDaCorrida()` sem argumentos (`delta/route.ts:154`) |
| **P08 — `COMPLETED` é gravado antes de arquivos, texto e bytes; cada etapa falha sozinha** | ✅ | `persistCompletedAudit`; a rota entrega sucesso mesmo com gravação falha |
| O id da resposta de fundo da OpenAI não é persistido | ✅ | `resposta-em-segundo-plano.ts` não importa nada de banco |
| **Cancelar só muda o status; o motor não para** | ✅ | `cancel/route.ts` faz `updateMany`; a rota nunca relê o status. O custo continua até o fim |
| Falha do Jev não vira cobertura faltante | ✅ | `catch` → `console.warn` |
| A rede trata bloco **tentado** como lido | ✅ | `new Set(chunks.map(id))`; o bloco que falhou já vira degradação no parecer, mas a rede não o varre |
| **P07 — chat grava o relatório que o navegador mandou** | ✅ | `body.report` → `gravarAchadoNoParecer` (`chat/route.ts:118,244`) |
| **P01 — o veredito não recebe a cobertura** | ◐ | `getEmissionVerdict` só vê passadas incompletas. Há `AvisoDeAuditoriaIncompleta` ao lado, então o selo pode dizer "🟢 LIBERADO" **e** o aviso dizer que o documento não foi todo lido. Contraditório na tela |
| P13 — transcrição vem do cliente sem vínculo com o PDF | ◐ | aceita só para folhas que o **servidor** considera mudas (`aplicarTranscricao`). O conteúdo, porém, é livre |
| P22 — "peça não listada" não consulta os outros arquivos | ◐ fraco | a regra afirma "não listada **neste** documento", e isso continua verdade com a peça no outro arquivo |
| P23 — o papel `audit-memorial-deep-chunk` falta no painel | ✅ | existe em `ai-providers.ts:550`, falta em `ai-model-config.ts` e `fluxos-de-ia.ts` |
| Duplicidade de parágrafo só na mesma página | ⚖ | `MAX_DISTANCIA_DE_PAGINAS = 0`, medido e documentado |

## 4. Custo, vazão e segurança (seções 13, 14, 16)

| Afirmação | | Evidência |
|---|---|---|
| P11 — orçamento por `userId`, gravação só por `userEmail` | ✗ hoje · latente | `ai-budget.ts:100` prefere `userId` e `ai-usage.ts:130` nunca grava `userId` — **mas** `session.user.id` chega `undefined`: o callback padrão do `@auth/core` 0.41 devolve só `name`/`email`/`image`, e o `auth.ts` não tem callback de sessão. Cai no ramo `userEmail`, que é o que se grava. Vira defeito no dia em que alguém expuser o `id` na sessão |
| O chat não passa pelo teto e não atribui usuário | ✅ **e pior** | sem `verificarTetoMensal`; `executeOpenAiResponse` sem `userEmail` — o gasto do chat não é de ninguém |
| Aprendizados: até 20 × ~2k caracteres, repetidos em toda chamada | ✅ | `formatAuditLearningsForPrompt` |
| Vazão em memória do processo, 1 global e 1 por usuário | ✅ | `vazao-de-auditoria.ts`, `render.yaml` |
| **Multipart lido antes da autenticação** | ✅ **e pior** | `POST` faz `request.formData()` na primeira linha; o `proxy.ts` só cobre `/` e `/login`. Um anônimo manda o corpo inteiro para a memória de um container de 512 MB antes de ser recusado |
| Delta sem limite de tamanho | ✅ | autentica primeiro, mas extrai sem `excedeOLimite` |
| Armazenamento por checksum global; segundo escritório recebe 404 | ✅ | `guardarArquivo` faz `upsert` pela chave global e mantém a 1ª organização; o download filtra pela organização. Latente enquanto só existe a PROSUL |
| Prompt injection pelo documento | ◐ | risco real e sem mitigação explícita; o impacto na auditoria é semântico (a principal não tem ferramenta de escrita; o chat tem) |

## 5. O que o relatório não viu

1. **A validação recebe como prompt de sistema o "PEQUE PELO EXCESSO".**
   `validateFindingsWithModel` usa `getAuditorPrompt(modo)` como `instructions`:
   o mesmo texto que manda não omitir achado. O validador recebe a ordem de
   remover falso positivo por cima de um sistema que manda não remover nada.
   Ele tratou isso como tensão de desenho; é uma contradição literal no mesmo
   request.
2. **A passada de coerência por IA lê MENOS que a global.** Ela só roda quando
   o documento passa de 700k (a janela da global), e aí recebe 400k (60%
   cabeça, 40% cauda). A rede para documento gigante lê um subconjunto do que a
   global já leu, e o miolo continua sem ninguém.
3. **A gravidade do multipart** (§4): ele descreveu como consumo antes do
   controle; sem nada na frente da rota, é memória do container nas mãos de
   quem não tem conta.
4. **A contestação da regra não move a certeza.** Ele apontou "regra = certeza
   alta"; o defeito mais preciso é que, quando a validação **e** o Jev
   contestam a mesma regra, o achado continua "verificado por regra" com o
   mesmo peso.

---

## 6. Backlog consolidado (relatório dele + minha análise de 26/09)

### Fase 1 — defeitos, baratos, sem mudar o que o modelo acha

| # | O quê | Por quê primeiro |
|---|---|---|
| 1 | Autenticar antes de ler o corpo; teto de tamanho no delta | memória do container exposta a anônimo |
| 2 | Chat: `userEmail` no evento de uso e `verificarTetoMensal` na entrada; e a verificação passar a somar pela mesma chave que se grava | gasto do chat sem dono; desarma a armadilha do P11 |
| 3 | Validação: arquivo sem alvo não entra no contexto do lote | defeito meu de hoje |
| 4 | Idêntico considera `sumidos` e todos os arquivos | reauditoria recusada indevidamente |
| 5 | Delta calcula a versão com o modo e o nível reais | reuso oferecido/recusado errado |
| 6 | Reuso filtra os herdados pelo arquivo principal | herança cruzada |
| 7 | Rede varre bloco que falhou | fecha o buraco da rede |
| 8 | Veredito consulta `incompletudeDoParecer` | "LIBERADO" ao lado de "incompleta" |
| 9 | Chat parte do relatório do banco, com controle de versão | integridade do parecer |
| 10 | O motor relê o status entre passadas e para se `CANCELED` | cancelar hoje não economiza |
| 11 | Achado sem decisão do validador ganha marca "não revisado" | hoje só vai para o log |
| 12 | Papel do bloco no painel admin | configuração invisível |
| 13 | Coerência por IA lê o que a global **não** leu | a rede de documento gigante hoje é inútil |

### Fase 2 — contrato de evidência e de prompt

- Ancoragem **por página**: a evidência tem de existir na página declarada (ou
  ±1). Medir antes quantos achados de hoje reprovariam.
- Achado comparativo com **duas evidências** (lado A, lado B), como o prompt
  de ACHADO POR AUSÊNCIA já pede em texto.
- **Prompt de sistema próprio para a validação**, sem o "peque pelo excesso".
- Resolver CONSOLIDAÇÃO × UMA OCORRÊNCIA (decidir uma regra e escrever uma).
- Tirar as "7 seções" do sistema das passadas que respondem JSON.
- A frase "você recebeu o documento inteiro" condicionada ao que foi mandado.
- Orçamento para os aprendizados (hoje até ~40k por chamada).
- Contestação de regra move a certeza **dentro** da faixa.
- Corpus de avaliação: os 3 gabaritos + negativos difíceis, N=3 por
  configuração, métrica por faixa (o §5 da análise de 26/09).

### Fase 3 — durabilidade

- Persistir o id da resposta de fundo no `AiTask` e retomá-la após reinício.
- Estado de finalização explícito: `COMPLETED` só depois de texto e arquivos.
- Cache de extração por checksum + versão do extrator (classify, delta e
  auditoria extraem o mesmo PDF três vezes).
- Fila em Postgres com worker, quando o volume pedir.

### Fase 4 — arquitetura

- Documento e revisão como entidades; fatos com proveniência (sem canonizar
  cedo — a divergência é o que se procura).
- Inspeção visual dirigida para pranchas.
- Tabela de achados (precisão por regra e por modelo, com o veredito do
  engenheiro).

## 7. Decisões que são suas, não do código

1. **"Remover" da validação**: continuar virando Sugestão, ou ganhar um estado
   "rejeitado" (arquivado com o motivo, fora da contagem)?
2. **O que "LIBERADO" promete**: "não achei bloqueador" ou "li tudo e não achei
   bloqueador"? A resposta define o item 8 da Fase 1.
3. **Escopo**: auditoria textual do memorial, ou também revisão visual de
   prancha? Hoje o produto só faz a primeira e a tela não diz isso.
4. **Retenção**: por quanto tempo PDF, texto e parecer ficam guardados, e o que
   vai para o Jev.
5. **Regra contestada**: continua blindada na faixa (hoje), mas pode perder
   certeza dentro dela?
