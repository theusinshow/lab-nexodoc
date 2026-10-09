# Juntar blocos — plano

Spec: `docs/superpowers/specs/2026-10-09-juntar-blocos-design.md`. Execução inline, commit por camada.

1. **Regras puras** (`modules/nexo/lib/blocos.ts`, `server/nexo/titulos-do-bloco.ts`):
   `Bloco.codigos`; `fundirBlocos` soma códigos; `blocosDoVolume(lista, codigoDe, rotuloDe, fundidos)`;
   `codigoNoVolume(fundidos)`; `nomesDoBloco({codigo, codigos, rotulo})` (par nomeado → `nomeDoPar`;
   par sem nome → "A E B"; normal → igual a hoje). Testes em `test-nexo-blocos.ts` e `test-titulos-do-bloco.ts`.
2. **Conversa** (`conversation-store.tsx`, `nexo-db.ts`): `blocosFundidos` como `totaisPorDisciplina`;
   ações `juntarBlocos(a, b)` / `separarBlocos(codigo)`; regra pura de adicionar/remover par testada.
3. **Pontos de chamada:** `blocosDoVolume` em PlanoDeGeracao:287, ConfirmationCard:694/1543,
   editaveis-consolidados:135; `codigoNoVolume` nos cortes de tomo (NexoCanvas:698, ConfirmationCard:1506,
   payload-do-item:60) e em `documentoEnvelheceu`; títulos por `nomesDoBloco` em payload-do-item,
   editar-artefato e `titulosDoBloco`; LD consolidada com `tituloLd`. Bloco normal: payload idêntico
   (`test-nexo-plano-pendente` continua verde).
4. **Canvas:** chips "Juntar X e Y" (seleção cobre 2 disciplinas sem fusão) e "X + Y · Separar"
   na `NavegacaoDoCanvas`.
5. **Artefatos velhos:** montagem só reaproveita separatriz/LD do bloco se o payload bate;
   entrega só junta títulos dos blocos atuais.
6. **Prova** em build de produção com o 084-25 vol. 8 (CAB+CFT): juntar, gerar, montar, F5, separar.
