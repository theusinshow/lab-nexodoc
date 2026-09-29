# Texto corrigido do achado — desenho

29/09/2026 · decidido com o Matheus em conversa, implementado no mesmo dia.

## O que é

No bloco "O que fazer" do achado, um botão pequeno **texto corrigido**. O clique
abre uma caixa **embaixo, dentro do próprio bloco**, com dois textos:

- **Procure por** (Ctrl+F no ODT) — o trecho com o erro, copiado da evidência;
- **Substitua por** — o mesmo trecho corrigido, com o que mudou grifado.

Cada um com seu **Copiar**. A pessoa abre o ODT, procura, cola por cima.

Fora do escopo, de propósito: aplicar direto no ODT (achado "over"), gerar em
lote, achados de conflito.

## Decisões

| Decisão | Escolha | Por quê |
|---|---|---|
| O que se copia | Só o trecho da evidência, corrigido | Mudança mínima, fácil de conferir; parágrafo inteiro dá espaço à IA para mexer no que não devia |
| Caixa | Embaixo, no bloco — não flutuando | Painel estreito: balão cobriria a Evidência; e a caixa fica aberta enquanto a pessoa vai ao ODT |
| Quem tem o botão | Achado com **1 ou 2 citações** na evidência | Medido em 324 achados de produção: 46% têm 1, 30% têm 2, 21% têm 3+, 3% nenhuma. Duas costumam ser o errado + o que prova o certo ("60x40m" ao lado de "60x40mm") |
| Quando gera | Sob demanda, no clique | A saída manda no custo da auditoria; gerar para todos pagaria os que ninguém abre |
| Onde guarda | `AuditFinding.texto_corrigido`, no `Audit.report` e no IndexedDB | Segundo clique e colega não pagam de novo; "sem troca" também é guardado |

Nenhum achado de produção vem do motor novo (0 de 324 em 29/09): o botão vive no
"O que fazer" do cartão legado **e** do `CartaoDoMotor`, pelo mesmo componente
(`components/achado/o-que-fazer.tsx`).

## A trava (`lib/texto-corrigido.ts`, sem IA)

A IA propõe `{pode_trocar, procure_por, substitua_por, motivo}`; o código julga:

- `procure_por` tem de estar **dentro de uma citação** (espaços colapsados);
- texto novo diferente do antigo e no máximo `3× + 80` caracteres;
- **número novo** só se aparece no "O que fazer" ou numa citação;
- **número apagado** só quando o "O que fazer" escreve o valor que entra no lugar;
- o trecho é **ampliado** com palavras vizinhas da própria citação até 25
  caracteres. Na primeira corrida real a IA devolveu `60x40m`, que no Ctrl+F
  casa também dentro de `60x40mm` — o trecho certo do mesmo documento.

Recusa vira `sem-troca` com o motivo escrito para a pessoa. O texto gravado leva
`versao` (`VERSAO_DO_TEXTO_CORRIGIDO`): subir ao mexer em prompt, modelo ou trava,
senão o cache serve a regra velha.

## Rota

`POST /api/audit/texto-corrigido` `{auditId, findingId, achado?}`. Com banco, lê o
achado do parecer gravado (o cliente não escolhe o que a IA lê) e devolve o
texto gravado se ainda vale. Modelo: o do chat da auditoria
(`NEXODOC_TEXTO_CORRIGIDO_MODEL` sobrescreve), esforço `low`. Registro em
`AiUsageEvent` como `flow: audit-chat`, `operation: audit-texto-corrigido`.

## Medido (banco de dev, 29/09/2026)

| Achado | Resultado |
|---|---|
| INC-003 gradil | `aço de 60x40m altura 1,58m` → `aço de 60x40mm altura 1,58m` |
| INC-005 prefeitura | `Prefeitura Municipal de Chapecó;` → `… de Criciúma;` |
| INC-007 espessura | sem troca: "a espessura correta deve ser confirmada nas referências citadas" |

`gpt-6-sol`, ~470 tokens de entrada e ~60 de saída: **US$ 0,0015 por clique**, 3–6 s.

## Provas

- `npm run test:texto-corrigido` — 20 testes puros (elegibilidade, trava, contexto, versão, grifo).
- `TC_AUDITORIA=<id> TC_ACHADO=INC-003 node scripts/shot-texto-corrigido.mjs` —
  navegador: caixa dentro da janela, Copiar lê a área de transferência, F5 não
  paga de novo. Custa centavos só no primeiro clique de um achado.
