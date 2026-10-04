# 04 — Auditoria de UI

Medido no DOM renderizado (estilo computado) e nas capturas em 1440, 1920 e 2560.

## O que está consistente

- **Uma família tipográfica:** Geist e Geist Mono em todas as telas. A Entrada carrega também "Times New Roman" como fallback de um elemento do filme.
- **Cor só para sinal:** níveis do achado (vermelho, âmbar, cinza, azul), estado (verde, âmbar) e violeta só para o atual, a seleção e o orbe. Nenhum gradiente decorativo nas telas de trabalho.
- **Botão principal:** pílula clara de 34 px nas telas de trabalho, igual em Projeto, Mapa e 404. O admin usa 38 px e 28 px (Pessoas), o que é diferença de densidade, não erro.
- **Superfícies:** painel único por tela, com borda fina e raio do token. A regra "nada de barra colorida à esquerda" vale para cartões e linhas da lista. As linhas da fila "Falta tratar" do Nexo: a auditoria têm um traço de nível de 2 px à esquerda. Ele é sinal, não decoração, mas fica no limite da regra.

## Problemas

| ID | Sev. | Resumo | Evidência |
|---|---|---|---|
| UI-001 | P1 | Telas estreitas quebram (390, 768); o atual não quebra | `issues/UI-001-*` |
| UI-004 | P3 | 5 estilos de `h1` (24/400, 28/300, 30/300, 30/500, 30/600); 2 telas sem `h1` | medição DOM |
| UI-005 | P3 | Em 2560, as linhas da fila passam de 1.000 px | `issues/UI-005-nexo-auditoria-2560.png` |
| A11Y-004 | P2 | Texto terciário abaixo de 4,5:1 nas superfícies elevadas | axe |

## Por tela (1440)

| Tela | Observação |
|---|---|
| Entrada | Porta de 448 px e filme. Sem defeito visual. |
| Painel | Saudação no `h1` (SLOP-001); faixa "O Nexo no escritório" discreta; tarefas em fileira. |
| Nexo: a auditoria | 3 colunas e trilho. Em 1440 cabe sem corte; em 1024 aperta; em 768 sobrepõe (UI-001). |
| Conversa | Coluna de 760 px, sem balão para o Nexo. Limpa. |
| Montar volume | Canvas e chat. Os cartões-carimbo só se leem no zoom de enquadramento (decisão registrada). |
| Mapa | Miniaturas com texto de 3,6 px: é desenho, não leitura, e deveria sair do axe (A11Y-004). |
| Auditoria rodando | Linha do tempo de blocos com 20 px de altura (A11Y-007). |
| Resultado | Abas deslizantes, trilho com dica. Denso e legível. |
| Achados / Projetos / Projeto | Mesma grade (`mapa.css`); coerentes entre si (UI-006 é sobre o acoplamento, não sobre a aparência). |
| Admin | Gráficos neutros (dataviz validado); cartões com seta sem destino (QA-006). |
| Ajuda | Abas e busca. Sem defeito visual. |
| 404 / erro | Desenhadas, com saída clara. Melhor que o atual (página branca do Next em inglês). |

## 2560

Projetos usa a largura inteira (tabela de 2.480 px) e lê bem, porque as colunas têm sentido. No Nexo: a auditoria, a lista do palco estica sem limite de leitura (UI-005). Painel e Resultado têm largura máxima de cerca de 1.300 px, coerente com a leitura.
