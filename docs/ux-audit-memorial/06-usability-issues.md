# 06 — Problemas de usabilidade (lista consolidada)

Escalas:
- **Gravidade:** 4 crítico (impede ou induz erro), 3 alto, 2 médio, 1 baixo.
- **Frequência estimada:** toda auditoria / frequente / ocasional / raro. É estimativa de analista, não medição.
- **Confiança da evidência:** **E** = observado em execução real; **C** = lido no código; **I** = inferência sobre a persona.
- **Tipo:** **Q** = correção rápida (≤1 dia, sem mudar regra); **S** = estrutural.

| ID | Problema | Grav. | Freq. | Conf. | Tipo | Perfis |
|---|---|---|---|---|---|---|
| U01 | Três confirmações para começar; dados repetidos com nomes diferentes | 3 | toda | E+C | S | 1,2,3 |
| U02 | Veredito não aparece escrito no palco do resultado | 4 | toda | E | Q | 1,2 |
| U03 | Tour automático intermitente, sobre a tarefa, sobre volume, com alvo morto | 3 | 1º acesso | E+C | S | 1 |
| U04 | Ajuda cita controles inexistentes e tecla errada (C) | 3 | ocasional | C | Q | 1,2 |
| U05 | Botão já usado continua ativo; clique repetido duplica a proposta | 3 | frequente | E | Q | 1,3 |
| U06 | ~~Arquivo não-PDF falha em silêncio (HTTP 500)~~ **falso positivo** (ver ficha) | 1 | raro | E | Q | 1 |
| U07 | Prancha na tarefa de auditar vira oferta de LD | 2 | ocasional | E | Q | 1,2 |
| U08 | Palco vazio com abas de volume durante a preparação | 2 | toda | E | S | 1,2 |
| U09 | Duas leituras "Resumo"; a com veredito só pelo anel | 3 | toda | E+C | S | 2,3 |
| U10 | Trilho só com ícones no palco | 2 | toda | E | Q | 1,2 |
| U11 | Fila corta "Decisão técnica"/"Falso positivo" a 1440 px | 3 | frequente | E | Q | 2,3 |
| U12 | Histórico com títulos genéricos e cidades duplicadas sem acento | 2 | frequente | E | S | 2 |
| U13 | Ao reabrir, chat fica no topo, longe da fala final | 2 | frequente | E | Q | 2 |
| U14 | Badge de atalho igual a contador | 2 | toda | E | Q | 1,2,3 |
| U15 | "Pensou por 0,3 s" e fala do usuário fabricada | 1 | toda | E | Q | 1,3 |
| U16 | Jargão: gabarito, centro de custo, análise profunda, tratar como prancha | 2 | toda | E | Q | 1 |
| U17 | Plurais crus: "ponto(s) técnico(s)/contratual(is)", "1 igual(is)" | 1 | frequente | E | Q | 1 |
| U18 | Projeto só é pedido depois do clique em Auditar | 2 | ocasional | C | S | 1,3 |
| U19 | Atribuir não avisa; aviso é passo separado e longe | 2 | frequente | C | S | 2 |
| U20 | Exportação reduzida a PDF; sem texto para colar | 2 | frequente | E+C | S | 2 |
| U21 | "Nova conversa" na tarefa perde a tarefa | 2 | ocasional | E | Q | 2 |
| U22 | Pós-F5: "Enviando o documento…" aos 46 s | 1 | raro | E | Q | 1 |
| U23 | Título e anel se sobrepõem no painel em curso a 1440 px | 1 | toda | E | Q | — |
| U24 | Painel "Continuar": linhas idênticas "sem obra · HID · volume" | 2 | frequente | E | Q | 2 |
| U25 | Quadradinhos "Onde estão" sem número nem legenda útil | 1 | toda | E | Q | 2 |
| U26 | Não há "concluir"; "tratado" não diz se o parecer pode sair | 2 | toda | I+C | S | 1,2 |

## Fichas (evidência · impacto · exemplo · solução · aceite)

### U01 — Três confirmações
- **Evidência:** f1/06→07, f2/02–03; `NexoWorkspace.tsx:1033-1052`, `route.ts:258-272`, `ConfirmationCard.tsx:2896-2935`.
- **Impacto:** +4 gestos por auditoria, e o hábito de marcar a caixa sem ler, que derrota a garantia que ela protege.
- **Exemplo:** o engenheiro audita a revisão B: ficha → botão → rola → caixa → Auditar, quando já tinha conferido a obra na revisão A.
- **Solução:** ficha com um único "Conferi — auditar" (doc 07, F1).
- **Aceite:** arquivo solto → auditoria rodando em ≤2 cliques com código lido; garantia preservada (nenhuma auditoria parte sem clique explícito na ficha).

### U02 — Veredito invisível
- **Evidência:** f2/08, f3/05.
- **Impacto:** a decisão "posso emitir?" depende de cor e hover. Também falha em acessibilidade: informação só por cor.
- **Exemplo:** o técnico vê "Falta tratar 5" e acha que o parecer está pronto, porque nenhum vermelho aparece.
- **Solução:** faixa "Revisar antes de emitir: 5 pontos pedem decisão técnica" no topo do palco, em todas as leituras.
- **Aceite:** texto do veredito visível sem hover em ≥1280 px, em todas as leituras; contraste AA.

### U03 — Tour
- **Evidência:** f3/06–11; `NexoWorkspace.tsx:2140-2170`; `passos-do-tour.ts` (5 de 11 passos sobre volume; `abrir-parecer` só no `AuditCanvas` órfão).
- **Solução:** doc 08.
- **Aceite:** ver doc 08, "Critérios".

### U04 — Ajuda desatualizada
- **Evidência:** `components/telas/ajuda/dados.ts` (tarefas "tratar" e "levar"); `pecas.tsx:988` (C = corrigido).
- **Impacto:** procura de botão inexistente; tecla C encerra o achado quando a pessoa achava que "confirmava".
- **Solução:** reescrever as tarefas; teste que confere cada `caminho` contra os rótulos vivos (o contrato de seletores do projeto já existe: `docs/contrato-de-seletores.md`).
- **Aceite:** o teste falha se a Ajuda citar rótulo ausente da tela.

### U05 — Proposta duplicada
- **Evidência:** f2 log e texto (2 cartões; o duplicado com "Auditar" depois do parecer).
- **Aceite:** ver doc 05, R12.

### U06 — Não-PDF mudo — FALSO POSITIVO (corrigido em 08/10/2026)
- O teste injetou o .docx no input de `/api/nexo/classify`, que só a gaveta de depuração (`DEBUG`) alcança. Pelos caminhos reais (soltar o arquivo, clipe do compositor) o `readSelos` já recusava com "X não é aceito". O que ficou: a frase falava só de prancha; agora diz "O Nexo lê PDF — o memorial ou as pranchas".

### U07 — Prancha onde se esperava memorial
- **Evidência:** f3/08.
- **Aceite:** ver doc 02, B10.

### U08 — Palco vazio na preparação
- **Evidência:** f1/06–07, f3/11.
- **Solução:** palco mostra a capa do memorial (miniatura real, já existe `react-pdf` no projeto) e "o que vai acontecer"; sem aba "Volume" sem pranchas.
- **Aceite:** em `intencao=auditar` sem pranchas, nenhuma aba de volume visível.

### U09 / U10 / U25 — Leituras do resultado
- **Evidência:** `trilho.tsx`, `resultado.tsx:110-118`, f2/08–13.
- **Solução:** doc 07, F3: 4 abas com texto no topo do palco; o Resumo absorve o "geral".
- **Aceite:** 4 leituras, todas por tecla (1–4) e por rótulo; nenhuma só por anel.

### U11 — Fila cortada
- **Evidência:** f2/11.
- **Aceite:** a 1366×768 e 1440×900, os três botões de encerrar e o selo de disciplina visíveis inteiros.

### U12 / U24 — Histórico ilegível
- **Evidência:** f1/02, f2/11 (lista da barra lateral).
- **Aceite:** conversa com parecer tem título "Auditoria · <obra> · rev. X"; linhas do "Continuar" se distinguem pela obra.
- **Correção de 08/10/2026:** "Criciuma" e "Criciúma" NÃO eram a mesma obra em dois grupos — cada grupo é uma obra (código), e o nome sem acento vem do carimbo lido. Saiu do escopo.

### U13 — Retomada rolada no topo
- **Evidência:** f3/05.
- **Aceite:** ao abrir conversa com parecer, a fala "Auditei…" fica visível.

### U14 — Atalho × contador
- **Evidência:** f2/08 "Abrir a fila 2", f2/11 dica "Achados 2".
- **Aceite:** tecla sempre no componente `Tecla` (borda), nunca no estilo do contador.

### U15 / U16 / U17 / U22 / U23 — Microcopy e acabamento
- **Evidência:** f1/07, f2/05, f2/07, f2/09, f2/08 texto.
- **Aceite:** sem "(s)" nem "(is)" em nenhum texto gerado; glossário do doc 02 aplicado; sem "Pensou por" em resposta fixa; pós-F5 o painel não diz "Enviando" depois de reconectar.

### U18 — Projeto pedido tarde
- **Evidência:** `ConfirmationCard.tsx:2995-3036` (o seletor aparece depois de `confirm`).
- **Aceite:** sem código lido, a ficha já mostra "Esta obra é de qual projeto?" antes do botão de auditar.

### U19 — Atribuir × avisar
- **Evidência:** Ajuda ("Atribuir não manda e-mail"), `pecas.tsx:230-265`.
- **Aceite:** depois de atribuir, o achado mostra o estado do aviso e oferece "Avisar agora".

### U20 — Exportar
- **Evidência:** `trilho.tsx:184`; `audit-result.tsx` órfão.
- **Decisão de produto pendente:** ver doc 10, D3.

### U21 — Tarefa perdida
- **Evidência:** f3/07.
- **Aceite:** "Nova conversa" dentro de uma tarefa mantém o convite da tarefa.

### U26 — Sem fim declarado
- **Evidência:** não há "concluir" (`trilho.tsx` só tem o anel). Inferência sobre a persona: o iniciante não sabe se precisa tratar todos.
- **Solução:** quando todos forem tratados, o veredito recalcula e diz "Pode emitir com ressalvas" ou "Ainda há 1 bloqueio". **Sem botão "Concluir"**: a conclusão é o estado do parecer, não uma ação nova (não adicionar funcionalidade).
- **Confirmado no código:** `avaliarEmissao(report)` (`lib/audit-report.ts:1080`) lê só o relatório (achados principais, incompletude, motor) e **ignora os desfechos**. Com 5 de 5 tratados, o anel fecha e o selo continua "Revisar antes de emitir". O iniciante lê isso como "ainda não terminei".
- **Risco de regra:** fazer o veredito considerar os desfechos **mexe na regra de emissão** (e no PDF, no chat e no `Audit.totalFindings`, que usam a mesma regra única). Isso é decisão do Matheus. A alternativa sem mexer na regra é uma segunda linha: "Veredito da auditoria: Revisar · Depois do tratamento: 5 de 5 tratados, nenhum bloqueio em aberto".
