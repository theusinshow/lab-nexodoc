# Canvas da montagem: trilho vivo, doca de entrega e vista da obra

**Data:** 06/10/2026 · **Status:** aprovado em conversa (seções 1–3) · **Antecessor:** `2026-10-06-montagem-de-volume-design.md` (Partes 3 e 4 ficam superadas por este no que toca ao palco).

## Por quê

Testando a Parte 3 (entrega + painel), o Matheus achou o fluxo "idêntico ao anterior" e, ao montar, não viu nada acontecer: o único sinal era o texto do botão. Ele quer o **canvas como vista principal** — é onde organiza as folhas, e às vezes monta vários volumes da mesma obra em sequência — com os botões **dentro do canvas** e um carregamento visual que mostre o que está sendo feito. "Algo de outro nível, muito intuitivo, com animações de primeira", usando só bibliotecas e componentes que o software já tem.

## Decisões (escolhidas no navegador)

| Pergunta | Escolha |
|---|---|
| Vários volumes no canvas | **B** — uma conversa continua sendo um volume; o canvas ganha a vista **Obra** com todos os volumes do projeto (o modelo de dados não muda). |
| Onde mora a ação do tomo | **C · Trilho vivo** — cabeçalho do tomo com estado e botões + a fileira inteira anima durante a montagem. |
| Onde fica a entrega | **A · Doca no rodapé** do canvas, flutuante. |
| Vista Obra | **B · Trilhos compactos** — um trilho por volume, cada tomo uma pílula. |

## 1 · Estrutura

O cabeçalho do palco ganha o controle **Obra | Volume | Lista** (substitui o "Painel | Folhas" de `VistaDoVolume`). **Volume é o padrão**, sempre.

- **Volume** — o `NexoCanvas` de hoje. Cada fileira (um tomo: capa → separatriz → LD → folhas → volume) vira um **trilho vivo**:
  - **Cabeçalho do tomo** (o nó `rotulo` que já existe): `TOMO 02`, nº de folhas, estado (não montado / fase em curso / ✓ peso / âmbar acima de 20 MB / falhou), botões **Montar** e **Baixar**.
  - Durante a montagem a fileira anima (ver §2). A etapa escrita no cabeçalho é a real (`rotuloDaFase`).
- **Doca de entrega** — faixa flutuante no rodapé do canvas: passo 1 (editáveis, com horário quando feito), passo 2 (volumes), total "6 de 6 montados · 18,6 MB", botões **Editáveis (ODT)** e **Baixar os N volumes**, ou o motivo da trava. Regra = `passosDaEntrega` (já pronta). Só aparece quando há algo gerado.
- **Obra** — um trilho compacto por volume do projeto, em ordem de número de volume: miniatura da capa, uma pílula por tomo (verde = pronto, roxa pulsando = montando, âmbar = acima de 20 MB, neutra = não montado), disciplina e resumo à direita. Clique num trilho abre a conversa daquele volume (`/nexo?conversa=<id>`), na vista Volume. Só o volume da conversa aberta pulsa ao vivo; os outros mostram o último estado gravado.
- **Lista** — o `PainelDoVolume` feito hoje (capas A4 + lista de tomos), para quem prefere sem canvas.
- **Chat** — some a pilha de `VolumeConfirmation` visível. Fica **um cartão curto**: antes, "N tomos prontos para montar · Montar todos"; durante, a mini barra do conjunto (`BarraDaMontagem`); depois, "Volume pronto · ver no canvas". O detalhe de cada tomo mora no canvas.

## 2 · Animação

Tudo com `motion/react` e o sistema de `lib/ds/movimento.ts` (`DURACAO`, `CURVA`, `MOLA`). Toda animação tem versão parada sob `prefers-reduced-motion` (`useReducedMotion`): troca de estado sem movimento, texto igual.

| Momento | O que acontece | Como |
|---|---|---|
| Clique em Montar | O botão comprime e vira o anel de progresso no mesmo lugar | `layoutId` compartilhado botão↔anel |
| Conferindo a versão / preparando | Capa, separatriz e LD ganham ✓ em sequência, com salto de mola | `MOLA.snappy`, atraso escalonado |
| Juntando | Arestas da fileira "correm" (traço tracejado fluindo); folhas acendem em onda (decorativa; o texto diz "juntando 12 pranchas") | `strokeDashoffset` nas arestas do `@xyflow`; atraso por índice nas folhas |
| Volume enchendo | O nó do volume enche de baixo para cima conforme `pesoDaFase` | `motion.div` altura |
| Conferindo os carimbos | Varredura de luz folha por folha | atraso por índice |
| Pronto | Volume pulsa uma vez, ✓ se desenha, peso conta de 0 até o valor | `pathLength` + contador |
| Acima de 20 MB | Mesmo pulso em âmbar; a doca faz um tremor curto e mostra o motivo | `motion` keyframes |
| Montar todos | Tomos em sequência; o canvas desliza até o tomo em curso | `setCenter` animado do `@xyflow` |
| Obra ↔ Volume | A pílula do tomo expande e vira a fileira dele (e volta) | `layoutId` por tomo |
| Doca | Sobe do rodapé no primeiro documento gerado; passos se marcam com ✓ desenhado | `AnimatePresence` |

**Fora:** neon, partículas, `three`/`gsap` neste fluxo, bibliotecas novas.

**Honestidade do progresso:** juntar as pranchas é uma chamada só ao servidor — sabe-se a fase, não a prancha. A onda das folhas é decorativa e o texto nunca diz "prancha 7 de 12". A conferência é a única fase com progresso real por folha.

## 3 · Peças

| Peça | Papel |
|---|---|
| `modules/nexo/lib/trilho-do-tomo.ts` (puro) | Estado único de um tomo para desenhar: peças prontas (capa/sep/LD), fase (`useFasesDaMontagem`), peso, veredito, teto, falha. Testado com `node`. |
| `CabecaDoTomo` (no nó `rotulo` do `NexoCanvas`) | Estado + botões. **Montar** chama o montador registrado em `montadores-de-volume` (`montador(id)`), a mesma via de hoje. **Baixar** baixa o PDF do tomo e obedece à mesma trava da doca (`useLiberacaoDoVolume` + teto): travado, fica cinza com o motivo. |
| `animacao-do-trilho.tsx` | Arestas que correm, onda das folhas, volume enchendo, pulso de pronto — lendo a fase. |
| `DocaDaEntrega` | Visual novo sobre `useEntregaDoVolume` (já pronto). Substitui o `EntregaDoVolume` no palco; no chat o cartão curto aponta para ela. |
| `VistaDaObra` | Os trilhos compactos e a navegação para a conversa. |
| `GET /api/nexo/obra/[projectId]` | Só leitura. Por conversa do projeto do usuário: `conversaId`, número do volume (payload da capa), disciplinas, tomos planejados e, por tomo montado, `sizeBytes`, veredito da conferência. Reaproveita `tomosMontados`/`numerosDosTomos`, adaptados para ler a gravação do servidor (`blobKey` em vez de `url`). |
| `CartaoDaMontagem` (chat) | O cartão curto. Os `VolumeConfirmation` de cada tomo **continuam montados, escondidos**: são eles que registram o montador e guardam a lógica de montagem. Sai a tela, não a lógica. |
| `VistaDoVolume` → controle Obra/Volume/Lista | Padrão Volume. |

## 4 · Falhas

- **Tomo falhou:** a fileira fica com a borda vermelha, o motivo aparece no cabeçalho, e o botão vira "Tentar de novo". Os outros tomos seguem (`montarEmLote` já não para no erro).
- **Aba travada** (conversa mudada noutra aba): botões cinza com o motivo de hoje (`motivoParaNaoGastar`).
- **PDF fora deste navegador** (`bytesAusentes`): o tomo aparece "montado em outra máquina" com o botão **Remontar**. Na doca, a trava diz "O PDF montado não está neste navegador. Monte de novo para baixar."
- **Rota da Obra falha:** a vista Obra mostra "não deu para carregar os volumes · tentar de novo". A vista Volume não é afetada.
- **Conversa de outro projeto ou de outro usuário:** a rota só lista conversas do mesmo `projectId` e do usuário da sessão.

## 5 · Testes

- `scripts/test-nexo-trilho-do-tomo.ts`: estado do tomo em cada fase, teto, falha e `bytesAusentes`.
- `scripts/test-nexo-obra.ts`: o resumo por conversa a partir de registros como os gravados (com `blobKey`, sem `url`), com o volume ordenado pelo número.
- Os existentes continuam: `test-nexo-entrega-painel` (17) e `test-nexo-progresso-da-montagem` (7).
- No navegador, **com a aba em primeiro plano** (aba oculta congela o pdf.js): montar o 084-25 vol. 6 (6 tomos) e o vol. 10 (27,6 MB, acima do teto), gravando GIF da montagem; alternar Obra ↔ Volume.

## 6 · Ordem de entrega

1. **Trilho vivo + doca** no Volume (é o que se sente primeiro).
2. **Cartão curto** no chat.
3. **Vista Obra + rota.**
4. **Transição Obra ↔ Volume.**

Base: os 6 commits locais de 06/10 (entrega com teto, progresso da montagem, painel → "Lista", chips do chat). Antes do push deles, o padrão do palco volta a ser o canvas.

## 7 · Antes de gerar: a capa no canvas (aprovado em 06/10/2026)

Teste real: o frame da capa ("Ver como sai") só existia no chat, os campos a conferir não se destacavam e os chips "Volume 1…4" com lápis confundiam.

- **Divisão já visível:** antes de gerar, o canvas usa o `numTomos` do plano para desenhar uma fileira por tomo (antes mostrava "Volume · 16 folhas" com o plano propondo 2 tomos).
- **A capa no lugar dos documentos:** enquanto não há capa nem LD, cada fileira mostra no lugar da capa o `FrameDoDocumento` do plano, editável ali, com `TOMO 0N` da fileira.
- **Destaques:** âmbar = falta decidir (número do volume, título, prefeitura — as travas do Gerar); tracejado violeta = sugerido pelo Nexo (campo com derivado e sem decisão); sem moldura = do carimbo. O volume em falta traz botões 1–4 dentro do campo.
- **Uma fonte:** editar no canvas chama o mesmo `aoEditarNoFrame` do plano (decisões da conversa). O plano mais recente publica o frame junto com o gerar (`useGeradorDoPlano().gerador.frame`).
- **Botão do tomo:** "Confirmar e gerar" (o gerar do plano), aceso só sem pendência; a frase do cabeçalho diz a pendência ("diga o número do volume").
- **Chat:** some o chip de sugestão do slot `volume` (o número se decide no frame).
