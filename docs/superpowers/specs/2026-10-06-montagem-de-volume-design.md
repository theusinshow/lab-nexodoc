# Montagem de volume — redesenho de UX (06/10/2026)

Desenho aprovado parte a parte com o Matheus em 06/10/2026. Substitui o fluxo de
montagem por proposta do agente (chips → "Gerar os N" → "Montar o volume" →
um cartão por tomo) por um **piloto determinístico** que conduz tudo depois de
uma única pergunta.

## Por que

Mapa do fluxo atual (06/10/2026):

- 12 decisões/cliques manuais até ter o volume baixado.
- Com vários tomos, um `VolumeConfirmation` por tomo empilha cartões altos; os
  botões de baixar (`VolumesDoConjunto`, `ConfirmationCard.tsx`) ficam no topo e
  é preciso rolar de volta para baixar.
- O "frame da capa" (`FrameDoDocumento.tsx`) é um formulário que estica na
  largura do chat — não uma página A4 — e nada destaca os campos a conferir.
- Depois do F5 as pranchas somem (`limparPranchas`) e o único aviso é um botão
  desligado com texto cinza.
- A instrução de salvar os editáveis na pasta do projeto é uma linha `text-xs`;
  a trava do PDF só aparece num `title`.

## Decisões

| Pergunta | Decisão |
|---|---|
| Quanto automatizar | Um passo só: o usuário solta as pranchas e informa o **número do volume** (o impresso na capa). |
| Quando o Nexo tem dúvida | **Pergunta antes de gerar**, uma vez, junto com o número do volume. |
| F5 / outra máquina | **Guardar as pranchas no servidor** e não pedir mais. |
| Entrega | **Dois botões lado a lado**: editáveis (ODT) e volumes (PDF). |
| Onde conferir | **Os dois**: cartão curto no chat + painel completo no palco. |
| Abordagem | **Piloto determinístico** no app; a IA lê selos, confere identidade e traduz pedidos — não conduz os passos. |
| Alteração pelo chat | **Aplica na hora, com Desfazer.** |

## Parte 1 — O fluxo

1. **Soltar as pranchas.** Os arquivos sobem para a guarda do servidor
   (`StoredFile`, a mesma do memorial) enquanto os carimbos são lidos. Uma
   linha de progresso no chat: "Lendo os carimbos — 34 de 61".
2. **Uma pergunta só** — o cartão "Antes de gerar" (Parte 2).
3. **O piloto trabalha sozinho:** gera capa, LDs e separatrizes (por bloco de
   disciplina, como hoje), monta todos os tomos e roda a conferência. Progresso
   como passos numa linha, não uma caixa por tomo.
4. **Pronto:** cartão curto no chat + painel do volume no palco (Parte 4).

Somem do caminho: os chips de intenção ("Criar a LD e a capa"…), "Gerar os N",
"Montar o volume", "Montar os N volumes", o cartão por tomo e o reanexar depois
do F5. O canvas, arrastar folha e editar no frame continuam, como opcionais.

## Parte 2 — O cartão "Antes de gerar"

A única parada. Três blocos:

1. **O que eu entendi** (só leitura): obra, prefeitura, código, data;
   disciplinas com contagem; a divisão em tomos proposta e o motivo em uma
   linha. Valor deduzido mostra a origem ("pela capa", "pelo nome do arquivo").
2. **O que eu preciso de você** (em âmbar, nesta ordem):
   - **Número do volume** — sempre; campo numérico, e ao lado como ele vai
     impresso, **no formato do modelo de capa da prefeitura** (o 141-26 de
     Chapecó imprime "Vol. I"; não inventar "Vol. 03" onde o modelo é romano).
   - **Uma linha por dúvida**, só se houver, com opções em botões: prefeitura
     ambígua; folhas sem disciplina reconhecida; carimbo ilegível (Parte 6);
     data ausente.
3. **"Gerar o volume"** — liga quando tudo o que foi perguntado tem resposta; o
   motivo aparece ao lado enquanto desligado.

Responder pelo chat ("volume 3, prefeitura Içara") preenche o mesmo cartão. Não
entram aqui: título de cada tomo, campos da capa, número de tomos — o Nexo decide
e o usuário ajusta depois (Parte 3).

## Parte 3 — Alterações pelo chat

- O usuário pede em linguagem natural, durante ou depois da geração.
- **A IA só traduz** a frase numa lista de **alterações estruturadas**:
  `campoDaCapa`, `tituloDoTomo`, `moverFolhas`, `numeroDeTomos`, `prefeitura`,
  `numeroDoVolume`, `tirarFolha`, `devolverFolha`.
- **O piloto aplica** pela mesma regra que gerou o volume. Edição feita no
  painel vira a mesma alteração estruturada: **um motor só**.
- **Regenera só o afetado** (título do tomo 2 → capa e LD do tomo 2; mover
  folhas → tomos de origem e destino).
- Resposta: cartão **"O que mudou"** — antes → depois, arquivos refeitos,
  conferência nova se mudou — e **Desfazer**.
- Pedido ambíguo: uma pergunta com opções em botões. Pedido impossível: diz por
  quê em uma linha e não muda nada.
- No painel, cada ponto "para olhar" tem **Corrigir**, que preenche o pedido no
  chat (ensina pelo exemplo).
- **Histórico** de alterações no painel, cada uma com Desfazer.

## Parte 4 — O painel do volume no palco

Quando o volume fica pronto, o palco troca o canvas pelo painel (o canvas fica
numa aba "Mapa").

- **Topo fixo:** "Volume 03 · Arena Belvedere · 6 tomos · 61 folhas", estado da
  conferência, e os **dois botões de baixar** (Parte 5).
- **A capa como página:** miniatura **A4 fiel (1 : 1,414)** renderizada do PDF
  gerado. Campos deduzidos/respondidos com marcação fina (origem no hover);
  campos com motivo para conferir em âmbar, editáveis no lugar (geram a mesma
  alteração da Parte 3). Vários tomos: capas lado a lado, a alterada marcada.
- **Tomos numa lista** (bloco compacto, não cartão alto): "Tomo 02 · Fundações ·
  folhas 01–13", LD em miniatura, régua de números das folhas com faltas
  visíveis, conferência em uma linha, abrir/baixar só aquele tomo.
- **"Para olhar":** cada ponto em âmbar, motivo e **Corrigir**.
- **Histórico de alterações** no pé.
- **No chat:** só o cartão curto "Volume 03 pronto · 6 tomos · 2 pontos para
  olhar", os dois botões e "Ver o painel".

## Parte 5 — Entrega, editáveis e pranchas guardadas

- **Botões, na ordem do trabalho:**
  1. **Baixar os editáveis (ODT)** — `<codigo>_<disc>_editaveis.zip` (capa, LD,
     separatriz; nomes de `nomesDosEditaveis`).
  2. **Baixar os volumes (PDF)** — ZIP dos tomos, ou o PDF direto se for um só.
- **A trava continua** (`useLiberacaoDoVolume`): volumes só depois dos
  editáveis — agora **escrita na tela**, como passo a passo que se marca sozinho:
  - ☐ 1. Baixe os editáveis e salve na pasta do projeto no servidor. ("São eles
    que a equipe edita depois.")
  - ☐ 2. Baixe os volumes (PDF). Enquanto 1 não foi feito: "Baixe os editáveis
    primeiro."
  - Uma alteração que muda um editável devolve o 1 a ☐ com o motivo ("a capa do
    Tomo 02 mudou — baixe os editáveis de novo").
- **Pranchas guardadas:** sobem ao soltar, endereçadas por conteúdo (sem
  duplicar entre revisões); F5/outra máquina não pede nada; saem com o projeto
  pelo expurgo do admin.
- **Medir antes de implementar:** tamanho real de um conjunto de pranchas A1
  (pode passar de 100 MB por volume) contra o limite de envio e armazenamento.

## Parte 6 — Falhas

Princípio: nada falha em silêncio; o que deu certo não se perde.

- **Carimbo ilegível:** a leitura das outras segue; a folha vira dúvida no
  cartão "Antes de gerar" com o número sugerido pelo nome do arquivo. Mais de
  um quarto ilegível → aviso de que o problema é do conjunto.
- **Tomo que não gera/monta:** os outros ficam prontos; o que falhou mostra o
  motivo e **Tentar de novo** só para ele; o chat diz "5 de 6 prontos"; baixar
  o conjunto só libera com todos prontos (o avulso já funciona).
- **Envio das pranchas falha:** geração segue com os arquivos do navegador;
  reenvio automático em segundo plano; se não conseguir, o painel diz que ao
  recarregar vai pedir de novo (único caso em que o F5 pede reanexar).
- **Pedido de alteração sem sentido:** nada muda; o Nexo diz o que entendeu e
  pergunta.
- **Alteração que falha ao regenerar:** não entra no histórico; o estado volta
  inteiro ao anterior.

## Parte 7 — Como provar

- **Testes puros (node):** o piloto como máquina de estados (soltar → perguntar
  → gerar → montar → conferir → pronto/falha); as alterações estruturadas
  (aplicar, o que regenerar, desfazer); quais dúvidas viram pergunta; o
  checklist da entrega voltando a ☐.
- **Tradução de pedidos:** conjunto de frases reais com a alteração esperada,
  medido contra o modelo antes de ligar.
- **Navegador, pranchas reais** (uma disciplina; conjunto misto): soltar →
  responder → baixar os dois → abrir o PDF e conferir capa → separatriz → LD →
  pranchas tomo a tomo; três alterações pelo chat, uma pelo painel, um Desfazer;
  F5 no meio sem nada pedido de novo.
- **Sucesso:** de 12 decisões/cliques para 1 resposta + 2 downloads no caso sem
  dúvida.

## Parte 8 — A linha que leva a folha até o tomo (canvas)

Só visual: escuta `aoArrastar`/`aoSoltar` do `NexoCanvas` e não toca em
`alvoDoDrop` nem em `ajusteDoDrop`.

- **Ao arrastar:** linha curva fina (1,5 px, `--ds-nexo`) da posição de origem
  até a folha na mão, acompanhando o mouse.
- **Perto de um tomo válido** (quando `alvoDoDrop` devolve destino, a mesma
  condição da fresta): a ponta é **atraída** ao ponto da fresta com mola curta;
  perto do encaixe, ondulação de 2–3 px que amortece. Afastando, solta.
- **Ao soltar num tomo:** a ponta assenta, a ondulação some, pulso fino (anel
  que abre e desbota em ~400 ms, violeta a 35%), a folha entra como hoje, a
  linha desbota.
- **Ao soltar fora:** a linha recolhe para a origem junto com a folha.
- **Várias folhas:** uma linha do centro do grupo, rótulo "3 folhas" na ponta.
- **Feito com:** camada SVG nas coordenadas do canvas (acompanha zoom e
  rolagem); molas do `motion/react`; só `transform` e o `d` do caminho.
- **Movimento reduzido:** sem ondulação e sem pulso — aparece, encaixa, some.
- **Estilo:** sem brilho, neon ou rastro; ponta com ponto de 4 px.

## Ordem de entrega

Grande demais para um plano só. Cinco partes, cada uma com plano, testes e
entrega próprios, nesta ordem (cada uma já melhora a experiência sozinha):

1. **Pranchas guardadas** (Parte 5, F5) — base de tudo: sem ela o piloto não
   sobrevive a um recarregar.
2. **Piloto + cartão "Antes de gerar"** (Partes 1, 2, 6) — o fluxo de um passo.
3. **Painel do volume + entrega** (Partes 4, 5) — capa A4 fiel, tomos numa lista,
   dois botões com o passo a passo.
4. **Alterações estruturadas pelo chat e pelo painel** (Parte 3) — com Desfazer e
   histórico.
5. **A linha do canvas** (Parte 8) — independente das outras; pode entrar a
   qualquer momento.

## Fora do escopo

- Aceitar de volta o ODT editado à mão (combinado como futuro em 30/09).
- Gravar direto na pasta do servidor (removido a pedido em 30/09; entrega é
  download).
- Mudar a regra de divisão em tomos (`planoPorDisciplina`) ou de blocos.
