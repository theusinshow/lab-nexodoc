# 10 — Veredito final de UX

## Veredito

**O Audit de Memorial funciona e é robusto. Hoje ele não é autoexplicativo.** O motor, o processamento ao vivo, a retomada depois de F5 e a fila com teclado estão num nível alto. O que impede o iniciante de concluir sozinho, e cansa o profissional, está em três lugares estreitos:
1. **a preparação**: três confirmações e dados repetidos;
2. **a leitura do resultado**: veredito sem texto, leituras escondidas ou com nome repetido;
3. **a orientação**: tour automático que ensina outra tarefa e Ajuda que descreve botões que já não existem.

Nenhum dos três exige funcionalidade nova. Todos se resolvem **tirando ou fundindo**.

## Notas (0–10, heurísticas, justificadas nos docs 02–06)

| Métrica | Nota | Justificativa curta |
|---|---|---|
| Clareza de navegação | 5 | Entrada exemplar; resultado em ícones e com duas leituras "Resumo" |
| Facilidade de aprendizado | 4 | Três portões, jargão, tour desencontrado |
| Consistência de interface | 4 | Mesmo dado com 2–3 nomes; duas tipografias no chat; abas que mudam de nome |
| Eficiência operacional | 5 | Fila com teclado boa; preparação longa |
| Quantidade de cliques | 5 | 6 até rodar (8 sem código); 2 possíveis |
| Qualidade do feedback | 7 | Processamento excelente; falhas mudas (não-PDF), veredito só por cor |
| Recuperação de erros | 6 | F5, desfazer e reabrir bons; prancha e não-PDF mal tratados |
| Descoberta de funcionalidades | 4 | "Resumo completo", reuso da base, atalhos e "No documento" escondidos |
| Redundância | 4 | 13 redundâncias; 8 elimináveis (doc 05) |
| Acessibilidade | 6 | aria-labels cuidadosos; veredito só por cor; cortes a 1440 px; badge de tecla ambíguo |
| Qualidade do tutorial | 2 | Intermitente, invasivo, 5/11 passos de volume, alvo morto |

Nenhum tempo, taxa de sucesso ou resultado com pessoas reais foi medido. As notas são de analista.

## Revisão cruzada

Os três perfis foram escritos por um analista só, em sequência (a regra do projeto proíbe subagentes). A revisão abaixo confronta as conclusões de cada perfil com as objeções que os outros dois fariam. Ela não substitui leitores independentes.

| Proposta | Iniciante questiona clareza | Comum avalia aplicabilidade | Avançado avalia eficiência | Resultado |
|---|---|---|---|---|
| Ficha única com "Conferi — auditar" | "Um botão só: vou apertar sem ler a ficha?" | "Na revisão B quero pular a conferência" | "Ainda é 1 clique a mais que soltar e rodar" | **Divergência D1** |
| Faixa do veredito | Resolve o principal medo | Aplicável já | Ocupa altura | **Consenso**: altura de 1 linha, 2 só depois do tratamento |
| Fim do tour automático | "Sem tour, quem me ensina?" | Concorda | Concorda | **Consenso com condição**: M1 (estado vazio educativo) entra junto |
| 4 abas com nome no lugar do trilho de ícones | Resolve | Resolve | Aceita; quer as teclas 1–4 | **Consenso**, pendente de aprovação no lab (D5) |
| Fundir "Resumo completo" no Resumo | — | Teme perder a linha do tempo | Concorda | **Consenso**: linha do tempo fica, recolhida |
| Veredito considerar o tratamento | "Tratei tudo e ainda diz Revisar?" | "O veredito é da auditoria, não do meu trabalho" | — | **Divergência D2** |
| Reativar "Copiar texto" | — | Quer | Quer | **Divergência D3** (é adicionar; precisa de decisão) |
| Recolher a barra ao abrir a fila | "Sumiu a lista de conversas!" | Aplicável | Quer | **Consenso** com animação de saída e botão de volta visível |
| Atribuir oferece aviso por e-mail | Ajuda | Resolve S5 | Aceita (1 clique a menos) | **Consenso**; o e-mail continua explícito |

### Divergências registradas (decisões do Matheus)

- **D1 — Quantos gestos a conferência da obra merece.**
  - O iniciante e o comum defendem manter um gesto explícito: o incidente do 141-26 foi justamente rodar com a régua errada.
  - O avançado quer rodar direto quando o código e o nome batem com o projeto já vinculado.
  - **Recomendação:** um clique ("Conferi — auditar") sempre. A conferência se paga uma vez por auditoria, e o custo de errar é uma auditoria inteira com régua errada.
- **D2 — O veredito muda com o tratamento?**
  - Hoje não muda (`avaliarEmissao` ignora os desfechos).
  - Mudar afeta o PDF, o chat e o `Audit.totalFindings` (regra única).
  - **Recomendação:** não mudar a regra; acrescentar a linha "depois do tratamento" (backlog 2.4).
- **D3 — Exportar em texto.**
  - A Ajuda promete; a tela não tem; o código existe no `audit-result.tsx` órfão.
  - **Recomendação:** "Copiar texto do parecer" no mesmo menu do PDF, ou apagar a promessa. Não reativar os quatro botões antigos.
- **D4 — Onde guardar "dica já vista".**
  - Não há modelo de preferência por usuário.
  - **Recomendação:** `localStorage` na fase 2; coluna em `User` só se as dicas repetidas incomodarem.
- **D5 — Abas no lugar do trilho.**
  - O trilho de ícones é desenho aprovado do lab (resultado-e).
  - Pela regra "não cortar o lab em silêncio", a troca vai a ele como proposta, com captura lado a lado.

## Respostas às 9 perguntas do pedido

1. **Onde o iniciante se perde:** no tour que abre por cima da tarefa; no cartão abaixo da dobra depois de "Auditar o memorial"; no botão "Auditar" desligado; e no resultado sem veredito escrito (docs 02 e 06: U01–U03, U05).
2. **Onde o comum perde tempo:**
   - conferir a obra duas vezes;
   - procurar o veredito e as leituras escondidas;
   - escanear um histórico de "Memorial · sem tarefa";
   - atribuir e depois avisar em outro lugar;
   - copiar o parecer à mão (U09, U12, U19, U20).
3. **Onde o avançado encontra atrito:**
   - três portões em série;
   - ações que se repetem com nomes diferentes;
   - tecla de atalho que parece contagem;
   - a fila cortada a 1440 px (P1–P4, U11).
4. **Botões redundantes:**
   - "Auditar o memorial" e a caixa "Conferi" (se fundem num botão só);
   - o cartão de proposta repetido;
   - os chips da saudação quando a tarefa já veio escolhida;
   - "Perguntar ao Nexo" com o chat aberto;
   - os menus "Mais" e "Atribuir a…" mortos;
   - "Resumo completo" × "Resumo" (doc 05).
5. **Telas a simplificar:** a preparação (ficha + cartão viram uma), o resultado (5 leituras viram 4 abas com veredito fixo) e o palco vazio da preparação.
6. **O que está escondido:**
   - o "Resumo completo", que só abre pelo anel;
   - a releitura só dos capítulos alterados;
   - as teclas 1–4, J/K, C/D/F, M e Z;
   - "No documento";
   - o "Desfazer (Z)";
   - "Faltou apontar algum problema?".
7. **Fluxo ideal:**
   1. Soltar o PDF.
   2. Ler a ficha com a capa ao lado.
   3. "Conferi — auditar".
   4. Acompanhar.
   5. Ler a faixa do veredito.
   6. Tratar na aba Achados (atribuir e avisar no mesmo gesto).
   7. Gerar o PDF.

   Detalhes no doc 07.
8. **Novo tutorial:** sem tour automático. São cinco momentos contextuais, cada um exibido uma vez e ligado à tarefa real:
   - estado vazio com memorial de exemplo;
   - ficha;
   - processamento;
   - primeira revisão;
   - atalhos.

   A Ajuda passa a ser testada contra a tela (doc 08).
9. **O que realmente melhora:** em ordem de impacto por esforço,
   1. faixa do veredito;
   2. tour fora do automático;
   3. Ajuda correta;
   4. proposta sem duplicar;
   5. ficha única;
   6. abas com nome.

## Os 10 problemas mais importantes

| # | Problema | Solução | Fase |
|---|---|---|---|
| 1 | Veredito não aparece escrito no resultado (U02) | Faixa fixa no topo do palco | 0 |
| 2 | Três confirmações e dados repetidos para começar (U01) | Ficha única "Conferi — auditar" | 1 |
| 3 | Tour automático intermitente, sobre a tarefa, sobre volume (U03) | Desligar o automático; orientação contextual M1–M5 | 0 / 2 |
| 4 | Ajuda descreve botões inexistentes e diz que C "confirma" (U04) | Reescrever + teste de rótulos | 0 |
| 5 | Clique repetido duplica a proposta; "Auditar" sobrevive ao parecer (U05) | Sugestão usada desliga; reaproveitar o cartão aberto | 0 |
| 6 | Duas leituras "Resumo", a com veredito só pelo anel; trilho só de ícones (U09, U10) | 4 abas com nome; fundir as duas leituras "Resumo" | 2 |
| 7 | Fila corta "Decisão técnica"/"Falso positivo" a 1440 px (U11) | Recolher a barra de conversas com a fila aberta | 0 |
| 8 | Falhas mudas e tarefa perdida: não-PDF (500), prancha vira LD, "Nova conversa" esquece a tarefa (U06, U07, U21) | Mensagens e tarefa preservada | 0 |
| 9 | Histórico ilegível ("Memorial · sem tarefa", cidades duplicadas, "Continuar" idêntico) (U12, U24) | Título de auditoria + normalização | 3 |
| 10 | Palco vazio com abas de volume durante a preparação (U08) | Capa do memorial no palco | 1 |

## Plano de implementação em fases

| Fase | Conteúdo | Duração estimada | Portão de saída |
|---|---|---|---|
| **0** | 16 correções rápidas (doc 09) | 3–4 dias | Bateria verde; capturas antes/depois a 1366 e 1440; Ajuda testada |
| **1** | Ficha única; palco da preparação | ~1 semana | ≤2 cliques até rodar; teste real de auditoria; garantia do 141-26 intacta |
| **2** | Abas do resultado; tutorial contextual; `?` | ~1 semana | Aprovação no lab (D5); critérios do doc 08 |
| **3** | Histórico; atribuir+avisar; exportar (D3); limpeza de código morto | ~1 semana | Nenhuma conversa de auditoria com título genérico; 0 imports órfãos |

Antes da fase 0, ele decide **D1–D5**. Nada desta rodada alterou código.

## O que não foi verificado e precisa de execução

- O primeiro acesso de um usuário **sem nenhuma conversa no servidor** (o login dev tem histórico). O gatilho do tour foi provado só pelo caminho intermitente.
- A auditoria de um memorial **real e longo** (o 990-26 tem 3 páginas, 49 s). Muitos achados (50+) foram vistos só nas linhas da barra lateral ("53 de 53 a tratar"), não percorridos.
- O PDF do parecer (o clique abre aba nova; o conteúdo não foi lido).
- O e-mail de aviso (em dev, grava em arquivo; não prova entrega).
- Larguras abaixo de 1366 px e uso só com teclado/leitor de tela.
- Teste com pessoas reais: recomendado antes da fase 2, com 3 pessoas (uma por perfil), tarefa "audite este memorial e diga se pode emitir".
