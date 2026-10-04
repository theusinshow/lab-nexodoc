# 05 — Auditoria de AI slop

Critério: padrões que denunciam interface gerada sem decisão:

- gradiente roxo ou azul decorativo;
- vidro e brilho;
- ícone em círculo colorido;
- cartão com faixa colorida;
- emoji;
- texto de marketing ("supercharge", "seamless");
- números inventados;
- saudação por hora;
- tudo centralizado;
- três cartões iguais com ícone;
- animação de entrada em tudo.

Cada tela recebe um nível, com o que sustenta o nível.

| Tela | Nível | Por quê |
|---|---|---|
| Entrada | AI-SLOP-LOW | Filme sobre o trabalho real (página do memorial, ACH-003, 1.240 ≠ 1.180 m²), não abstração. O orbe violeta com brilho é o único traço do gênero (SLOP-002). |
| Painel | AI-SLOP-LOW | "Boa noite, Victor." no `h1` (SLOP-001, herdado do atual). O resto é tarefa e "precisa ter em mãos", e a faixa de números usa só dados reais (sem "horas economizadas"). |
| Nexo: a auditoria | NOT-SLOP | Lista de achados com nível, disciplina e dono; chat que cita ACH com página. Densidade de ferramenta. |
| Conversa | NOT-SLOP | Registro sem balão para o Nexo; "Ficha do que leu"; lacunas editáveis na frase. |
| Montar volume | NOT-SLOP | Canvas com carimbos e setas desenhadas a partir do rascunho do dono. |
| Mapa | NOT-SLOP | Cartão "carimbo" escolhido pelo dono depois de rejeitar o cartão com fio colorido (registrado como slop em 01/10). |
| Auditoria rodando | NOT-SLOP | Etapas reais do motor, blocos por capítulo, registro com hora. |
| Resultado | NOT-SLOP | Veredito, níveis, mapa de páginas, fila; nenhum adorno. |
| Achados / Projetos / Projeto | NOT-SLOP | Tabelas com código em mono, contagem e data. |
| Admin | NOT-SLOP | Gráficos neutros com paleta validada; texto que explica a consequência ("Remover não apaga a conta…"). |
| Ajuda | NOT-SLOP | Glossário do domínio (veredito, nível, LD, separatriz). |
| 404 / erro | NOT-SLOP | Saída concreta ("Buscar '117-26'", "Ir para Projetos"). |

## Itens

- **SLOP-001 (P3):** saudação por hora no título do Painel.
- **SLOP-002 (P3):** violeta, orbe e "IA" formam a combinação mais associada ao gênero. A decisão de manter é do dono e consciente; o risco fica contido enquanto o violeta for só sinal.

## O que foi procurado e não achado

- Emoji na interface.
- Gradiente decorativo nas telas de trabalho.
- Ícone em círculo colorido.
- Texto de marketing.
- Número inventado: a conciliação de dados está fechada, com 15 conferências em `prova-coerencia.mjs`.
- Três cartões iguais em fileira como estrutura de página: os 4 tiles do Projeto têm estado e ação distintos.
- Animação de entrada em lista: a cascata das "Saídas" no chat é única por resposta e para com movimento reduzido.
