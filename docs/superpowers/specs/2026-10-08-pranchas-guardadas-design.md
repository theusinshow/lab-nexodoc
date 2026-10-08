# Pranchas guardadas — desenho

Data: 08/10/2026 · Status: aprovado em conversa, aguardando revisão do spec

## O problema

As pranchas soltas no Nexo vivem só no estado do React (`pranchaFiles` em
`modules/nexo/components/NexoWorkspace.tsx`, mais o mapa `arquivosPorAnexo`).
Nunca vão para o IndexedDB (`nexo-db.ts`, por desenho) nem para o servidor.

- **F5 perde as pranchas.** Os selos lidos e os documentos gerados voltam, mas
  a montagem cai no "reanexe-os para montar" (`pre-condicoes-do-volume.ts`).
- **A montagem manda tudo em base64.** `assemble-volume.ts` (cliente) lê cada
  `File` como base64 e `postVolume` envia um JSON único para
  `/api/nexo/volume`. No 084-25 são até ~40 MB por montagem, a cada montagem.

## Decisões

| Pergunta | Decisão |
|---|---|
| Onde guardar | **Railway Buckets** (S3 compatível, privado, $0,015/GB-mês, egress do bucket grátis) via o cofre que já existe (`lib/cofre.ts`) |
| Por quanto tempo | **Enquanto o projeto existir.** Saem só pelo expurgo do admin |
| Abordagem | **B: guardar uma vez, montar por referência.** O navegador não rebaixa as pranchas no F5 e não reenvia base64 na montagem |

Medida de referência: o 084-25 inteiro tem ~180 MB de pranchas, mediana de
1 MB por prancha. Custo esperado: centavos por projeto por mês.

## Arquitetura

### Peças novas

1. **`POST /api/pranchas`**: recebe um PDF (corpo binário, `?projeto=<id>&nome=<fileName>`).
   - Confere sessão ativa, organização e que o projeto é da organização.
   - Lê o corpo em pedaços contando bytes; passou de 40 MB
     (`LIMITE_DO_ARQUIVO_BYTES`), aborta sem guardar nada.
   - Calcula o sha256 **no servidor** (não confia no do navegador).
   - Valida que é PDF: cabeçalho `%PDF-` e abertura pela pdf-lib para contar
     páginas. Falhou, recusa (415).
   - Confere a cota do projeto (2 GB somando as fichas). Passou, recusa (413).
   - `guardarNoCofre` (idempotente pelo conteúdo: o mesmo arquivo não sobe duas
     vezes).
   - Grava/atualiza a ficha e responde `{ checksum, paginas, tamanho }`.
2. **Tabela `PranchaDoProjeto`**:
   `id, projectId (FK, cascade), fileName, checksumSha256, paginas, sizeBytes,
   enviadaPor (email), createdAt, updatedAt`, com `@@unique([projectId, fileName])`.
   Soltar outro arquivo com o mesmo nome substitui a ficha (upsert), como a
   memória já faz hoje.
3. **`GET /api/pranchas?projeto=<id>`**: devolve as fichas, sem bytes.
4. **`DELETE /api/pranchas?projeto=<id>&nome=<fileName>`**: remove a ficha. O
   objeto fica no cofre até o expurgo do projeto.
5. **`/api/nexo/volume`** passa a receber, por parte, `{ checksum, fileName }`
   no lugar de `base64`. O servidor confere que **cada** checksum tem ficha
   naquele projeto e lê os bytes com `lerDoCofre`. O caminho por base64 sai.

### Fluxo

1. **Soltar:** a leitura de selo continua no navegador como hoje. Em paralelo,
   as pranchas sobem 3 por vez, com progresso no cartão.
2. **F5:** o Nexo busca as fichas do projeto. As pranchas aparecem como
   guardadas e o "reanexe" some. Os bytes não descem.
3. **Montar:** o navegador manda só as referências; o servidor monta lendo do
   bucket. A requisição cai de ~40 MB para alguns KB.
4. **Bytes no navegador** só quando algo precisar de fato (ex.: releitura de
   selo sem cache), via `/api/arquivos/<checksum>`, que já existe.

As pré-condições do volume e o cartão de confirmação passam a contar fichas
(guardadas) em vez de `File`s em memória.

### Regra de borda

A prancha só sobe quando a conversa já tem `projectId`. Sem projeto, fica em
memória como hoje e sobe assim que o projeto existir.

### Ligar o bucket

`NEXODOC_STORAGE_PROVIDER=s3` + `NEXODOC_S3_*` na Railway. A partir daí
**tudo** o que entra no cofre vai para o bucket (pranchas, memoriais, prints,
volumes). As linhas antigas com `onde = "postgres"` continuam lidas de lá.
Criar o bucket na Railway: o Matheus cria, ou autoriza explicitamente.

O comentário de `StoredFile` em `prisma/schema.prisma` ("Pranchas e volumes
ficam de fora") fica desatualizado e é reescrito.

## Segurança

- **Bucket privado.** Credenciais só nas variáveis do servidor; o navegador
  nunca fala com o bucket.
- **Nenhum link direto.** Bytes só saem pelo Nexo, depois de conferir sessão e
  organização; outra organização recebe 404.
- **Montagem amarrada ao projeto.** Checksum sem ficha naquele projeto é
  recusado, então adivinhar o checksum de outro projeto não puxa nada.
- **Prefixo da organização** no nome do objeto (`org/sha256`).
- **AES-256-GCM antes de subir** (`lib/cofre-cifra.ts`).
- **`NEXODOC_COFRE_CHAVE` NÃO entra em rodada de troca de chaves.** Trocá-la
  deixa ilegível tudo o que está guardado. Só se troca com recifragem de todos
  os objetos (fora deste escopo). Fica escrito também num comentário ao lado de
  onde a chave é lida.
- **Portões de entrada:** só PDF de verdade, 40 MB por prancha, 2 GB por
  projeto.

### Fora de escopo, sabido

- **Backup do bucket.** O backup do Postgres não cobre o bucket. Se a Railway
  perder o bucket, os originais seguem com quem subiu. Não vale um segundo
  provedor agora.
- **Antivírus.** O PDF não executa no servidor; só a pdf-lib o lê.
- **Mesmo arquivo em duas organizações.** `StoredFile.checksumSha256` é a chave
  global: a segunda organização a guardar o mesmo conteúdo não o lê. Hoje todo
  usuário é da PROSUL, então não acontece; vira assunto se entrar outro
  escritório.

## Expurgo

`PranchaDoProjeto` sai por cascade do projeto. `arquivosQueMorrem`
(`server/admin/expurgo.ts`) passa a:

- incluir os checksums das fichas do projeto entre os candidatos;
- consultar `PranchaDoProjeto` fora do projeto na lista de "quem ainda aponta"
  (hoje são quatro tabelas; passam a ser cinco).

Assim o objeto sai do bucket (`apagarDoBucket`) só quando ninguém mais o usa.

## Erros

| Situação | Comportamento |
|---|---|
| Rede cai no envio | 3 tentativas com espera crescente; depois o cartão marca "não guardada" com *Tentar de novo* |
| Montar antes de terminar de subir | O botão espera e mostra "guardando 12 de 40"; se alguma falhou, diz qual e não monta volume com folha faltando |
| Aba fechada no meio do envio | No F5, pranchas com selo lido e sem ficha aparecem como "não foi guardada, solte de novo"; o atalho de reanexar pelo nome (`pranchas-reanexadas.ts`) cobre |
| Bucket fora do ar | Envio responde 503 "não consegui guardar agora" e tenta depois; a montagem trava com essa mensagem |
| Objeto sumiu do bucket na montagem | O servidor responde com os **nomes** das pranchas que faltam; o cartão pede só essas |
| Conversas de antes da mudança | Sem fichas, seguem o reanexar de hoje; ao reanexar, sobem. Sem migração |
| Dev local sem bucket | Cofre no Postgres (teto de 40 MB cabe); tudo igual |

## Testes

- **`npm run test:pranchas`** (entra na bateria do CI):
  - recusa o que não é PDF;
  - corta acima de 40 MB e acima de 2 GB por projeto;
  - recusa checksum de outro projeto e de outra organização na montagem;
  - não guarda duas vezes o mesmo conteúdo;
  - mesmo nome substitui a ficha;
  - expurgo apaga a ficha e só o objeto sem outra referência.
- **Navegador, local:** soltar as pranchas do 084-25, F5, conferir que voltaram,
  montar e comparar com um volume montado pelo caminho antigo (mesmas páginas,
  mesma ordem).
- **Medida:** tamanho da requisição de montagem antes e depois (~40 MB → KB).
- **Produção, depois do deploy:** uma rodada real com o bucket da Railway.
