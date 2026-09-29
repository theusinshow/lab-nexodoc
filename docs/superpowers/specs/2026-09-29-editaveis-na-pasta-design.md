# Os editáveis na pasta do projeto

**Data:** 2026-09-29
**Estado:** desenho aprovado; implementação em curso

## O problema

O Nexo gera capa, LD e separatriz em ODT e PDF, mas nada obriga o ODT a chegar
na pasta do projeto. O usuário baixa o PDF do volume, entrega, e o editável fica
no IndexedDB de um navegador. Quando alguém precisa mexer numa vírgula da
separatriz, não há de onde partir.

Não existe padrão de pasta: ela varia por projeto e por disciplina. Por isso
quem escolhe a pasta é o usuário, a cada entrega, e o Nexo não confere o nome.

## O fluxo

No card do volume, três passos em ordem:

1. **Montar o volume** — como hoje.
2. **Salvar editáveis no projeto** — abre o seletor de pasta do sistema
   (`showDirectoryPicker`, Chrome/Edge) e grava direto nela, sem subpasta, os
   três ODTs consolidados que `gerarEditaveisConsolidados` já produz: uma capa
   com todos os tomos, uma LD com os tomos como seções, uma separatriz.
3. **Baixar o PDF do volume** — travado, com o motivo escrito, até o passo 2
   dar certo.

A trava vale para TODO caminho que entrega o PDF do volume: o link do card
(`ResultLinks` de artefato `volume`), o "Baixar os N volumes" e o "remontar e
baixar" de `VolumesDesatualizados`. Os PDFs soltos de capa, LD e separatriz
continuam livres — são peças, não a entrega. A miniatura do canvas continua
abrindo o PDF para ver: é pré-visualização, e trancá-la tiraria do engenheiro a
conferência visual do que montou.

## Gravar

- **Conflito de nome:** pergunta por arquivo — substituir, manter os dois
  (`nome (2).odt`) ou pular.
- **Conferência:** depois de gravar, relê cada arquivo da pasta e compara o
  tamanho com o que foi escrito. Só libera o que conferiu. Pular um arquivo
  conta como decisão do usuário (o dele já está lá).
- **Pasta lembrada por projeto** (IndexedDB, chave `projectId` ou, sem ele, a
  conversa). Da próxima vez o botão diz "Salvar de novo em *nome*". O navegador
  expõe só o NOME da pasta, nunca o caminho.

## A liberação

`editaveisSalvos` na conversa (IndexedDB + servidor, como `tomosDeclarados`):
`{ pasta, quando, modo: "pasta" | "zip", arquivos, assinatura }`.

A **assinatura** é `artifactId@generatedAt` dos resultados de capa, LD e
separatriz, ordenados. Regerar qualquer um deles muda a assinatura, e a
liberação cai com o motivo "a capa, a LD ou a separatriz mudou depois de
salvar". Os ODTs na pasta ficaram velhos; salvar de novo é o conserto.

## Quando não dá para gravar

- **Navegador sem seletor de pasta (Firefox):** o passo 2 vira o download de um
  ZIP com os 3 ODTs e o aviso "mova para a pasta do projeto". Libera com
  `modo: "zip"`.
- **Cancelou o seletor:** nada muda, sem erro.
- **Permissão negada ou falha de escrita:** mensagem com o motivo e o ZIP como
  saída, liberando do mesmo jeito.

## Fora

- Aceitar o ODT editado à mão de volta na montagem (passo futuro).
- Conferir o nome da pasta contra o código do projeto (descartado: não há padrão).

## Prova

- Regras puras em `scripts/test-editaveis-no-projeto.ts`: assinatura, liberação,
  envelhecimento, nome livre no conflito.
- Navegador (Playwright): `showDirectoryPicker` substituído pelo OPFS
  (`navigator.storage.getDirectory()`), que devolve um `FileSystemDirectoryHandle`
  de verdade. Prova a trava, a gravação, o conflito e o F5 sem token.
- Só na máquina do escritório: gravar de verdade no `P:`.
