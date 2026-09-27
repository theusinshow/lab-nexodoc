# Arquitetura da auditoria de memorial — revisão de 26/09/2026

> Leitura do código na `main` em `5057e90` (família 6 em produção). **Nenhuma
> linha de código foi alterada.** Continua o
> `analise-arquitetura-auditoria-2026-08-17.md` e o
> `analise-jev-typesafe-2026-09-21.md`. O que já foi decidido e medido nesses
> dois não é rediscutido aqui.
>
> Cada item diz se foi **conferido no código** ou se é **inferência**. Nenhum
> número novo foi medido contra o provedor.

---

## 0. O pipeline como está hoje

```
POST /api/audit (SSE, dentro da requisição HTTP)
  portão (sessão, projeto, teto mensal, vaga de execução = 1 na casa inteira)
  extração  pdfjs + grade de tabela + transcrição por visão (se a tela mandar)
  plano de reuso (impressão por capítulo × parecer anterior)
  por arquivo, em série — deepAnalyzeFile:
     regras      guarda capa×corpo · identidade intra-doc · coerência (1.831 l.)
     global      1 chamada, doc inteiro até 700k chars, saída ≤ 32k   [gpt-6-sol]
     blocos      0 no Profundo · até 8 no Padrão                       [gpt-6-sol]
     evidência   filterGroundedFindings (sem IA)
     rede        Encaixe 2, blocos que "ninguém leu"                   [Jev]
  confronto entre arquivos (regra)
  validação     1 chamada em lote                                      [gpt-6-sol]
  pós           dedupe · dedupe pareado (Jev) · certeza (Jev) · assinatura (Jev)
                severidade determinística · persistência (report Json)
```

O desenho da §6 de 17/08 (a IA julga, a regra descobre) está implantado em boa
parte: regra soberana, evidência ancorada, validação focal, conferente aditivo,
cobertura declarada. O que se segue são os pontos onde a implementação ainda
não entrega o que o desenho promete.

---

## 1. Defeitos — conferidos no código, baratos de corrigir

### 1.1 A validação só vê os 40 primeiros candidatos

`buildFindingCandidateList` (`lib/audit-validation-prompt.ts:196`) faz
`findings.slice(0, 40)`. O prompt da global permite **60** achados de IA, e
antes deles vêm os de regra (`deepAnalyzeFile` devolve regras primeiro, IA
depois, rede por último; o dedupe preserva a ordem).

Consequência: numa auditoria profunda típica (55 a 66 achados nas corridas de
24/09), **da ordem de 15 a 25 achados nunca vão ao validador**. São os
últimos da lista: IA do fim do documento e **todos os achados da rede de
arrasto**. O mapa de decisões não tem o id deles, então saem intactos
(`validateFindingsWithModel`, `if (!decision) return finding`) e nada no
parecer diz que não foram revisados.

Pior: os de regra, que a validação **não pode remover**, gastam as primeiras
vagas.

O contexto tem o mesmo problema em outra camada. `buildValidationContext`
junta as páginas citadas (±1 vizinha) em ordem de página e corta em 90k
caracteres. Com 60 achados × 3 páginas × ~2,5k, o pedido passa de 400k: o
corte come o **fim do documento**. É o defeito do "Escola Geral" (validador que
não viu a página) de volta, agora só para a metade de trás.

**Conserto:** validação em lotes de ~20 achados, em paralelo, cada lote com as
páginas dele. Achado de regra entra por último (ou em lote próprio, porque a
decisão sobre ele só gera contestação). O custo sobe pouco, porque o contexto
de cada lote é menor. Registrar em `runtime` quantos achados ficaram sem
decisão, e fazer isso aparecer como degradação.

### 1.2 A rede de arrasto não dispara quando a leitura global cai

`deepAnalyzeFile` passa para `varrerOQueNinguemLeu`
`Math.min(texto, getGlobalContextChars(nivel))` como "caracteres lidos pela
global" (`route.ts:3562`). O valor é o mesmo com a global concluída, abortada,
truncada ou pulada.

É justamente o caso em que a rede mais importa: 117-25 em 14/09 e a primeira
corrida da família 6 em 24/09 (`incomplete_max_output_tokens`) saíram **só com
as regras**. Nos dois casos a rede achou que o documento inteiro tinha sido
lido e não varreu nada.

Há também um erro menor no Padrão: a global lê uma **amostra** (38% cabeça, 20%
meio, 42% cauda de 90k), mas `blocosNaoLidos` trata os caracteres como um
**prefixo**. Ela dá como lido o trecho entre ~34k e 90k, que não foi, e varre a
cauda, que foi.

**Conserto:** `analyzeFileGloballyWithModel` devolve quanto de fato leu (0 se
falhou) e **quais faixas**. A rede usa isso. Com a família 6 truncando mais
que a 5.6, essa é a correção de maior valor por linha de código.

### 1.3 A versão do auditor não enxerga os prompts que de fato mudam

`configuracaoDoAuditor` põe no hash `getAuditorPrompt(modo)`, as ~80 linhas de
`lib/auditor-prompt.ts`. Ficam de fora os prompts que carregam o trabalho:
`getGlobalFilePrompt`, `getChunkPrompt`, `getFindingValidationPrompt`, o
código das regras de `audit-coherence.ts` e o conferente.

O "peque pelo excesso", o teto de 60, a síntese por capítulo e a
conferência do sumário moram em `route.ts`. Mudar qualquer um deles **não
invalida o reuso**, e o parecer herdado continua servindo achado de um auditor
que não existe mais. É o modo de falha que `versao-do-auditor.ts` diz existir
para impedir.

**Conserto:** hashear os modelos de prompt (o texto com os marcadores, sem os
dados), mais uma `VERSAO_DAS_REGRAS` gerada pelo hash dos arquivos de regra.

### 1.4 Dois alçapões de configuração

- `NEXODOC_ENABLE_RULE_BASED_AUDIT=true` liga regras legadas **e** faz
  `shouldRunGlobalPass` virar `false` sempre que elas acham conflito de
  identidade (`route.ts:3350`). No Profundo, onde os blocos são 0, isso deixa o
  documento **sem nenhuma leitura de IA**. Hoje a flag está desligada, mas
  continua sendo uma chave que desliga o motor em silêncio.
- O comentário do `render.yaml` sobre `NEXODOC_ENABLE_COHERENCE_PASS` diz que ele
  protege "a camada de regra determinística (`lib/audit-coherence.ts`)". Não
  protege: no código ele liga a **passada de IA** de coerência
  (`analyzeDocumentCoherenceWithModel`), que só roda acima de 700k caracteres.
  `runDocumentCoherenceRules` roda sempre. Quem desligar a flag achando que
  desliga a regra não desliga nada, e quem confiar no comentário para mantê-la
  ligada está protegendo a coisa errada.

### 1.5 Nome de obra real escrito em código

`getAlternateIdentityKey` (`route.ts:~1970`) tem
`/(cidade do autista|centro dia do idoso|centro comunitario boa vista)/`. É
ajuste a um projeto específico dentro do motor genérico, e não tem teste que
diga o que quebra sem ele.

---

## 2. Robustez — a leitura global é ponto único de falha

### 2.1 A saída está no limite, e a família 6 a empurrou para fora

Conferido: o schema do achado tem **15 campos obrigatórios**, todos string, e
a global devolve até 60 achados **mais** uma linha de síntese por capítulo
(33 a 148 capítulos). Tudo sai no mesmo teto de 32k, que também paga o
raciocínio. Os números de 24/09: a 6 variou de 17,6k a mais de 22k de saída
em corridas iguais, e o `high` usou 27k.

Truncou, perde **tudo**: `parseAuditModelJson` faz `JSON.parse` do objeto
inteiro, e uma resposta cortada no achado 48 vira 0 achados.

Consertos, do mais barato ao mais caro:

1. **Salvar o que chegou.** Quando a resposta vem incompleta mas com texto,
   aproveitar os achados até o último objeto fechado de `findings[]`. A
   síntese já vem depois dos achados no schema, então o que se perde é o fim,
   não o começo. (Inferência: depende de o provedor devolver o `output_text`
   parcial junto do `incomplete`. Confirmar numa corrida.)
2. **Enxugar o schema.** `arquivo` é conhecido pela rota, `local` repete
   `capitulo`, e `termo_busca` pode sair da `evidencia` por regra. Tirar esses
   três e encurtar `descricao`/`conflito` abre folga sem mudar o que se acha.
3. **Tirar a síntese da global.** Ela só serve ao reuso. Pode sair de uma
   chamada `luna` por capítulo (barata e paralela) ou de uma segunda chamada
   curta. Deixa até ~6k de folga na passada que descobre achados.
4. **Dividir a global em duas metades** com corte em fronteira de capítulo,
   cada uma recebendo a síntese da outra. A entrada é a mesma e a saída cai
   pela metade por chamada. As duas rodam em paralelo, e isso ataca a perda de
   recall no miolo. É a "global reduzida" da §6 de 17/08. **Medir antes**: o
   que se ganha em robustez pode custar as contradições entre partes distantes.

### 2.2 A auditoria vive dentro de uma requisição HTTP

Conferido: `executarAuditoria` roda no `start` do stream SSE. O batimento no
banco (`heartbeatAt`) detecta o órfão depois de um restart ou deploy, mas não
**recupera** nada. Numa corrida de 400 a 650s (família 6), um deploy no meio
paga a global e joga o resultado fora.

Há um conserto intermediário que aproveita o que já existe: a global e a
validação já rodam com `background: true` na OpenAI e recebem um **id de
resposta**. Gravando esse id em `AiTask`, um processo que reinicia pode fazer
`retrieve` em vez de pagar de novo. O passo seguinte seria uma fila em
Postgres com um worker separado do processo web.

### 2.3 Vazão: uma auditoria por vez na casa inteira

`NEXODOC_MAX_AUDITORIAS_SIMULTANEAS_GLOBAL=1` no plano `starter` (512 MB), por
causa do memorial de 26,8 MB, que usa 229 MB de RSS. Com a família 6 a corrida
típica foi de ~5 para ~7 a 11 minutos. Duas pessoas auditando ao mesmo tempo
já formam fila.

Isso se resolve com a troca de plano que está pendente (memória "infra para
vender"), mas vale registrar que **a família 6 dobrou o tempo de vaga ocupada**.
Para a vazão, isso pesa mais que a economia de custo.

---

## 3. A troca para a família 6

Os próprios benchmarks de 24/09 concluíram que *"6 em `medium` é instável… não
é substituto seguro da 5.6 na auditoria profunda"* (027-24: 5/9 contra 7/9;
117-25: uma corrida falhou por truncagem). A troca foi para produção como teste
deliberado, com o teto já em 32k.

Para o teste produzir informação, e não só risco, eu faria três coisas:

- **Consertar 1.2 antes**, para que uma global truncada tenha pelo menos a
  rede atrás dela.
- **Acompanhar a taxa de `incomplete_max_output_tokens` e de leitura global
  vazia** por semana em `AiUsageEvent`/`runtime.degradacoes`. É o sinal que
  distingue "a 6 é pior" de "a 6 é igual e mais barata".
- **Definir antes o critério de volta**: por exemplo, mais de 1 global
  incompleta a cada 10 auditorias profundas, ou recall abaixo de 80% num
  benchmark rodado de novo.

---

## 4. Estrutura do código

### 4.1 `app/api/audit/route.ts` tem 4.764 linhas, e o motor mora nele

HTTP, orquestração, 5 prompts, 4 schemas, ~900 linhas de regras legadas e
todas as passadas de IA estão no mesmo arquivo. Consequências medidas no
próprio repositório: `audit-validation-prompt.ts` precisou ser **extraído
palavra por palavra** para poder ser medido fora do Next, e o arquivo teve 50
commits desde 01/08.

Caminhos mortos em produção, cada um atrás de uma flag:
`deriveIdentityFindingsFromText` e `deriveRuleBasedReviewFindings` (mais 4
sub-regras), `analyzeIdentityWithModel`, `refuteFindingsWithModel`,
`analyzeCrossDocumentsWithModel` e `analyzeDocumentCoherenceWithModel` (só acima
de 700k). São 7 flags em combinação, e o item 1.4 mostra que uma delas muda o
fluxo de um jeito que ninguém testa.

**Proposta, sem mudar comportamento:**

```
lib/auditoria/
  etapas/regras.ts  global.ts  blocos.ts  rede.ts  validacao.ts  pos.ts
  prompts/           (um arquivo por prompt, com schema ao lado)
  pipeline.ts        (deepAnalyzeFile + executarAuditoria sem HTTP)
app/api/audit/route.ts   (portão, SSE, persistência — < 400 linhas)
```

Os caminhos legados saem para um branch ou para `scripts/`, com as flags. O
ganho é o mesmo da extração do prompt de validação: **cada etapa passa a ser
medível sem rodar a auditoria inteira**, e o 1.3 passa a ter como hashear os
prompts.

### 4.2 Achados só existem dentro de um `report Json`

Não há tabela de achado. `AuditFeedback.verdict` (procedente / falso positivo /
severidade errada) já existe e "alimenta o benchmark", mas responder "qual
regra tem mais falso positivo" ou "a família 6 tem mais FP que a 5.6" exige
abrir cada JSON.

Uma tabela `AuditFinding` com colunas planas (auditId, origem, regra/tipo,
impacto, página, impressão, versão do auditor, modelo) mais o veredito do
engenheiro transformaria o feedback em **precisão por regra e por modelo**. É
isso que falta para a frente que o §11.8 de 17/08 chamou de próxima: precisão,
não recall.

---

## 5. Avaliação

- **3 memoriais com gabarito** (084-25, 117-25, 027-24), e ruído medido de ~7
  pontos entre corridas iguais. Com isso dá para ver regressão em
  CRÍTICA/ALTA, mas não para decidir trocas finas como a de 24/09.
- `recall-vs-benchmark.ts` casa achado por texto e **infla** (os dois casos de
  24/09 foram corrigidos à mão).
- O que falta: (a) mais 3 ou 4 gabaritos de tipologias diferentes (o 113-22
  hospital já tem parecer e não tem gabarito); (b) rodar **N=3** por
  configuração e comparar faixas, não o total; (c) um comando único
  "benchmark da configuração atual" para rodar a cada troca de
  modelo/prompt, gravando o hash do auditor (1.3) ao lado do resultado.

---

## 6. Prioridade recomendada

| # | O quê | Tipo | Custo | Por quê agora |
|---|---|---|---|---|
| 1 | Validação em lotes, todos os achados, contexto por lote (1.1) | defeito | baixo | ~1/3 dos achados profundos sai sem revisão, e ninguém vê |
| 2 | Rede usa o que a global de fato leu (1.2) | defeito | baixo | é a rede que falta justamente quando a 6 trunca |
| 3 | Monitorar global incompleta e fixar critério de volta da 6 (§3) | operação | ~0 | o teste em produção precisa de régua |
| 4 | Salvar achados de resposta truncada + enxugar schema (2.1, itens 1 e 2) | robustez | baixo | truncar deixa de ser tudo ou nada |
| 5 | Hash do auditor com os prompts reais e as regras (1.3) | defeito | baixo | reuso servindo auditor velho |
| 6 | Remover o alçapão da flag legada + corrigir o comentário do render (1.4) | higiene | ~0 | |
| 7 | Retomar resposta de fundo pelo id após restart (2.2) | robustez | médio | cada deploy no meio custa uma global |
| 8 | Quebrar `route.ts` em etapas, apagando o legado (4.1) | estrutura | médio | pré-requisito para medir cada etapa |
| 9 | Tabela de achados + precisão por regra/modelo (4.2) | produto | médio | abre a frente de precisão |
| 10 | Síntese fora da global / global em duas metades (2.1, itens 3 e 4) | arquitetura | médio-alto | só com o benchmark do §5 em pé |

Os itens 1, 2, 5 e 6 não mudam o que o modelo acha, só param de desperdiçar ou
esconder o que ele já acha. Por isso vêm antes de qualquer mudança de
arquitetura, que é a mesma lição de 17/08.

---

## 7. Corrigido no mesmo dia (26/09/2026)

Os quatro defeitos da §1 (1.1 a 1.4). Nada disso foi medido contra o provedor
ainda; o que está provado é por teste puro e pela bateria.

| # | O que mudou | Onde | Prova |
|---|---|---|---|
| 1.1 | Validação em lotes de até 20 achados, cada lote com as páginas dos seus achados (orçamento de 90k por lote), 3 em paralelo. A lista não corta mais em 40. Lote que falha vira degradação com "N de M achados sem revisão". | `lotesDaValidacao` em `lib/audit-validation-prompt.ts`; `validateFindingsWithModel` | `test:contexto-validacao` (14) |
| 1.2 | A global informa as páginas que recebeu INTEIRAS, e só quando termina com resposta válida. A rede decide por página: global abortada = rede varre tudo que os blocos não cobriram; Padrão = só o que ficou fora da cabeça, meio e cauda. | `paginasNoContextoGlobal`, `paginasNoContextoComReuso`; `blocosNaoLidos` | `test:conferente-rede` (14) |
| 1.3 | Os prompts de leitura global e de bloco saíram de `route.ts` para `lib/prompts-da-leitura.ts`, palavra por palavra (conferido byte a byte contra o `HEAD`). A versão do auditor passa a hashear esses dois e o da validação, renderizados com marcadores. | `promptsDaLeitura` em `versao-do-auditor.ts` / `configuracao-do-auditor.ts` | `test:versao-auditor` (9) |
| 1.4 | A regra legada não pula mais a leitura global nem corta os blocos do Padrão. `NEXODOC_ALWAYS_RUN_GLOBAL_AI` deixou de existir. O comentário do `render.yaml` sobre `NEXODOC_ENABLE_COHERENCE_PASS` diz o que a flag faz de fato. | `deepAnalyzeFile`; `render.yaml` | tsc, bateria |

**Efeitos que valem saber antes do deploy:**

- **Custo da validação sobe.** No parecer real do 117-25 (55 achados), são 5
  lotes de 58k a 90k caracteres: ~130k tokens de entrada contra os ~39k de uma
  chamada só. Com o `gpt-6-sol` a US$ 2/M, são **cerca de US$ 0,18 a mais por
  auditoria profunda**, mais o raciocínio de cada lote. É o preço de o
  validador ver a página de todo achado. Os botões para baixar o custo, se
  precisar, são `VALIDACAO_MAX_CHARS` e `VIZINHAS` no mesmo arquivo.
- **O reuso zera uma vez.** A versão do auditor mudou para todo mundo, então
  a próxima reauditoria de cada memorial relê o documento inteiro, e o
  documento idêntico deixa de ser recusado uma vez. É o comportamento correto,
  porque o auditor de hoje não é o que produziu aqueles pareceres.
- **A rede pode aparecer mais.** Em corrida com a global truncada, o parecer
  passa a trazer achados `rede` sobre o documento inteiro, onde antes vinham só
  as regras. Sem `JEV_API_KEY` nada muda.

**Bateria:** 188 testes puros verdes. Nas jornadas de auditoria, a1 a a7
verdes. A a8 fica vermelha quando roda depois das outras e verde sozinha, e
**falha igual no `HEAD` sem estas mudanças**: a a8 reenvia um memorial que
outra jornada já auditou e recebe a recusa de documento idêntico. É estado
vazando entre jornadas, e não regressão destas correções.
