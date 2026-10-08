# 09 — Backlog de melhorias

Ordem dentro de cada fase: maior valor ÷ menor risco primeiro. **Esf.** = esforço estimado (P ≤ ½ dia, M ≤ 2 dias, G > 2 dias). **Risco** aponta lógica de negócio ou contrato afetado.

## Fase 0 — Correções rápidas (sem mexer em regra, ~3–4 dias)

| # | Item | Resolve | Esf. | Risco | Aceite |
|---|---|---|---|---|---|
| 0.1 | Faixa escrita do veredito no topo do palco do resultado | U02 | P | nenhum (lê `avaliarEmissao`) | Texto visível sem hover em todas as leituras |
| 0.2 | Sugestão "Auditar o memorial" desliga após uso; pedido repetido não cria 2º cartão | U05 | P | bateria a3/a5 (reauditar) | 2 cliques = 1 cartão |
| 0.3 | Tour **não** abre sozinho (remover o gatilho automático; manter "Como funciona o Nexo") | U03 | P | jornadas que fecham o tour com "Pular" continuam passando | Navegador limpo sem balão |
| 0.4 | Ajuda reescrita contra a tela viva + teste de rótulos | U04 | M | — | Teste falha com rótulo inexistente |
| 0.5 | Não-PDF: mensagem clara; `/api/nexo/classify` responde 4xx | U06 | P | — | Mensagem ≤2 s, sem 500 |
| 0.6 | Prancha na tarefa de auditar: avisar que não é memorial | U07 | P | `run-turn` / slot de prancha | Frase "não é o memorial" antes das ofertas |
| 0.7 | Fila: recolher a barra de conversas ao abrir a fila abaixo de 1500 px | U11 | P | — | Botões de encerrar inteiros a 1366 e 1440 |
| 0.8 | Retomar: chat rola até a fala final da auditoria | U13 | P | — | "Auditei…" visível ao abrir |
| 0.9 | Teclas no estilo `Tecla`, nunca no do contador | U14 | P | — | Nenhum número de atalho ao lado de contagem sem borda |
| 0.10 | Sem "Pensou por" nem fala do usuário fabricada em resposta fixa | U15 | P | jornadas que esperam "audita o memorial" no texto | — |
| 0.11 | Glossário (gabarito→referência, centro de custo→código, sem "análise profunda", "tratar como prancha"→"não é memorial?") | U16 | P | contrato de seletores das jornadas | Um dado, um nome |
| 0.12 | Plurais: `ponto(s)…`, `igual(is)`, `achado(s)` em `lib/audit-report.ts` e delta | U17 | P | textos vão ao PDF e ao chat | Nenhum "(s)" em texto gerado |
| 0.13 | "Nova conversa" mantém a tarefa | U21 | P | — | Convite da tarefa preservado |
| 0.14 | Pós-F5 sem "Enviando o documento"; título × anel sem sobreposição | U22, U23 | P | — | — |
| 0.15 | Chips da saudação somem quando há `intencao` | R11 | P | — | — |
| 0.16 | "Perguntar ao Nexo" só com o chat oculto | R10 | P | — | — |

## Fase 1 — Começar em 2 cliques (estrutural, ~1 semana)

| # | Item | Resolve | Esf. | Risco |
|---|---|---|---|---|
| 1.1 | Ficha vira o cartão único: "Conferi — auditar", projeto, base, páginas mudas, estimativa | U01, U18, R2, R3 | G | **Alto**: id da auditoria por proposta (`auditoria-da-proposta.ts`), migração de conversas antigas, reconexão, jornadas a1–a6/x2. Manter a garantia do 141-26 |
| 1.2 | Palco da preparação mostra a capa do memorial; sem aba "Volume" sem pranchas | U08 | M | `PalcoDoNexo` é compartilhado com volume |
| 1.3 | Rota `ehOPedidoDoBotao` aposentada (ou só rola até a ficha) | P1 | P | depende de 1.1 |

**Aceite da fase:** arquivo solto → auditoria rodando em ≤2 cliques (código lido) ou ≤3 (sem código); bateria completa verde; teste real (`teste-real-do-nexo.mjs auditoria`) atualizado para o fluxo novo.

## Fase 2 — Resultado legível e orientação contextual (~1 semana)

| # | Item | Resolve | Esf. | Risco |
|---|---|---|---|---|
| 2.1 | 4 abas com nome no topo do palco; "Resumo completo" fundido no Resumo; "Onde estão" vira link | U09, U10, U25, R8 | M | **Precisa de aprovação no lab** (resultado-e é referência aprovada) |
| 2.2 | Tutorial contextual M1–M5 + "Usar um memorial de exemplo" | U03 | M | Parecer de exemplo sem IA (reaproveitar `exemplo-auditoria`) |
| 2.3 | `?` lista atalhos; tecla para o veredito | P4 | P | — |
| 2.4 | Segunda linha do veredito depois do tratamento (sem mudar `avaliarEmissao`) | U26 | P | Se ele preferir mudar a regra: **alto** (PDF, chat, totalFindings) |

## Fase 3 — Histórico, colaboração, limpeza (~1 semana)

| # | Item | Resolve | Esf. | Risco |
|---|---|---|---|---|
| 3.1 | Título de conversa de auditoria "Auditoria · obra · rev."; conversa sem ação fora do histórico; cidade normalizada | U12, U24 | M | Títulos gravados (`titulo-da-conversa.ts`); conversas antigas |
| 3.2 | Atribuir com um componente; estado do aviso no achado; "Avisar agora" | U19, R4 | M | e-mail é ação externa: continua explícito |
| 3.3 | Exportar: PDF + "Copiar texto do parecer" (se D3 = sim) | U20 | P | — |
| 3.4 | Apagar `AuditCanvas.tsx`, `AuditResult` como tela, `resultado/fila.tsx` (mover `Trecho`), menus mortos do `CabecaDoAchado`/`Responsavel` | P7, R6, R7 | M | `audit-result.tsx` exporta `abrirParecerEmPdf` e tipos usados pelo trilho; o lab importa `CabecaDoAchado` |

## Fora de escopo, registrado

- Dicas da tarefa "Montar um volume" (os 5 passos de volume do tour atual).
- Mudar a regra de emissão para considerar desfechos (D2, doc 10).
- Responsividade abaixo de 1280 px (há aviso de tela pequena).
