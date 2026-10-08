# 04 — Perfil 3: usuário avançado / eficiência

**Persona:** quem audita vários memoriais por semana e quer fazer cada um com o mínimo de gestos. Usa teclado, desconfia de todo botão e de toda confirmação, e nota quando duas coisas fazem a mesma ação.

**Pergunta central:** quantas interações podemos eliminar sem perder clareza, controle e segurança?

**Resposta curta: na preparação, 3 de 6 interações saem sem perder nenhuma garantia. Na revisão, o teclado já é bom; o atrito vem das ações repetidas em quatro lugares e da largura. Há 1.600+ linhas de componentes de resultado mortos que ainda confundem quem mantém a tela (e o tour).**

## Contagem de interações (medida na execução)

| Tarefa | Hoje | Proposto | Corte | O que garante que nada se perde |
|---|---|---|---|---|
| Painel → auditoria rodando (código lido) | **6** + 1 rolagem | **2** (soltar o PDF no Painel; "Conferi — auditar") | −4 | A conferência explícita da obra continua: o clique único **é** a declaração "conferi" |
| Idem, sem código lido | **8** | **3** (escolher projeto na ficha, antes) | −5 | O projeto continua obrigatório antes de gastar |
| Tratar 1 achado (abrir, decidir) | 2 (tecla 2, tecla C) | 2 | 0 | — |
| Tratar 5 achados | 2 + 5×(J + C) = 12 teclas | igual | 0 | Já eficiente |
| Atribuir 5 achados à mesma pessoa | marcar 5 + menu + pessoa = 7 | igual (lote já existe) | 0 | — |
| Atribuir e avisar | atribuir (2) + "Notificar" + confirmar (2) = 4 | 3 (oferta de aviso após atribuir) | −1 | O envio do e-mail continua explícito |
| Ver o veredito por escrito | hover no anel ou clique no anel = 1 | 0 | −1 | — |
| Auditar a revisão B do mesmo memorial | soltar + "Auditar o memorial" + marcar + "Auditar" = 4 | 2 | −2 | Comparação com a base continua visível e recusável ("não usar esta base") |

## Mapa de todos os controles da jornada

Inventário completo no doc 05. O que o avançado vê:

**Preparação (chat):** chips da saudação (3), "Escolher o memorial", clipe do compositor, lápis × 7 linhas da ficha, "Auditar o memorial", "Copiar resposta" (× cada fala), "Pensou por" (expande), caixa "Conferi…", "Auditar", "Auditar sem transcrever", "não usar esta base", "usar mesmo assim", seletor de projeto + "Auditar neste projeto", chip do anexo "tratar como prancha", "Remover".

**Resultado (palco, compacto):** anel (→ Resumo completo), Resumo, Achados, Relatório, No documento, Perguntar ao Nexo, Parecer em PDF; cabeçalho do palco: "Auditoria / Mapa do volume", expandir, ocultar conversas, ocultar chat.

**Fila:** busca, Exibição (filtros/ordem/agrupar), Pendentes/Meus/Corrigidos/+menu, "Avisar por e-mail", por linha: marcar (lote), Marcar corrigido (rápido), Atribuir (rápido); detalhe: anterior/próximo, copiar link, Atribuir, Procede, Gravidade errada (menu), páginas, Evidência/Conversa/Histórico, Marcar corrigido, Decisão técnica, Falso positivo, "Faltou apontar algum problema?", sugestões da IA.

**Fala final no chat:** citações (3), "O que trava a emissão?" / "O que precisa de decisão técnica?", "Resumir para o cliente", "Ver o parecer", "Auditar de novo".

## Atritos

### P1 — Três portões em série para um único fato
- **Evidência:** `NexoWorkspace.tsx:1039-1055` (sugestão "Auditar o memorial"), `route.ts:258-272` (resposta fixa "Confirme para começar"), `ConfirmationCard.tsx:2896-2935` (caixa + "Auditar").
- **Raciocínio:** os três confirmam "a obra está certa, pode gastar". A caixa nasceu de um incidente real (141-26, 05/10/2026: capa lida errado, auditoria com régua errada). **A garantia precisa ficar**; o número de gestos, não.
- **Proposta:** uma ação só, na ficha: **"Conferi — auditar"**. A ficha ganha o que só o cartão tem (comparação com a base, aviso de páginas mudas, estimativa, seletor de projeto quando faltar).
- **Risco:** a bateria (`a1–a6`, `x2`) depende do cartão e da caixa; as jornadas mudam junto. A rota `ehOPedidoDoBotao` passa a não ser necessária.

### P2 — Atribuir em quatro lugares, "corrigido" em dois, link em dois
- **Evidência:** ver doc 05 (R4–R6).
- **Raciocínio:** linha rápida + lote + detalhe são **contextos diferentes** (varredura, lote, leitura). Três é defensável. O que não se defende: rótulos diferentes ("Atribuir", "Atribuir a…", "Trocar", ícone de pessoa) e o `Responsavel`/`CabecaDoAchado` com um quarto menu ("Mais" com "O achado procede" repetindo o voto à vista), que **só o lab usa**.
- **Proposta:** um componente de atribuição (o `Atribuidor`, com busca) nos três contextos; apagar os menus duplicados mortos.

### P3 — Badges de atalho parecem contagem
- **Evidência:** f2/08: "Abrir a fila **2**" com 5 pendentes; f2/11: dica "Achados **2**" ao lado do ícone com badge **5**.
- **Impacto:** até o avançado lê "2" como número de itens.
- **Proposta:** a tecla vai em estilo de tecla (`<Tecla>`, com borda), nunca no mesmo estilo do contador.

### P4 — O teclado é bom, mas invisível e com uma lacuna
- **Evidência:** 1/2/3/4, J/K, C/D/F, M, Z existem (`resultado.tsx:110-121`, `pecas.tsx`). A vista "geral" não tem tecla. Nenhum `?` lista os atalhos. A Ajuda diz "C confirma" (errado: C marca corrigido).
- **Proposta:** `?` abre a lista; "0" ou "V" para o veredito; corrigir a Ajuda.

### P5 — Ações que poderiam ser automáticas
| Hoje manual | Proposta | Risco |
|---|---|---|
| Clicar "Auditar o memorial" depois da ficha | Some (P1) | — |
| Rolar até o cartão | Some (P1) | — |
| Ao abrir parecer antigo, rolar o chat até a fala final | Rolar sozinho | — |
| Esconder a barra de conversas para a fila caber | Recolher sozinho com a fila aberta abaixo de ~1500 px | A pessoa pode querer a barra; o botão de voltar já existe |
| Escolher "Transcrever e auditar" com páginas mudas | **Manter manual**: é decisão de gasto (regra do produto) | — |
| Avisar por e-mail ao atribuir | **Manter manual**, mas oferecer na hora | Mandar e-mail sem pedir é ação externa |

### P6 — Respostas falsamente "pensadas"
- **Evidência:** "propôs auditoria · 0,1s" + "Pensou por 0,1 s" numa resposta fixa (f2/08 texto).
- **Impacto:** ruído e quebra de confiança quando o avançado percebe que é teatro.
- **Proposta:** resposta determinística sem "Pensou por".

### P7 — Código morto que mantém a confusão viva
- **Evidência:** `AuditCanvas.tsx` (576 linhas, órfão), `audit-result.tsx` (`AuditResult`, órfão como tela, com exportações que a Ajuda ainda cita), `resultado/fila.tsx` (1.069 linhas, vivo só pelo `Trecho`), passo do tour `abrir-parecer`.
- **Impacto direto em UX:** a Ajuda e o tour foram escritos contra esses componentes e continuam apontando para eles.
- **Proposta:** remover em fase própria (doc 09, F3), depois de mover o `Trecho`. **Risco:** `audit-result.tsx` exporta `abrirParecerEmPdf` e tipos usados pelo trilho; mover antes de apagar.

## Nota do perfil (0–10)

| Métrica | Nota | Por quê |
|---|---|---|
| Eficiência operacional | 5 | Fila com teclado ótima; preparação com 3 portões |
| Quantidade de cliques | 5 | 6 → 2 possíveis no caminho principal |
| Redundância | 4 | Ver doc 05: 11 redundâncias, 7 elimináveis |
| Consistência de componentes | 4 | Dois sistemas visuais no chat (ficha × cartão monoespaçado, f2/05); abas que mudam de nome |
| Descoberta (atalhos) | 4 | Existem; ninguém fica sabendo |
