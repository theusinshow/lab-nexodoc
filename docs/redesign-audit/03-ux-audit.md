# 03 — Auditoria de UX

Critério: a premissa registrada pelo dono.

- O Nexo é um chat que audita (01/10).
- O uso é pontual: abre para uma tarefa e fecha (30/09).
- A tela é técnica e seca.
- Não há animação que segure a tela.

Cada fluxo foi percorrido no `/prototipo` (1440×900) e no app atual (3400).

## Fluxos percorridos

| Fluxo | Atual | Redesenho | Veredito |
|---|---|---|---|
| Entrar | Google, ou dev → `/nexo` | Google, ou dev → Painel | Igual em passos. O recado ao responsável agora fica sempre à vista: melhor. |
| Auditar um memorial | `/nexo` → soltar PDF → confirmar → canvas Auditoria → Resultado no palco | Painel ou Conversa → soltar → "Auditar ↵" → Nexo: a auditoria (rodando) → pronta | Mesmo número de passos. O redesenho deixa o resultado e o chat lado a lado (pedido do dono). Duas portas de entrada (UX-001). |
| Tirar dúvida sobre a auditoria | Chat do Nexo ao lado do canvas | Chat ao lado do palco; citação abre o achado; "Perguntar ao Nexo" no Resultado em tela cheia | Melhor no desenho, mas as respostas são roteirizadas (UX-003). |
| Tratar um achado | Fila → detalhe → C/D/F, atribuir, e-mail | Fila → detalhe (Evidência / Conversa / Histórico), grupo de botões com tecla, "Ver no memorial" com destaque | Melhor: a ação principal fica separada, as teclas aparecem e o trecho é marcado. |
| Montar volume | `/nexo` (conversa + canvas) **ou** `/volumes` (manual) | Nexo: montar o volume (conversa + canvas) | O caminho por conversa ficou melhor (arrasto, setas). O manual sumiu (PARITY-003). |
| Achar uma obra | Ctrl K no Nexo, ou `/projetos` | Ctrl K em qualquer tela, ou Projetos | Melhor no alcance; quebrado em 3 telas (QA-001). |
| Ver o que está comigo | Painel "Precisa da sua atenção", `/achados` | Sino "Com você" no Topo, Achados | Equivalente. Os números batem entre Topo, Projetos e Achados: 4 achados em 2 obras, conferido por `prova-coerencia.mjs`. |
| Apagar uma obra | Menu da obra no Nexo | Projeto → Configurações → segurar | Mais seguro; mais longe (PARITY-004). |

## Pontos fortes (com evidência)

1. **A tela abre no estado final.** Em repouso, nenhuma animação infinita fora do orbe e dos indicadores de progresso real. Medido com `document.getAnimations()` 4 s depois de abrir, em 11 situações (`teclado-e-movimento.json`):

   | Situação | Animações infinitas |
   |---|---|
   | Painel, Resultado, Projetos, Admin | 0 |
   | Auditoria rodando | orbe, anel de progresso, leitura do bloco atual |
   | Conversa respondendo | cursor de escrita |
   | Mapa lendo selos | varredura |

   Com movimento reduzido, todas as infinitas param (0 em 11). Cumpre a regra "sem animação que segura".
2. **Teclado de verdade:**
   - J/K nas listas;
   - C/D/F na fila;
   - `↵` na ação principal;
   - `/` para buscar;
   - N para novo;
   - rodapé de teclas em cada painel.

   A ordem de Tab segue a leitura (Topo → conteúdo), e o "Pular para o conteúdo" é o primeiro.
3. **Uma ação principal por contexto.** A ação principal é o único botão claro em cada lado (Projetos, Projeto, Mapa) e no grupo de botões da fila.
4. **Dados coerentes entre telas:** a 117-25 tem a mesma história em Painel, Projetos, Projeto, Achados, Resultado e Nexo.
5. **Estados de erro e vazio desenhados**, sem tela em branco: busca vazia, falha de rede, parecer com erro, PDF remoto, sem token.

## Problemas

| ID | Sev. | Resumo |
|---|---|---|
| UX-001 | P2 | Painel e Conversa nova oferecem o mesmo começo, com nomes diferentes para a mesma tarefa |
| UX-003 | P2 | A premissa (perguntar ao Nexo) não é testável: respostas fixas |
| UX-002 | P3 | Ctrl A e Ctrl L disputam com o navegador; "montagem de LDs" perdeu destino |
| QA-001 | P2 | Ctrl K morto em Projetos, Projeto e Achados (afeta o fluxo "achar uma obra") |
| PARITY-003/004/005 | P1–P3 | Caminhos que sumiram: montagem manual, limpeza pelo membro, tour |

Detalhes em `09-master-issue-list.md`.

## Não verificado

- Tempo real de tarefa com usuário. Não houve teste com pessoa, só percurso meu.
- Carga cognitiva com 200 achados ou 400 folhas. O protótipo tem 9 achados e 33 folhas.
