# Juntar blocos — desenho

Data: 09/10/2026 · Status: aguardando revisão

## O problema

O volume misto sai com uma separatriz e uma LD por disciplina. O escritório às
vezes emite **uma** para duas: o volume 3 de 040-26 tem `separatriz_gmt_ter` e
uma LD `geo_ter_ld` cobrindo Geométrico e Terraplenagem, com o título próprio
"PROJETO DE GEOMETRIA E TERRAPLENAGEM" (`NOME_DO_PAR`). A regra
`fundirBlocos` existe e tem teste, mas nada na tela a usa.

## Decisões

| Pergunta | Decisão |
|---|---|
| Gesto | **Selecionar folhas de duas disciplinas no canvas → chip "Juntar CAB e CFT"**; o par fundido ganha o chip "Separar" |
| Desfazer | "Separar" é o desfazer (a fusão é gravada; separar a apaga) |
| Escopo | Pares (duas disciplinas). Fundir um par com uma terceira não entra agora |

## Como fica

### Modelo

- `Bloco` ganha `codigos: string[]` — `[codigo]` no bloco normal, `[a, b]` no
  fundido. `codigo` continua sendo o do primeiro (é a chave dos artefatos:
  `ld:gmt`, `separatriz:gmt`).
- `fundirBlocos` passa a somar `codigos`.
- **`blocosDoVolume(lista, codigoDe, rotuloDe, fundidos)`** = `blocosDasFolhas`
  + as fusões gravadas, na ordem; par cujo código não está no volume é
  ignorado. Substitui `blocosDasFolhas` nos 5 lugares que montam blocos:
  `PlanoDeGeracao.tsx:287`, `ConfirmationCard.tsx:694` e `:1543`,
  `editaveis-consolidados.ts:135`, `selo-check.ts:73`.
- **`codigoNoVolume(fundidos)`**: função que leva o segundo código do par ao
  primeiro (`ter → gmt`). Entra onde se agrupa folha a folha, para o par não
  ser tratado como duas disciplinas:
  - divisão em tomos (`repartirDaLista`/`planoPorDisciplina` em
    `NexoCanvas.tsx:698`, `ConfirmationCard.tsx:1506`, `payload-do-item.ts:60`)
    — o corte nunca cai no meio do par;
  - documento envelhecido (`documentoEnvelheceu`, `drop-folhas.ts:92`);
  - total do conjunto: o bloco fundido soma os totais declarados das duas.

### Títulos

Uma função só, `nomesDoBloco(bloco)` → `{ capa, separatriz }`:

1. par com nome próprio (`nomeDoPar`) → ele nos dois;
2. par sem nome → `"<nome do primeiro> E <nome do segundo sem 'PROJETO DE '>"`
   (ex.: "PROJETO DE DRENAGEM E PAVIMENTAÇÃO");
3. bloco normal → o de hoje (`nomeNaCapa`/`nomeNaSeparatriz`).

Usada em `payload-do-item.ts:123/144`, `editar-artefato.ts:418/489`,
`titulosDoBloco` (montagem) e na LD consolidada (passa `tituloLd`). Decisão
do engenheiro sobre o título continua mandando, como hoje.

**Bloco normal não muda o payload** (nem campo novo): senão todo artefato já
gerado apareceria como pendente.

### Persistência

`blocosFundidos?: [string, string][]` no `conversation-store`, no mesmo molde
de `totaisPorDisciplina`: estado, snapshot, gravação (omitido quando vazio),
restauração (`?? []`) e cópia em `duplicarConversa`. Ações
`juntarBlocos(a, b)` e `separarBlocos(codigo)`. Vai junto no JSON da conversa;
sem migração.

### Tela

- **Chip "Juntar CAB e CFT"** na `NavegacaoDoCanvas` quando as folhas
  selecionadas cobrem exatamente duas disciplinas, ambas sem fusão.
- **Chip "CAB + CFT · Separar"** para cada par gravado, sempre visível no
  canvas daquela conversa (é o desfazer, e mostra que a fusão existe).
- Ao juntar ou separar, o plano marca a LD e a separatriz do bloco como
  pendentes (o payload mudou) — o fluxo de "gerar de novo" que já existe.

### Artefatos velhos

- A montagem reaproveita a separatriz/LD já gerada do bloco **só se** ela foi
  gerada para o mesmo conjunto de códigos e folhas; senão gera de novo
  (`ConfirmationCard.tsx:1784/1814` reaproveitam hoje sem conferir).
- A entrega (`parametrosDaEntrega`) só junta títulos de separatriz dos blocos
  atuais — a separatriz órfã de `ter` não entra no editável.

## Erros e bordas

- Juntar com uma disciplina que saiu do volume: o par fica gravado e é
  ignorado até ela voltar (não apaga sozinho).
- Selecionar folhas de 3 disciplinas: o chip não aparece.
- Bloco sem disciplina (folhas sem código) não pode ser juntado.

## Testes

- `test-nexo-blocos`: `codigos`, `blocosDoVolume` (par ausente, ordem),
  `codigoNoVolume`, divisão em tomos sem cortar o par.
- `test-titulos-do-bloco`: par nomeado, par sem nome, bloco normal igual a hoje.
- `test-nexo-plano-pendente`: payload de bloco normal inalterado; bloco
  fundido muda o payload (pendente).
- Navegador (build de produção): 040-26 vol. 3 ou o 084-25 vol. 8 —
  selecionar CAB+CFT, juntar, gerar, conferir uma separatriz e uma LD com as
  8 folhas; F5; separar; voltar a duas.
