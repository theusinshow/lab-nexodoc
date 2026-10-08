# Pranchas guardadas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** as pranchas soltas no Nexo ficam guardadas no cofre (bucket da Railway) por projeto; F5 não as perde, e a montagem do volume manda referências em vez de ~40 MB de base64.

**Architecture:** uma rota `/api/pranchas` (GET/POST/DELETE) grava os bytes via `guardarNoCofre` e a ficha numa tabela nova `PranchaDoProjeto`. No navegador, `pranchaFiles: File[]` continua sendo "os bytes desta sessão"; ao lado dele entram as fichas do servidor, e os dois se juntam em `PranchaNaSessao[]`, o tipo que desce para os cartões. A montagem manda `checksum` para a prancha guardada e `data` (base64) só para o que não tem ficha; o servidor confere cada checksum contra as fichas do projeto.

**Tech Stack:** Next 16.4 (route handlers, runtime nodejs), Prisma 7 / Postgres, `@aws-sdk/client-s3` (já no cofre), pdf-lib, testes puros em `node` cru (`scripts/test-*.ts`, entram sozinhos na bateria).

Spec: `docs/superpowers/specs/2026-10-08-pranchas-guardadas-design.md`

## Global Constraints

- Teto por prancha: `LIMITE_DO_ARQUIVO_BYTES` (40 MB) de `lib/limite-do-anexo.ts`.
- Cota por projeto: 2 GB (`2 * 1024 ** 3` bytes) somando `sizeBytes` das fichas.
- Envio: 3 pranchas por vez; 3 tentativas com espera crescente (1 s, 2 s, 4 s).
- Outra organização recebe **404**, nunca 403 (mesma regra de `/api/arquivos/[checksum]`).
- O projeto do pedido vem do cabeçalho `x-nexo-projeto` (`projetoDoPedido`) e **sempre** é conferido contra `actor.organizationId` e `deletedAt: null`.
- `NEXODOC_COFRE_CHAVE` nunca é trocada sem recifragem; isso fica escrito no código.
- Testes puros não importam `@/` nem Prisma: rodam com `node scripts/test-x.ts`.
- Commits direto na `main`; `git diff --cached --stat` antes de cada commit; mensagem em pt-BR terminando com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Texto de interface em pt-BR, frases curtas, sem jargão ("guardada", "não foi guardada", "guardando 12 de 40").

## Mapa de arquivos

| Arquivo | Papel |
|---|---|
| `prisma/schema.prisma` | modelo `PranchaDoProjeto`; relação em `Project`; comentário do `StoredFile` |
| `prisma/migrations/20261009090000_pranchas_do_projeto/migration.sql` | a tabela |
| `lib/pranchas/regras.ts` (novo, puro) | `ehPdf`, `lerComTeto`, `cabeNaCota`, `nomeDePrancha`, `faltantes`, constantes |
| `server/pranchas.ts` (novo) | `projetoDoEscritorio`, `guardarPrancha`, `listarPranchas`, `removerPrancha`, `bytesDasPranchas` |
| `app/api/pranchas/route.ts` (novo) | GET/POST/DELETE |
| `server/nexo/volume-parts.ts` | `VolumePart.data` vira opcional; entra `checksum` |
| `app/api/nexo/volume/route.ts` | resolve `checksum` pelo cofre; 409 com `faltando` |
| `server/admin/expurgo.ts` | fichas entram como candidatas e como "quem ainda aponta" |
| `modules/nexo/lib/pranchas-guardadas.ts` (novo) | tipos + `juntarPranchas` (puro) + `enviarPrancha`, `listarFichas`, `baixarPrancha`, `removerFicha`, `emParalelo` |
| `modules/nexo/lib/pre-condicoes-do-volume.ts` | `motivoParaNaoMontar` aprende "guardando" e "não guardada" |
| `modules/nexo/lib/assemble-volume.ts` | `BlocoDoVolume.pranchas: PranchaNaSessao[]` |
| `modules/nexo/lib/selo-check.ts` | recebe `PranchaNaSessao[]` + `arquivoDa` |
| `modules/nexo/lib/generate.ts` | `postVolume` lança `PranchasFaltando` no 409 |
| `modules/nexo/components/NexoWorkspace.tsx` | fichas, envio, `garantirBytes`, `pranchas` derivadas |
| `modules/nexo/components/{NexoChat,NexoCopilot,ConfirmationCard}.tsx` | prop `pranchaFiles: File[]` → `pranchas: PranchaNaSessao[]` |
| `lib/cofre-cifra.ts` | aviso sobre a troca da chave |
| `scripts/test-pranchas.ts` (novo), `scripts/test-pranchas-na-sessao.ts` (novo), `scripts/test-nexo-parts.ts`, `scripts/test-nexo-pre-volume.ts` | testes |
| `package.json` | `test:pranchas` |

---

### Task 1: Tabela `PranchaDoProjeto` e os comentários que mudam de verdade

**Files:**
- Modify: `prisma/schema.prisma` (modelo `Project` ~linha 190; comentário de `StoredFile` ~linha 925)
- Create: `prisma/migrations/20261009090000_pranchas_do_projeto/migration.sql`
- Modify: `lib/cofre-cifra.ts` (topo do arquivo)

**Interfaces:**
- Produces: `prisma.pranchaDoProjeto` com campos `id, projectId, fileName, checksumSha256, paginas, sizeBytes, enviadaPor, createdAt, updatedAt`; unique composto `projectId_fileName`.

- [ ] **Step 1: Modelo no schema.** Acrescentar ao fim de `prisma/schema.prisma`:

```prisma
/// AS PRANCHAS DE UM PROJETO, guardadas (09/10/2026).
///
/// Antes viviam só na memória da aba: o F5 as perdia e a montagem pedia
/// "reanexe-os". A ficha é leve (nome, impressão digital, páginas); os bytes
/// moram no cofre ([[lib/cofre.ts]]) pela impressão digital.
///
/// UM NOME POR PROJETO: soltar outro arquivo com o mesmo nome troca a ficha,
/// como a memória da aba sempre fez. O objeto antigo fica no cofre até o
/// expurgo do projeto — remover a ficha não apaga bytes que outra linha pode
/// estar usando.
model PranchaDoProjeto {
  id             String   @id @default(cuid())
  projectId      String
  fileName       String
  checksumSha256 String
  paginas        Int
  sizeBytes      Int
  /// E-mail de quem soltou. Registro, não posse.
  enviadaPor     String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, fileName])
  @@index([checksumSha256])
}
```

E na lista de relações de `model Project` (junto das outras relações, depois de `owner`):

```prisma
  pranchas       PranchaDoProjeto[]
```

- [ ] **Step 2: Comentário do `StoredFile`.** Trocar o parágrafo que começa em `/// SÓ O MEMORIAL AUDITADO. Pranchas e volumes ficam de fora` (e as 3 linhas seguintes até `/// JPEG.`) por:

```prisma
/// MEMORIAIS, VOLUMES, PRINTS DO SUPORTE E, DESDE 09/10/2026, AS PRANCHAS.
/// Com `NEXODOC_STORAGE_PROVIDER=s3` os bytes novos vão para o bucket privado
/// da Railway; as linhas antigas (`onde = "postgres"`) seguem lidas daqui.
```

- [ ] **Step 3: Migração.** Criar `prisma/migrations/20261009090000_pranchas_do_projeto/migration.sql`:

```sql
-- As pranchas guardadas por projeto (09/10/2026). Os bytes moram no cofre.
CREATE TABLE "PranchaDoProjeto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "paginas" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "enviadaPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PranchaDoProjeto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PranchaDoProjeto_projectId_fileName_key" ON "PranchaDoProjeto"("projectId", "fileName");
CREATE INDEX "PranchaDoProjeto_checksumSha256_idx" ON "PranchaDoProjeto"("checksumSha256");

ALTER TABLE "PranchaDoProjeto" ADD CONSTRAINT "PranchaDoProjeto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Conferir que o SQL bate com o schema.**

Run: `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$DATABASE_URL_BATERIA" --script`
Expected: saída vazia (ou só comentário "This is an empty migration."). Se aparecer SQL, ajustar a migração até ficar vazia. Sem `DATABASE_URL_BATERIA` local, pular este passo: a bateria do CI aplica as migrações num Postgres limpo e quebra se divergir.

- [ ] **Step 5: Cliente do Prisma e tipos.**

Run: `npx prisma generate && npx tsc --noEmit -p tsconfig.json`
Expected: sem erros.

- [ ] **Step 6: Aviso da chave.** No topo de `lib/cofre-cifra.ts`, logo abaixo do comentário de abertura existente (ou como primeiro comentário, se não houver), acrescentar:

```ts
/*
 * NÃO TROQUE `NEXODOC_COFRE_CHAVE` NUMA RODADA DE TROCA DE CHAVES.
 *
 * As chaves de API (OpenAI, Resend…) podem ser trocadas a qualquer hora. Esta
 * não: tudo o que está no cofre — memoriais, volumes, prints e pranchas — foi
 * cifrado com ela, e uma chave nova deixa cada arquivo ilegível, em silêncio,
 * até alguém tentar abrir. Trocar exige recifrar todos os objetos antes.
 */
```

- [ ] **Step 7: Commit.**

```bash
git add prisma/schema.prisma prisma/migrations/20261009090000_pranchas_do_projeto lib/cofre-cifra.ts
git diff --cached --stat
git commit -m "Pranchas guardadas: tabela PranchaDoProjeto e o aviso da chave do cofre"
```

---

### Task 2: As regras puras da entrada (`lib/pranchas/regras.ts`)

**Files:**
- Create: `lib/pranchas/regras.ts`
- Create: `scripts/test-pranchas.ts`
- Modify: `package.json` (script `test:pranchas`)

**Interfaces:**
- Produces:
  - `COTA_DO_PROJETO_BYTES: number` (= `2 * 1024 ** 3`)
  - `TETO_DA_PRANCHA_BYTES: number` (= 40 MB, igual a `LIMITE_DO_ARQUIVO_BYTES`)
  - `ehPdf(bytes: Uint8Array): boolean`
  - `lerComTeto(corpo: ReadableStream<Uint8Array> | null, teto: number): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; motivo: "vazio" | "grande-demais" }>`
  - `cabeNaCota(usado: number, novo: number, cota?: number): boolean`
  - `nomeDePrancha(bruto: string | null): string | null` — aparado, 1..255 caracteres, sem `/` nem `\`, termina em `.pdf` (sem diferenciar maiúscula)
  - `faltantes(pedidas: { checksum: string; nome: string }[], guardadas: Iterable<string>): string[]` — nomes (sem repetir) cujo checksum não está em `guardadas`
  - `CHECKSUM: RegExp` (`/^[a-f0-9]{64}$/`)

- [ ] **Step 1: Teste que falha.** Criar `scripts/test-pranchas.ts`:

```ts
/**
 * As regras da ENTRADA das pranchas guardadas: o que passa pelo portão do
 * `POST /api/pranchas` e o que a montagem recusa. Puro → node cru.
 *
 *   node scripts/test-pranchas.ts   (== npm run test:pranchas)
 */
import assert from "node:assert/strict";

import {
  cabeNaCota,
  CHECKSUM,
  COTA_DO_PROJETO_BYTES,
  ehPdf,
  faltantes,
  lerComTeto,
  nomeDePrancha,
  TETO_DA_PRANCHA_BYTES,
} from "../lib/pranchas/regras.ts";

let passed = 0;
async function test(nome: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${nome}`);
  } catch (err) {
    console.error(`FALHOU  ${nome}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const bytes = (texto: string) => new TextEncoder().encode(texto);
function corpo(pedacos: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(c) {
      for (const p of pedacos) c.enqueue(p);
      c.close();
    },
  });
}

console.log("pranchas guardadas\n");

await test("PDF de verdade passa", () => assert.equal(ehPdf(bytes("%PDF-1.7\n...")), true));
await test("PDF com lixo antes do cabeçalho (até 1 KB) passa, como o pdf.js aceita", () =>
  assert.equal(ehPdf(bytes(`${" ".repeat(10)}%PDF-1.4`)), true));
await test("extensão trocada não passa", () => assert.equal(ehPdf(bytes("PK\x03\x04 zip")), false));
await test("vazio não passa", () => assert.equal(ehPdf(new Uint8Array()), false));

await test("lê o corpo inteiro abaixo do teto", async () => {
  const r = await lerComTeto(corpo([bytes("%PDF-"), bytes("abc")]), 100);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(new TextDecoder().decode(r.bytes), "%PDF-abc");
});
await test("corta assim que passa do teto, sem ler o resto", async () => {
  let puxados = 0;
  const infinito = new ReadableStream<Uint8Array>({
    pull(c) {
      puxados++;
      c.enqueue(new Uint8Array(10));
    },
  });
  const r = await lerComTeto(infinito, 25);
  assert.deepEqual(r, { ok: false, motivo: "grande-demais" });
  assert.ok(puxados <= 4, `puxou ${puxados} pedaços`);
});
await test("corpo nulo ou vazio é recusado", async () => {
  assert.deepEqual(await lerComTeto(null, 10), { ok: false, motivo: "vazio" });
  assert.deepEqual(await lerComTeto(corpo([]), 10), { ok: false, motivo: "vazio" });
});

await test("teto da prancha é 40 MB", () => assert.equal(TETO_DA_PRANCHA_BYTES, 40 * 1024 * 1024));
await test("cota de 2 GB por projeto", () => {
  assert.equal(COTA_DO_PROJETO_BYTES, 2 * 1024 ** 3);
  assert.equal(cabeNaCota(COTA_DO_PROJETO_BYTES - 10, 10), true);
  assert.equal(cabeNaCota(COTA_DO_PROJETO_BYTES - 10, 11), false);
  assert.equal(cabeNaCota(0, 5, 4), false);
});

await test("nome válido é aparado", () => assert.equal(nomeDePrancha("  084-25-ARQ-01.pdf "), "084-25-ARQ-01.pdf"));
await test("extensão em maiúscula vale", () => assert.equal(nomeDePrancha("A.PDF"), "A.PDF"));
await test("nome com caminho é recusado", () => {
  assert.equal(nomeDePrancha("../x.pdf"), null);
  assert.equal(nomeDePrancha("pasta\\x.pdf"), null);
});
await test("nome sem .pdf, vazio ou nulo é recusado", () => {
  assert.equal(nomeDePrancha("x.dwg"), null);
  assert.equal(nomeDePrancha("   "), null);
  assert.equal(nomeDePrancha(null), null);
  assert.equal(nomeDePrancha(`${"a".repeat(252)}.pdf`), null);
});

await test("faltantes: só os nomes cujo checksum não tem ficha, sem repetir", () => {
  const a = "a".repeat(64);
  const b = "b".repeat(64);
  assert.deepEqual(
    faltantes(
      [
        { checksum: a, nome: "01.pdf" },
        { checksum: b, nome: "02.pdf" },
        { checksum: b, nome: "02.pdf" },
      ],
      [a],
    ),
    ["02.pdf"],
  );
  assert.deepEqual(faltantes([{ checksum: a, nome: "01.pdf" }], new Set([a])), []);
});
await test("checksum só em hex minúsculo de 64", () => {
  assert.equal(CHECKSUM.test("a".repeat(64)), true);
  assert.equal(CHECKSUM.test("A".repeat(64)), false);
  assert.equal(CHECKSUM.test("a".repeat(63)), false);
});

console.log(`\n${passed} ok`);
```

- [ ] **Step 2: Rodar e ver falhar.**

Run: `node scripts/test-pranchas.ts`
Expected: FAIL com `ERR_MODULE_NOT_FOUND` (`lib/pranchas/regras.ts` não existe).

- [ ] **Step 3: Implementar.** Criar `lib/pranchas/regras.ts`:

```ts
/**
 * AS REGRAS DA ENTRADA das pranchas guardadas (09/10/2026), puras: sem `@/`,
 * sem Prisma, testadas em node cru por `scripts/test-pranchas.ts`.
 *
 * Moram fora da rota porque a rota é o lugar onde um `early return` novo
 * escorrega por baixo de uma checagem. Aqui cada portão é uma função com teste.
 */

/** O mesmo teto dos anexos ([[lib/limite-do-anexo.ts]]): uma régua só. */
export const TETO_DA_PRANCHA_BYTES = 40 * 1024 * 1024;

/**
 * A trava por projeto. O 084-25 inteiro tem ~180 MB de pranchas; 2 GB é dez
 * vezes isso — só um bug em laço ou um abuso chega lá.
 */
export const COTA_DO_PROJETO_BYTES = 2 * 1024 ** 3;

export const CHECKSUM = /^[a-f0-9]{64}$/;

const ASSINATURA = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/**
 * É PDF pelo conteúdo, não pela extensão. O cabeçalho pode vir depois de um
 * pouco de lixo (até 1 KB) — o pdf.js aceita, e prancha exportada por plotter
 * às vezes vem assim. A abertura pela pdf-lib, na rota, é o segundo portão.
 */
export function ehPdf(bytes: Uint8Array): boolean {
  const limite = Math.min(bytes.length - ASSINATURA.length, 1024);
  for (let i = 0; i <= limite; i++) {
    let casa = true;
    for (let j = 0; j < ASSINATURA.length; j++) {
      if (bytes[i + j] !== ASSINATURA[j]) {
        casa = false;
        break;
      }
    }
    if (casa) return true;
  }
  return false;
}

/**
 * Lê o corpo contando. Passou do teto, PARA de ler e recusa: o servidor nunca
 * segura mais que `teto` bytes de um pedido, diga o `Content-Length` o que
 * disser.
 */
export async function lerComTeto(
  corpo: ReadableStream<Uint8Array> | null,
  teto: number,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; motivo: "vazio" | "grande-demais" }> {
  if (!corpo) return { ok: false, motivo: "vazio" };
  const leitor = corpo.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > teto) {
      await leitor.cancel().catch(() => {});
      return { ok: false, motivo: "grande-demais" };
    }
    pedacos.push(value);
  }
  if (total === 0) return { ok: false, motivo: "vazio" };
  const bytes = new Uint8Array(total);
  let pos = 0;
  for (const p of pedacos) {
    bytes.set(p, pos);
    pos += p.byteLength;
  }
  return { ok: true, bytes };
}

export function cabeNaCota(usado: number, novo: number, cota = COTA_DO_PROJETO_BYTES): boolean {
  return usado + novo <= cota;
}

/**
 * O nome que vira chave da ficha. Sem barra nenhuma: o nome é identidade dentro
 * do projeto, nunca caminho — e é o que o cartão mostra.
 */
export function nomeDePrancha(bruto: string | null): string | null {
  const nome = bruto?.trim() ?? "";
  if (!nome || nome.length > 255) return null;
  if (/[\\/]/.test(nome)) return null;
  if (!/\.pdf$/i.test(nome)) return null;
  return nome;
}

/** Os NOMES pedidos na montagem cujo checksum não tem ficha no projeto. */
export function faltantes(
  pedidas: readonly { checksum: string; nome: string }[],
  guardadas: Iterable<string>,
): string[] {
  const tem = new Set(guardadas);
  const nomes = new Set<string>();
  for (const p of pedidas) if (!tem.has(p.checksum)) nomes.add(p.nome);
  return [...nomes];
}
```

- [ ] **Step 4: Rodar e ver passar.**

Run: `node scripts/test-pranchas.ts`
Expected: todas as linhas `ok`, código de saída 0.

- [ ] **Step 5: Script no package.json.** Depois da linha `"test:suporte": "node scripts/test-suporte.ts",` acrescentar:

```json
    "test:pranchas": "node scripts/test-pranchas.ts && node scripts/test-pranchas-na-sessao.ts",
```

(`test-pranchas-na-sessao.ts` nasce na Task 6; até lá, rodar só o primeiro arquivo.)

- [ ] **Step 6: Commit.**

```bash
git add lib/pranchas/regras.ts scripts/test-pranchas.ts package.json
git diff --cached --stat
git commit -m "Pranchas guardadas: as regras da entrada (PDF de verdade, 40 MB, 2 GB por projeto)"
```

---

### Task 3: O serviço e a rota `/api/pranchas`

**Files:**
- Create: `server/pranchas.ts`
- Create: `app/api/pranchas/route.ts`

**Interfaces:**
- Consumes: `lib/pranchas/regras.ts` (Task 2); `guardarNoCofre`, `lerDoCofre` de `lib/cofre.ts`; `requireActor`, `accessDeniedResponse` de `lib/access-control.ts`; `getPrisma` de `lib/db.ts`.
- Produces:
  - `type FichaDePrancha = { fileName: string; checksum: string; paginas: number; sizeBytes: number; atualizadaEm: string }`
  - `projetoDoEscritorio(projectId: string, organizationId: string): Promise<boolean>`
  - `guardarPrancha(args: { organizationId: string; projectId: string; fileName: string; bytes: Uint8Array; email: string }): Promise<FichaDePrancha>` — lança `PranchaRecusada` (`codigo: "nao-e-pdf" | "cota"`)
  - `listarPranchas(projectId: string): Promise<FichaDePrancha[]>`
  - `removerPrancha(projectId: string, fileName: string): Promise<void>`
  - `bytesDasPranchas(args: { projectId: string; organizationId: string; pedidas: { checksum: string; nome: string }[] }): Promise<{ ok: true; bytes: Map<string, Buffer> } | { ok: false; faltando: string[] }>`
  - Rota: `GET /api/pranchas?projeto=ID` → `{ pranchas: FichaDePrancha[] }`; `POST /api/pranchas?projeto=ID&nome=NOME` (corpo = PDF cru) → `{ prancha: FichaDePrancha }`; `DELETE /api/pranchas?projeto=ID&nome=NOME` → `{ ok: true }`.

- [ ] **Step 1: O serviço.** Criar `server/pranchas.ts`:

```ts
/**
 * AS PRANCHAS GUARDADAS no servidor (09/10/2026): a ficha no Postgres, os bytes
 * no cofre. Desenho: docs/superpowers/specs/2026-10-08-pranchas-guardadas-design.md
 *
 * Toda função recebe o projeto JÁ conferido contra o escritório — quem confere
 * é `projetoDoEscritorio`, chamado pela rota antes de qualquer outra coisa.
 */
import { PDFDocument } from "pdf-lib";

import { guardarNoCofre, lerDoCofre } from "@/lib/cofre";
import { getPrisma } from "@/lib/db";
import { cabeNaCota, ehPdf, faltantes } from "@/lib/pranchas/regras";

export type FichaDePrancha = {
  fileName: string;
  checksum: string;
  paginas: number;
  sizeBytes: number;
  atualizadaEm: string;
};

export class PranchaRecusada extends Error {
  readonly codigo: "nao-e-pdf" | "cota";
  constructor(codigo: "nao-e-pdf" | "cota", mensagem: string) {
    super(mensagem);
    this.name = "PranchaRecusada";
    this.codigo = codigo;
  }
}

function ficha(linha: {
  fileName: string;
  checksumSha256: string;
  paginas: number;
  sizeBytes: number;
  updatedAt: Date;
}): FichaDePrancha {
  return {
    fileName: linha.fileName,
    checksum: linha.checksumSha256,
    paginas: linha.paginas,
    sizeBytes: linha.sizeBytes,
    atualizadaEm: linha.updatedAt.toISOString(),
  };
}

/** O projeto existe, não foi apagado e é DESTE escritório. */
export async function projetoDoEscritorio(projectId: string, organizationId: string): Promise<boolean> {
  const p = await getPrisma().project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
    select: { id: true },
  });
  return Boolean(p);
}

/**
 * Guarda uma prancha. Ordem: é PDF? abre? cabe na cota? → cofre → ficha.
 * A ficha por último: ficha sem bytes seria prancha "guardada" que não monta.
 */
export async function guardarPrancha(args: {
  organizationId: string;
  projectId: string;
  fileName: string;
  bytes: Uint8Array;
  email: string;
}): Promise<FichaDePrancha> {
  if (!ehPdf(args.bytes)) throw new PranchaRecusada("nao-e-pdf", "O arquivo não é um PDF.");

  let paginas: number;
  try {
    const doc = await PDFDocument.load(args.bytes, { ignoreEncryption: true, updateMetadata: false });
    paginas = doc.getPageCount();
  } catch {
    throw new PranchaRecusada("nao-e-pdf", "O PDF não abriu — o arquivo pode estar corrompido.");
  }

  const prisma = getPrisma();
  // A cota soma as OUTRAS fichas: trocar a prancha de mesmo nome não conta duas vezes.
  const usado = await prisma.pranchaDoProjeto.aggregate({
    where: { projectId: args.projectId, NOT: { fileName: args.fileName } },
    _sum: { sizeBytes: true },
  });
  if (!cabeNaCota(usado._sum.sizeBytes ?? 0, args.bytes.byteLength)) {
    throw new PranchaRecusada("cota", "Este projeto chegou ao limite de 2 GB de pranchas guardadas.");
  }

  const guardado = await guardarNoCofre({
    bytes: args.bytes,
    organizationId: args.organizationId,
    mimeType: "application/pdf",
  });

  const linha = await prisma.pranchaDoProjeto.upsert({
    where: { projectId_fileName: { projectId: args.projectId, fileName: args.fileName } },
    create: {
      projectId: args.projectId,
      fileName: args.fileName,
      checksumSha256: guardado.checksumSha256,
      paginas,
      sizeBytes: guardado.sizeBytes,
      enviadaPor: args.email,
    },
    update: {
      checksumSha256: guardado.checksumSha256,
      paginas,
      sizeBytes: guardado.sizeBytes,
      enviadaPor: args.email,
    },
  });
  return ficha(linha);
}

export async function listarPranchas(projectId: string): Promise<FichaDePrancha[]> {
  const linhas = await getPrisma().pranchaDoProjeto.findMany({
    where: { projectId },
    orderBy: { fileName: "asc" },
  });
  return linhas.map(ficha);
}

/** Tira a ficha. Os bytes ficam no cofre até o expurgo do projeto. */
export async function removerPrancha(projectId: string, fileName: string): Promise<void> {
  await getPrisma().pranchaDoProjeto.deleteMany({ where: { projectId, fileName } });
}

/**
 * Os bytes das pranchas pedidas na montagem — SÓ se cada checksum tem ficha
 * neste projeto. Adivinhar o checksum de outro projeto não puxa nada; e se o
 * objeto sumiu do cofre, a resposta diz QUAIS pranchas pedir de novo.
 */
export async function bytesDasPranchas(args: {
  projectId: string;
  organizationId: string;
  pedidas: { checksum: string; nome: string }[];
}): Promise<{ ok: true; bytes: Map<string, Buffer> } | { ok: false; faltando: string[] }> {
  const unicos = [...new Set(args.pedidas.map((p) => p.checksum))];
  const comFicha = await getPrisma().pranchaDoProjeto.findMany({
    where: { projectId: args.projectId, checksumSha256: { in: unicos } },
    select: { checksumSha256: true },
  });
  const semFicha = faltantes(args.pedidas, comFicha.map((l) => l.checksumSha256));
  if (semFicha.length) return { ok: false, faltando: semFicha };

  const bytes = new Map<string, Buffer>();
  const sumiram: string[] = [];
  for (const checksum of unicos) {
    const lido = await lerDoCofre(checksum, args.organizationId).catch(() => null);
    if (lido) bytes.set(checksum, lido.bytes);
    else sumiram.push(checksum);
  }
  if (sumiram.length) {
    return { ok: false, faltando: faltantes(args.pedidas, unicos.filter((c) => !sumiram.includes(c))) };
  }
  return { ok: true, bytes };
}
```

- [ ] **Step 2: A rota.** Criar `app/api/pranchas/route.ts`:

```ts
/**
 * AS PRANCHAS GUARDADAS DE UM PROJETO (09/10/2026).
 *
 *   GET    ?projeto=ID              → as fichas (sem bytes)
 *   POST   ?projeto=ID&nome=NOME    → corpo = o PDF cru; guarda e devolve a ficha
 *   DELETE ?projeto=ID&nome=NOME    → tira a ficha
 *
 * Os bytes de uma prancha guardada saem por /api/arquivos/<checksum>, que já
 * confere o escritório. Projeto de outro escritório é 404, como lá.
 */
import { NextResponse, type NextRequest } from "next/server";

import { accessDeniedResponse, requireActor } from "@/lib/access-control";
import { ArquivoGrandeDemais } from "@/lib/cofre";
import { isDatabaseConfigured } from "@/lib/db";
import { lerComTeto, nomeDePrancha, TETO_DA_PRANCHA_BYTES } from "@/lib/pranchas/regras";
import {
  guardarPrancha,
  listarPranchas,
  PranchaRecusada,
  projetoDoEscritorio,
  removerPrancha,
} from "@/server/pranchas";

export const runtime = "nodejs";

const ID = /^[A-Za-z0-9_-]{1,80}$/;

function erro(status: number, mensagem: string) {
  return NextResponse.json({ error: mensagem }, { status });
}

/** O projeto pedido, já conferido. `null` vira 404 em quem chama. */
async function projetoConferido(req: NextRequest, organizationId: string): Promise<string | null> {
  const projeto = req.nextUrl.searchParams.get("projeto")?.trim() ?? "";
  if (!ID.test(projeto)) return null;
  return (await projetoDoEscritorio(projeto, organizationId)) ? projeto : null;
}

async function comPortao(fn: () => Promise<Response>): Promise<Response> {
  try {
    if (!isDatabaseConfigured()) return erro(503, "Banco não configurado.");
    return await fn();
  } catch (err) {
    const negado = accessDeniedResponse(err);
    if (negado) return negado;
    throw err;
  }
}

export async function GET(req: NextRequest) {
  return comPortao(async () => {
    const actor = await requireActor();
    const projeto = await projetoConferido(req, actor.organizationId);
    if (!projeto) return erro(404, "Projeto não encontrado.");
    return NextResponse.json({ pranchas: await listarPranchas(projeto) });
  });
}

export async function POST(req: NextRequest) {
  return comPortao(async () => {
    const actor = await requireActor();
    const projeto = await projetoConferido(req, actor.organizationId);
    if (!projeto) return erro(404, "Projeto não encontrado.");
    const nome = nomeDePrancha(req.nextUrl.searchParams.get("nome"));
    if (!nome) return erro(400, "Nome de prancha inválido: precisa terminar em .pdf e não ter barras.");

    const lido = await lerComTeto(req.body, TETO_DA_PRANCHA_BYTES);
    if (!lido.ok) {
      return lido.motivo === "vazio"
        ? erro(400, "O arquivo chegou vazio.")
        : erro(413, `A prancha passa de ${TETO_DA_PRANCHA_BYTES / 1024 / 1024} MB.`);
    }

    try {
      const prancha = await guardarPrancha({
        organizationId: actor.organizationId,
        projectId: projeto,
        fileName: nome,
        bytes: lido.bytes,
        email: actor.email,
      });
      return NextResponse.json({ prancha });
    } catch (err) {
      if (err instanceof PranchaRecusada) return erro(err.codigo === "cota" ? 413 : 415, err.message);
      if (err instanceof ArquivoGrandeDemais) return erro(413, err.message);
      /*
       * O cofre não respondeu (bucket fora, rede). 503 diz ao navegador "tente
       * depois" — é o que a fila de envio faz.
       */
      console.error("[pranchas] falha ao guardar", err);
      return erro(503, "Não consegui guardar agora.");
    }
  });
}

export async function DELETE(req: NextRequest) {
  return comPortao(async () => {
    const actor = await requireActor();
    const projeto = await projetoConferido(req, actor.organizationId);
    if (!projeto) return erro(404, "Projeto não encontrado.");
    const nome = nomeDePrancha(req.nextUrl.searchParams.get("nome"));
    if (!nome) return erro(400, "Nome de prancha inválido.");
    await removerPrancha(projeto, nome);
    return NextResponse.json({ ok: true });
  });
}
```

- [ ] **Step 3: Tipos.**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sem erros. (Se `ArquivoGrandeDemais` não for exportada de `lib/cofre.ts`, ela é — linha ~74.)

- [ ] **Step 4: Prova manual contra o dev local.** Com o `npm run dev` da 3000 de pé e logado no navegador:
  1. No console do navegador, numa aba do Nexo com conversa de projeto aberta (pegar o id do projeto na URL ou em `conv.projectId`):

```js
const projeto = "<ID DO PROJETO>";
const pdf = await (await fetch("/api/arquivos/<checksum de qualquer memorial guardado>")).blob();
let r = await fetch(`/api/pranchas?projeto=${projeto}&nome=teste-01.pdf`, { method: "POST", body: pdf });
console.log(r.status, await r.json());           // 200 + { prancha: {..., paginas > 0} }
r = await fetch(`/api/pranchas?projeto=${projeto}`); console.log(await r.json()); // contém teste-01.pdf
r = await fetch(`/api/pranchas?projeto=${projeto}&nome=teste-01.pdf`, { method: "POST", body: new Blob(["oi"]) });
console.log(r.status);                            // 415
r = await fetch(`/api/pranchas?projeto=nao-existe&nome=x.pdf`, { method: "POST", body: pdf });
console.log(r.status);                            // 404
r = await fetch(`/api/pranchas?projeto=${projeto}&nome=teste-01.pdf`, { method: "DELETE" }); console.log(await r.json()); // { ok: true }
```

  Se não houver memorial guardado, usar qualquer PDF via `<input type=file>`. Expected: os status anotados.

- [ ] **Step 5: Commit.**

```bash
git add server/pranchas.ts app/api/pranchas/route.ts
git diff --cached --stat
git commit -m "Pranchas guardadas: rota /api/pranchas (guardar, listar, tirar) com portão por escritório"
```

---

### Task 4: A montagem por referência (servidor)

**Files:**
- Modify: `server/nexo/volume-parts.ts`
- Modify: `app/api/nexo/volume/route.ts`
- Modify: `scripts/test-nexo-parts.ts`

**Interfaces:**
- Consumes: `bytesDasPranchas`, `projetoDoEscritorio` (Task 3); `CHECKSUM` (Task 2).
- Produces:
  - `VolumePart = { role; name; data?: string; checksum?: string; startPage?; endPage? }` — exatamente um de `data`/`checksum`.
  - `VolumePartSource` idem (`data?: string; checksum?: string`).
  - Rota: parte com `checksum` exige cabeçalho `x-nexo-projeto` de projeto do escritório; se faltar ficha/bytes → **409** `{ error, faltando: string[] }`.

- [ ] **Step 1: Teste que falha.** Em `scripts/test-nexo-parts.ts`, antes do resumo final (a linha que imprime o total de testes), acrescentar:

```ts
test("prancha guardada viaja por checksum, sem base64", () => {
  const checksum = "c".repeat(64);
  const parts = buildVolumeParts({
    capa: { name: "capa.pdf", data: "Q0FQQQ==" },
    disciplines: [{ pranchas: [{ name: "01.pdf", checksum, startPage: 1, endPage: 2 }] }],
  });
  assert.deepEqual(parts[1], { role: "prancha", name: "01.pdf", checksum, startPage: 1, endPage: 2 });
  assert.equal("data" in parts[1], false);
});

test("parte sem data e sem checksum é pulada", () => {
  const parts = buildVolumeParts({ disciplines: [{ pranchas: [{ name: "vazia.pdf" }] }] });
  assert.equal(parts.length, 0);
});
```

(Se o arquivo usar outro nome para o helper de teste que não `test`, usar o dele.)

- [ ] **Step 2: Rodar e ver falhar.**

Run: `node scripts/test-nexo-parts.ts`
Expected: FAIL — `checksum` não aparece na parte (e/ou erro de tipo ignorado pelo strip; a asserção falha).

- [ ] **Step 3: `volume-parts.ts`.** Trocar as interfaces e o `pushPart`:

```ts
/**
 * Uma parte do volume no formato de FIO que a rota `/api/nexo/volume` consome.
 * EXATAMENTE UM de:
 *   · `data`: o PDF em base64 cru — o que nasce no navegador (capa, LD,
 *     separatriz) e a prancha que ainda não foi guardada;
 *   · `checksum`: a prancha GUARDADA no cofre (09/10/2026). O servidor lê os
 *     bytes de lá, e o pedido cai de dezenas de MB para alguns KB.
 * `startPage`/`endPage` recortam o intervalo de pranchas num PDF combinado.
 */
export interface VolumePart {
  role: VolumePartRole;
  name: string;
  data?: string;
  checksum?: string;
  startPage?: number;
  endPage?: number;
}

/** Fonte de UMA parte já gerada (capa/separatriz/LD ou uma prancha). */
export interface VolumePartSource {
  /** nome do arquivo/rótulo da parte. */
  name: string;
  /** PDF em base64 cru. */
  data?: string;
  /** sha256 da prancha guardada no cofre. */
  checksum?: string;
  /** intervalo (1-based) a incluir; usado só para pranchas de PDF combinado. */
  startPage?: number;
  endPage?: number;
}
```

```ts
/** Anexa uma fonte como parte do papel `role`, ignorando fontes sem bytes nem referência. */
function pushPart(
  parts: VolumePart[],
  role: VolumePartRole,
  source: VolumePartSource | null | undefined,
): void {
  if (!source || (!source.data && !source.checksum)) return;
  parts.push({
    role,
    name: source.name,
    ...(source.checksum ? { checksum: source.checksum } : { data: source.data }),
    ...(typeof source.startPage === "number" ? { startPage: source.startPage } : {}),
    ...(typeof source.endPage === "number" ? { endPage: source.endPage } : {}),
  });
}
```

- [ ] **Step 4: Rodar e ver passar.**

Run: `node scripts/test-nexo-parts.ts`
Expected: todos `ok`.

- [ ] **Step 5: A rota do volume.** Em `app/api/nexo/volume/route.ts`:

  (a) imports — acrescentar:

```ts
import { CHECKSUM } from "@/lib/pranchas/regras";
import { bytesDasPranchas, projetoDoEscritorio } from "@/server/pranchas";
```

  (b) trocar `await requireActor();` por `const actor = await requireActor();` e declarar `let actor` fora do `try`, assim:

```ts
  let actor: Awaited<ReturnType<typeof requireActor>>;
  try {
    actor = await requireActor();
  } catch (err) {
    const negado = accessDeniedResponse(err);
    if (negado) return negado;
    throw err;
  }
```

  (c) no `parts = body.parts.map(...)`, trocar o tipo bruto e a validação de `data` por:

```ts
      const part = raw as {
        role?: unknown;
        name?: unknown;
        data?: unknown;
        checksum?: unknown;
        startPage?: unknown;
        endPage?: unknown;
      };
```

```ts
      const temData = typeof part.data === "string" && part.data.length > 0;
      const temChecksum = typeof part.checksum === "string" && CHECKSUM.test(part.checksum);
      if (temData === temChecksum) {
        throw new Error(`parts[${index}] precisa de data OU checksum`);
      }
      return {
        role: part.role as VolumePartRole,
        name: part.name,
        buffer: temData ? Buffer.from(part.data as string, "base64") : Buffer.alloc(0),
        checksum: temChecksum ? (part.checksum as string) : undefined,
        startPage: typeof part.startPage === "number" ? part.startPage : undefined,
        endPage: typeof part.endPage === "number" ? part.endPage : undefined,
      };
```

  e mudar a declaração `let parts: VolumePart[];` para `let parts: (VolumePart & { checksum?: string })[];`.

  (d) logo depois do `if (parts.length === 0) {...}` e antes de `assembleVolume(...)`, acrescentar:

```ts
  /*
   * AS PRANCHAS GUARDADAS chegam por checksum (09/10/2026). Cada uma precisa de
   * ficha NESTE projeto — do cabeçalho, conferido contra o escritório — e os
   * bytes saem do cofre aqui. Faltou alguma: 409 com os NOMES, para o cartão
   * pedir só essas de volta em vez de montar um volume com folha faltando.
   */
  const porReferencia = parts.filter((p) => p.checksum);
  if (porReferencia.length) {
    const projeto = projetoDoPedido(req.headers);
    if (!projeto || !(await projetoDoEscritorio(projeto, actor.organizationId))) {
      return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });
    }
    const lidos = await bytesDasPranchas({
      projectId: projeto,
      organizationId: actor.organizationId,
      pedidas: porReferencia.map((p) => ({ checksum: p.checksum as string, nome: p.name })),
    });
    if (!lidos.ok) {
      return NextResponse.json(
        { error: "Algumas pranchas não estão guardadas.", faltando: lidos.faltando },
        { status: 409 },
      );
    }
    for (const p of porReferencia) p.buffer = lidos.bytes.get(p.checksum as string) as Buffer;
  }
```

  (e) na chamada `assembleVolume({ parts, ... })`, passar as partes sem o campo extra:

```ts
  const result = await assembleVolume({
    parts: parts.map(({ checksum: _checksum, ...p }) => p),
    fileName,
    reorder,
    metadados,
  });
```

  Atualizar o comentário do topo do arquivo: "recebe as partes (…) como PDFs em base64 **ou, para a prancha guardada, o checksum dela no cofre**".

- [ ] **Step 6: Tipos.**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: erros SÓ em `modules/nexo/lib/assemble-volume.ts` ou consumidores de `VolumePartSource.data` como `string` obrigatório, se houver; corrigir tratando `data` como opcional onde for lido (nenhum consumidor deve depender dele além de `pushPart`). Sem outros erros.

- [ ] **Step 7: Commit.**

```bash
git add server/nexo/volume-parts.ts app/api/nexo/volume/route.ts scripts/test-nexo-parts.ts
git diff --cached --stat
git commit -m "Montagem por referência: a prancha guardada vai por checksum e o servidor lê do cofre"
```

---

### Task 5: O expurgo leva as pranchas

**Files:**
- Modify: `server/admin/expurgo.ts` (`arquivosQueMorrem`, ~linhas 271-330)

**Interfaces:**
- Consumes: `prisma.pranchaDoProjeto` (Task 1).

- [ ] **Step 1: Candidatos.** No bloco `if (alvo.projectId) { ... Promise.all([...]) }`, acrescentar a quarta consulta e incluí-la no laço:

```ts
    const [docs, envios, artefatos, pranchas] = await Promise.all([
      prisma.projectDocument.findMany({ where: doProjeto, select: { checksumSha256: true } }),
      prisma.projectUpload.findMany({ where: doProjeto, select: { checksumSha256: true } }),
      prisma.documentArtifact.findMany({ where: doProjeto, select: { checksumSha256: true } }),
      prisma.pranchaDoProjeto.findMany({ where: { projectId: alvo.projectId }, select: { checksumSha256: true } }),
    ]);
    for (const linha of [...docs, ...envios, ...artefatos, ...pranchas]) {
```

  e atualizar o comentário acima: "documentos, envios, artefatos **e pranchas guardadas**".

- [ ] **Step 2: Quem ainda aponta.** Trocar o comentário "As quatro tabelas" por "As cinco tabelas" e acrescentar a quinta consulta ao `Promise.all` de `deAuditoria, deUpload, deDocumento, deArtefato`:

```ts
  const [deAuditoria, deUpload, deDocumento, deArtefato, dePrancha] = await Promise.all([
    // … as quatro consultas existentes, sem mudança …
    prisma.pranchaDoProjeto.findMany({
      where: {
        checksumSha256: { in: lista },
        ...(alvo.projectId ? { NOT: { projectId: alvo.projectId } } : {}),
      },
      select: { checksumSha256: true },
    }),
  ]);

  const vivos = [...deAuditoria, ...deUpload, ...deDocumento, ...deArtefato, ...dePrancha]
```

  (`projectId` de `PranchaDoProjeto` nunca é nulo, então aqui não precisa do `OR` com nulo das outras.)

- [ ] **Step 3: Apagar a ficha antes do projeto.** Não é preciso: `onDelete: Cascade` leva as fichas junto com `prisma.project.delete`. Conferir lendo o bloco "O PROJETO por último" e acrescentar `PranchaDoProjeto` à frase do comentário ("`ProjectEvent` **e `PranchaDoProjeto`** saem por cascade").

- [ ] **Step 4: Tipos e teste puro do expurgo.**

Run: `npx tsc --noEmit -p tsconfig.json && node scripts/test-expurgo.ts`
Expected: sem erros; teste do expurgo todo `ok`.

- [ ] **Step 5: Commit.**

```bash
git add server/admin/expurgo.ts
git diff --cached --stat
git commit -m "Expurgo: as pranchas guardadas saem com o projeto, e o bucket só perde o que ninguém mais usa"
```

---

### Task 6: O cliente — fichas, envio e a prancha da sessão

**Files:**
- Create: `modules/nexo/lib/pranchas-guardadas.ts`
- Create: `scripts/test-pranchas-na-sessao.ts`

**Interfaces:**
- Produces:
  - `type FichaDePrancha` (mesmo formato da Task 3; redeclarado aqui, puro)
  - `type EstadoDoEnvio = "subindo" | "falhou"`
  - `interface PranchaNaSessao { name: string; file: File | null; checksum: string | null; estado: "na-memoria" | "subindo" | "guardada" | "falhou" }`
  - `juntarPranchas(files: File[], fichas: FichaDePrancha[], envio: ReadonlyMap<string, EstadoDoEnvio>): PranchaNaSessao[]`
  - `resumoDoEnvio(pranchas: PranchaNaSessao[]): { subindo: number; total: number; falharam: string[] }`
  - `comTentativas<T>(fn: () => Promise<T>, opts?: { tentativas?: number; espera?: (ms: number) => Promise<void>; deveRepetir?: (err: unknown) => boolean }): Promise<T>`
  - `emParalelo<T>(itens: T[], limite: number, fn: (item: T) => Promise<void>): Promise<void>`
  - `class EnvioRecusado extends Error { status: number }` — 4xx que não adianta repetir
  - `listarFichas(projeto: string): Promise<FichaDePrancha[]>`
  - `enviarPrancha(projeto: string, file: File): Promise<FichaDePrancha>` (já com 3 tentativas)
  - `baixarPrancha(ficha: { name: string; checksum: string }): Promise<File>`
  - `removerFicha(projeto: string, nome: string): Promise<void>`

- [ ] **Step 1: Teste que falha.** Criar `scripts/test-pranchas-na-sessao.ts`:

```ts
/**
 * A PRANCHA DA SESSÃO: o que a aba tem em memória somado ao que o servidor
 * guardou. Puro → node cru.
 *
 *   node scripts/test-pranchas-na-sessao.ts   (parte de npm run test:pranchas)
 */
import assert from "node:assert/strict";

import {
  comTentativas,
  emParalelo,
  EnvioRecusado,
  juntarPranchas,
  resumoDoEnvio,
  type FichaDePrancha,
} from "../modules/nexo/lib/pranchas-guardadas.ts";

let passed = 0;
async function test(nome: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${nome}`);
  } catch (err) {
    console.error(`FALHOU  ${nome}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const arquivo = (nome: string) => new File([new Uint8Array([1])], nome, { type: "application/pdf" });
const ficha = (fileName: string, checksum = "a".repeat(64)): FichaDePrancha => ({
  fileName,
  checksum,
  paginas: 1,
  sizeBytes: 1,
  atualizadaEm: "2026-10-09T12:00:00.000Z",
});

console.log("prancha da sessão\n");

await test("depois do F5: só fichas, todas guardadas e sem bytes", () => {
  const p = juntarPranchas([], [ficha("01.pdf"), ficha("02.pdf")], new Map());
  assert.deepEqual(p.map((x) => [x.name, x.estado, x.file]), [
    ["01.pdf", "guardada", null],
    ["02.pdf", "guardada", null],
  ]);
});

await test("arquivo que acabou de chegar e ainda sobe", () => {
  const f = arquivo("03.pdf");
  const [p] = juntarPranchas([f], [], new Map([["03.pdf", "subindo"]]));
  assert.equal(p.estado, "subindo");
  assert.equal(p.file, f);
  assert.equal(p.checksum, null);
});

await test("arquivo em memória que já tem ficha: guardada, com bytes à mão", () => {
  const f = arquivo("01.pdf");
  const [p] = juntarPranchas([f], [ficha("01.pdf", "b".repeat(64))], new Map());
  assert.equal(p.estado, "guardada");
  assert.equal(p.file, f);
  assert.equal(p.checksum, "b".repeat(64));
});

await test("trocar pelo nome: o arquivo novo subindo vence a ficha velha", () => {
  const [p] = juntarPranchas([arquivo("01.pdf")], [ficha("01.pdf")], new Map([["01.pdf", "subindo"]]));
  assert.equal(p.estado, "subindo");
  assert.equal(p.checksum, null);
});

await test("conversa sem projeto: na memória", () => {
  const [p] = juntarPranchas([arquivo("01.pdf")], [], new Map());
  assert.equal(p.estado, "na-memoria");
});

await test("a ordem é a dos arquivos e depois a das fichas, sem repetir nome", () => {
  const p = juntarPranchas([arquivo("02.pdf")], [ficha("01.pdf"), ficha("02.pdf")], new Map());
  assert.deepEqual(p.map((x) => x.name), ["02.pdf", "01.pdf"]);
});

await test("resumo do envio conta quem sobe e nomeia quem falhou", () => {
  const p = juntarPranchas(
    [arquivo("a.pdf"), arquivo("b.pdf"), arquivo("c.pdf")],
    [],
    new Map<string, "subindo" | "falhou">([["a.pdf", "subindo"], ["b.pdf", "falhou"]]),
  );
  assert.deepEqual(resumoDoEnvio(p), { subindo: 1, total: 3, falharam: ["b.pdf"] });
});

await test("tenta 3 vezes com espera crescente e desiste", async () => {
  const esperas: number[] = [];
  let chamadas = 0;
  await assert.rejects(
    comTentativas(
      async () => {
        chamadas++;
        throw new Error("rede");
      },
      { espera: async (ms) => void esperas.push(ms) },
    ),
    /rede/,
  );
  assert.equal(chamadas, 3);
  assert.deepEqual(esperas, [1000, 2000]);
});

await test("recusa do servidor (4xx) não é repetida", async () => {
  let chamadas = 0;
  await assert.rejects(
    comTentativas(
      async () => {
        chamadas++;
        throw new EnvioRecusado(415, "não é PDF");
      },
      { espera: async () => {} },
    ),
  );
  assert.equal(chamadas, 1);
});

await test("em paralelo respeita o limite", async () => {
  let agora = 0;
  let pico = 0;
  await emParalelo([1, 2, 3, 4, 5, 6, 7], 3, async () => {
    agora++;
    pico = Math.max(pico, agora);
    await new Promise((r) => setTimeout(r, 5));
    agora--;
  });
  assert.equal(pico, 3);
});

console.log(`\n${passed} ok`);
```

- [ ] **Step 2: Rodar e ver falhar.**

Run: `node scripts/test-pranchas-na-sessao.ts`
Expected: FAIL com `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implementar.** Criar `modules/nexo/lib/pranchas-guardadas.ts`:

```ts
/**
 * AS PRANCHAS GUARDADAS, do lado do navegador (09/10/2026).
 *
 * `pranchaFiles: File[]` continua sendo "os bytes que ESTA aba tem". As fichas
 * vêm do servidor e sobrevivem ao F5. `juntarPranchas` soma os dois num tipo
 * só, `PranchaNaSessao`, que é o que desce para os cartões: quem só precisa do
 * nome ou da contagem lê `name`; quem precisa dos bytes usa `file` ou baixa
 * pelo `checksum`.
 *
 * Sem `@/` de propósito: testado em node cru (`scripts/test-pranchas-na-sessao.ts`).
 */

export type FichaDePrancha = {
  fileName: string;
  checksum: string;
  paginas: number;
  sizeBytes: number;
  atualizadaEm: string;
};

export type EstadoDoEnvio = "subindo" | "falhou";

export interface PranchaNaSessao {
  name: string;
  /** Os bytes, quando esta aba os tem. Depois do F5, `null`. */
  file: File | null;
  /** A impressão digital no cofre, quando guardada. */
  checksum: string | null;
  /**
   * `na-memoria`: conversa sem projeto, nada a guardar ainda.
   * `subindo` / `falhou`: o envio desta aba.
   * `guardada`: tem ficha no projeto — monta por referência.
   */
  estado: "na-memoria" | "subindo" | "guardada" | "falhou";
}

export function juntarPranchas(
  files: File[],
  fichas: FichaDePrancha[],
  envio: ReadonlyMap<string, EstadoDoEnvio>,
): PranchaNaSessao[] {
  const porNome = new Map(fichas.map((f) => [f.fileName, f]));
  const vistos = new Set<string>();
  const saida: PranchaNaSessao[] = [];

  for (const file of files) {
    if (vistos.has(file.name)) continue;
    vistos.add(file.name);
    const estadoDoEnvio = envio.get(file.name);
    const guardada = porNome.get(file.name);
    if (estadoDoEnvio) {
      // O arquivo desta aba ainda não é o da ficha (ou a ficha nem existe).
      saida.push({ name: file.name, file, checksum: null, estado: estadoDoEnvio });
    } else if (guardada) {
      saida.push({ name: file.name, file, checksum: guardada.checksum, estado: "guardada" });
    } else {
      saida.push({ name: file.name, file, checksum: null, estado: "na-memoria" });
    }
  }
  for (const f of fichas) {
    if (vistos.has(f.fileName)) continue;
    vistos.add(f.fileName);
    saida.push({ name: f.fileName, file: null, checksum: f.checksum, estado: "guardada" });
  }
  return saida;
}

export function resumoDoEnvio(pranchas: PranchaNaSessao[]): {
  subindo: number;
  total: number;
  falharam: string[];
} {
  return {
    subindo: pranchas.filter((p) => p.estado === "subindo").length,
    total: pranchas.length,
    falharam: pranchas.filter((p) => p.estado === "falhou").map((p) => p.name),
  };
}

/** Resposta 4xx do servidor: repetir não muda nada. */
export class EnvioRecusado extends Error {
  readonly status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.name = "EnvioRecusado";
    this.status = status;
  }
}

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 3 tentativas, esperando 1 s e 2 s entre elas. Recusa (4xx) não repete. */
export async function comTentativas<T>(
  fn: () => Promise<T>,
  opts: {
    tentativas?: number;
    espera?: (ms: number) => Promise<void>;
    deveRepetir?: (err: unknown) => boolean;
  } = {},
): Promise<T> {
  const tentativas = opts.tentativas ?? 3;
  const espera = opts.espera ?? esperar;
  const deveRepetir = opts.deveRepetir ?? ((err) => !(err instanceof EnvioRecusado));
  let ultimo: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (err) {
      ultimo = err;
      if (!deveRepetir(err) || i === tentativas - 1) break;
      await espera(1000 * 2 ** i);
    }
  }
  throw ultimo;
}

export async function emParalelo<T>(
  itens: T[],
  limite: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const item = itens[proximo++];
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
}

async function erroDe(res: Response): Promise<Error> {
  const corpo = (await res.json().catch(() => null)) as { error?: string } | null;
  const mensagem = corpo?.error ?? `HTTP ${res.status}`;
  return res.status >= 400 && res.status < 500 ? new EnvioRecusado(res.status, mensagem) : new Error(mensagem);
}

const qs = (p: Record<string, string>) => new URLSearchParams(p).toString();

export async function listarFichas(projeto: string): Promise<FichaDePrancha[]> {
  const res = await fetch(`/api/pranchas?${qs({ projeto })}`, { cache: "no-store" });
  if (!res.ok) throw await erroDe(res);
  return ((await res.json()) as { pranchas: FichaDePrancha[] }).pranchas;
}

export function enviarPrancha(projeto: string, file: File): Promise<FichaDePrancha> {
  return comTentativas(async () => {
    const res = await fetch(`/api/pranchas?${qs({ projeto, nome: file.name })}`, {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: file,
    });
    if (!res.ok) throw await erroDe(res);
    return ((await res.json()) as { prancha: FichaDePrancha }).prancha;
  });
}

/** Os bytes de uma prancha guardada, como `File` — para o visor, a releitura e a conferência. */
export async function baixarPrancha(ficha: { name: string; checksum: string }): Promise<File> {
  const res = await fetch(`/api/arquivos/${ficha.checksum}`);
  if (!res.ok) throw new Error(`Não consegui abrir ${ficha.name} do servidor.`);
  return new File([await res.blob()], ficha.name, { type: "application/pdf" });
}

export async function removerFicha(projeto: string, nome: string): Promise<void> {
  const res = await fetch(`/api/pranchas?${qs({ projeto, nome })}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw await erroDe(res);
}
```

- [ ] **Step 4: Rodar e ver passar.**

Run: `npm run test:pranchas`
Expected: os dois arquivos todos `ok`.

- [ ] **Step 5: Commit.**

```bash
git add modules/nexo/lib/pranchas-guardadas.ts scripts/test-pranchas-na-sessao.ts
git diff --cached --stat
git commit -m "Pranchas guardadas: a prancha da sessão (memória + fichas), envio com 3 tentativas"
```

---

### Task 7: A pré-condição aprende "guardando" e "não guardada"

**Files:**
- Modify: `modules/nexo/lib/pre-condicoes-do-volume.ts`
- Modify: `scripts/test-nexo-pre-volume.ts`

**Interfaces:**
- Produces: `PartesDoVolume` ganha `subindo?: number` e `naoGuardadas?: string[]`. `motivoParaNaoMontar` checa, nesta ordem: sem pranchas → falhas → subindo → capa → LD.

- [ ] **Step 1: Testes que falham.** Em `scripts/test-nexo-pre-volume.ts`, acrescentar antes do resumo final:

```ts
test("prancha ainda subindo trava a montagem com a contagem", () => {
  const m = motivoParaNaoMontar({ temCapa: true, temLd: true, misto: false, pranchas: 40, subindo: 28 });
  assert.equal(m, "guardando as pranchas — 12 de 40; monta assim que terminar");
});

test("prancha que não foi guardada trava e diz qual", () => {
  const m = motivoParaNaoMontar({
    temCapa: true,
    temLd: true,
    misto: false,
    pranchas: 3,
    naoGuardadas: ["084-25-ARQ-02.pdf"],
  });
  assert.equal(m, "não consegui guardar 084-25-ARQ-02.pdf — tente de novo ou solte o arquivo outra vez");
});

test("várias não guardadas: diz quantas e a primeira", () => {
  const m = motivoParaNaoMontar({
    temCapa: true,
    temLd: true,
    misto: false,
    pranchas: 3,
    naoGuardadas: ["a.pdf", "b.pdf"],
  });
  assert.equal(m, "não consegui guardar 2 pranchas (a.pdf e mais 1) — tente de novo ou solte os arquivos outra vez");
});

test("sem prancha nenhuma, a frase deixa de mandar reanexar sem motivo", () => {
  const m = motivoParaNaoMontar({ temCapa: true, temLd: true, misto: false, pranchas: 0 });
  assert.equal(m, "sem as pranchas — solte os arquivos das pranchas para montar");
});
```

- [ ] **Step 2: Rodar e ver falhar.**

Run: `node scripts/test-nexo-pre-volume.ts`
Expected: FAIL nos 4 testes novos (e possivelmente num teste antigo que conferia a frase "reanexe-os" — atualizar esse para a frase nova do Step 3).

- [ ] **Step 3: Implementar.** Em `PartesDoVolume`, depois de `pranchas: number;`:

```ts
  /**
   * Quantas das `pranchas` ainda estão SUBINDO para o servidor (09/10/2026).
   * Montar no meio do envio mandaria referência de prancha sem ficha.
   */
  subindo?: number;
  /** Nomes das pranchas cujo envio falhou de vez. */
  naoGuardadas?: string[];
```

E o começo de `motivoParaNaoMontar`:

```ts
export function motivoParaNaoMontar(partes: PartesDoVolume): string | null {
  if (partes.pranchas <= 0) {
    return "sem as pranchas — solte os arquivos das pranchas para montar";
  }
  const falhas = partes.naoGuardadas ?? [];
  if (falhas.length === 1) {
    return `não consegui guardar ${falhas[0]} — tente de novo ou solte o arquivo outra vez`;
  }
  if (falhas.length > 1) {
    return `não consegui guardar ${falhas.length} pranchas (${falhas[0]} e mais ${falhas.length - 1}) — tente de novo ou solte os arquivos outra vez`;
  }
  const subindo = Math.max(0, partes.subindo ?? 0);
  if (subindo > 0) {
    return `guardando as pranchas — ${partes.pranchas - subindo} de ${partes.pranchas}; monta assim que terminar`;
  }
  // … o resto (capa, LD) sem mudança …
```

Atualizar o comentário do topo do arquivo: o parágrafo "O estrago aparece na conversa RETOMADA…" ganha uma linha final: "Desde 09/10/2026 as pranchas são guardadas por projeto e voltam no F5; a trava continua para a conversa sem projeto e para o envio que falhou."

- [ ] **Step 4: Rodar e ver passar.**

Run: `node scripts/test-nexo-pre-volume.ts`
Expected: todos `ok`.

- [ ] **Step 5: Commit.**

```bash
git add modules/nexo/lib/pre-condicoes-do-volume.ts scripts/test-nexo-pre-volume.ts
git diff --cached --stat
git commit -m "Pré-condição do volume: espera o envio das pranchas e nomeia a que não foi guardada"
```

---

### Task 8: `PranchaNaSessao` desce até a montagem e a conferência

**Files:**
- Modify: `modules/nexo/lib/assemble-volume.ts`
- Modify: `modules/nexo/lib/selo-check.ts:110-135`
- Modify: `modules/nexo/lib/generate.ts` (`postVolume`)
- Modify: `modules/nexo/components/ConfirmationCard.tsx` (props `pranchaFiles` em ~292/302/358, ~1083/1088/1145/1163/1358, ~1423/1430/1523-1529/1557/1859/2049/2084, ~3409/3413/3421)
- Modify: `modules/nexo/components/NexoChat.tsx` (~97, ~115, ~641, ~748, ~778)
- Modify: `modules/nexo/components/NexoCopilot.tsx` (~39, ~79, ~232, ~255)

**Interfaces:**
- Consumes: `PranchaNaSessao`, `resumoDoEnvio`, `baixarPrancha` (Task 6); `subindo`/`naoGuardadas` (Task 7); `VolumePartSource.checksum` (Task 4).
- Produces:
  - `BlocoDoVolume.pranchas: PranchaNaSessao[]` (substitui `pranchaFiles: File[]`)
  - `conferirIdentidadeDoSelo({ selos, pranchas: PranchaNaSessao[], orgaoAlvo, conversationId })`
  - `class PranchasFaltando extends Error { faltando: string[] }` exportada de `generate.ts`
  - Props: todo `pranchaFiles: File[]` nesses três componentes vira `pranchas: PranchaNaSessao[]`.

- [ ] **Step 1: `assemble-volume.ts`.** Import:

```ts
import type { PranchaNaSessao } from "./pranchas-guardadas";
```

Em `BlocoDoVolume`, trocar o campo:

```ts
  /**
   * As pranchas deste bloco. A guardada vai por `checksum` (o servidor lê do
   * cofre); a que só existe nesta aba vai em base64, como sempre foi.
   */
  pranchas: PranchaNaSessao[];
```

No corpo de `assembleVolume`, trocar o cache e o laço:

```ts
  const bytes = new Map<File, Promise<string>>();
  const base64De = (file: File): Promise<string> => {
    const guardado = bytes.get(file);
    if (guardado) return guardado;
    const lendo = fileToBase64(file);
    bytes.set(file, lendo);
    return lendo;
  };
```

(fica igual) e:

```ts
    const ordered = [...bloco.pranchas].sort(
      (a, b) =>
        (sheetNumberFromFilename(a.name) ?? 9999) -
        (sheetNumberFromFilename(b.name) ?? 9999),
    );
    const pranchas: VolumePartSource[] = [];
    for (const prancha of ordered) {
      const fonte: VolumePartSource | null =
        prancha.estado === "guardada" && prancha.checksum
          ? { name: prancha.name, checksum: prancha.checksum }
          : prancha.file
            ? { name: prancha.name, data: await base64De(prancha.file) }
            : null;
      if (!fonte) continue; // a pré-condição já recusou; aqui só não quebra
      const range = pages.get(prancha.name);
      pranchas.push(
        range && range.length > 0
          ? { ...fonte, startPage: Math.min(...range), endPage: Math.max(...range) }
          : fonte,
      );
    }
```

Atualizar o comentário do topo: "as pranchas — **por referência quando guardadas no cofre, em base64 quando só existem nesta aba** — recortadas por faixa de página".

- [ ] **Step 2: `generate.ts` — o 409.** Acima de `postVolume`:

```ts
/** O servidor não achou estas pranchas guardadas — o cartão pede só elas de volta. */
export class PranchasFaltando extends Error {
  readonly faltando: string[];
  constructor(faltando: string[]) {
    super(
      faltando.length === 1
        ? `A prancha ${faltando[0]} não está mais guardada — solte o arquivo de novo para montar.`
        : `${faltando.length} pranchas não estão mais guardadas (${faltando.slice(0, 3).join(", ")}${faltando.length > 3 ? "…" : ""}) — solte os arquivos de novo para montar.`,
    );
    this.name = "PranchasFaltando";
    this.faltando = faltando;
  }
}
```

Em `postVolume`, ampliar o tipo do `payload` com `faltando?: string[];` e, antes do `if (!res.ok || !payload?.pdf)`:

```ts
  if (res.status === 409 && payload?.faltando?.length) {
    throw new PranchasFaltando(payload.faltando);
  }
```

- [ ] **Step 3: `selo-check.ts`.** Import `import { baixarPrancha, type PranchaNaSessao } from "./pranchas-guardadas";`. Trocar o parâmetro e o mapa:

```ts
export async function conferirIdentidadeDoSelo(args: {
  selos: SeloForLd[];
  pranchas: PranchaNaSessao[];
  /** A prefeitura DECLARADA para quem o volume vai. */
  orgaoAlvo: string;
  conversationId?: string | null;
}): Promise<SeloCheckResponse> {
  const porNome = new Map(args.pranchas.map((p) => [p.name, p]));
  const escolhidas = amostraDosSelos(args.selos);

  const amostras: { label: string; imageDataUrl: string }[] = [];
  const esperado: { label: string; folha: number | null; total: number | null }[] = [];
  for (const e of escolhidas) {
    const prancha = porNome.get(e.selo.fileName);
    if (!prancha) continue;
    try {
      /*
       * Depois do F5 a prancha guardada não tem bytes na aba: baixa só as da
       * amostra (poucas), não o projeto inteiro.
       */
      const file =
        prancha.file ??
        (prancha.checksum ? await baixarPrancha({ name: prancha.name, checksum: prancha.checksum }) : null);
      if (!file) continue;
      const imageDataUrl = await recortarSelo(file, e.selo.pageNumber ?? 1);
```

(o resto do laço sem mudança). No comentário acima da função, trocar "`pranchaFiles` são os PDFs retidos" por "`pranchas` são as da sessão; a guardada sem bytes na aba é baixada do cofre".

- [ ] **Step 4: Renomear a prop nos três componentes.** Em `ConfirmationCard.tsx`, `NexoChat.tsx` e `NexoCopilot.tsx`:
  - import: `import type { PranchaNaSessao } from "../lib/pranchas-guardadas";`
  - toda declaração `pranchaFiles?: File[]` / `pranchaFiles: File[]` → `pranchas?: PranchaNaSessao[]` / `pranchas: PranchaNaSessao[]`; todo `pranchaFiles = []` na desestruturação → `pranchas = []`; todo `pranchaFiles={pranchaFiles}` → `pranchas={pranchas}`; `pranchaFiles.length` → `pranchas.length`.
  - `.name` continua valendo (filtros como `pranchaFiles.filter((f) => doTomo.has(f.name))` só trocam o nome da variável).
  - `ConfirmationCard.tsx:1143`: `conferirIdentidadeDoSelo({ selos, pranchas, orgaoAlvo, conversationId })`.
  - `ConfirmationCard.tsx:1523` — `pranchaFilesDoTomo` vira `pranchasDoTomo`, mesma lógica sobre `pranchas`.
  - `ConfirmationCard.tsx:1859`: `pranchas: pranchasDoTomo.filter((p) => arquivos.has(p.name)),`.
  - `ConfirmationCard.tsx:1557` (`motivoParaNaoMontar`): passar também

```ts
    subindo: resumoDoEnvio(pranchasDoTomo).subindo,
    naoGuardadas: resumoDoEnvio(pranchasDoTomo).falharam,
```

    com `import { resumoDoEnvio, type PranchaNaSessao } from "../lib/pranchas-guardadas";`.

    **A ABA FECHADA NO MEIO DO ENVIO** (spec, tabela de erros): depois do F5, a
    folha cujo selo foi lido mas cuja prancha não ganhou ficha não aparece em
    `pranchasDoTomo` — e `assembleVolume` simplesmente não a teria. Sem isto, o
    volume sairia sem ela, calado. `naoGuardadas` passa a ser:

```ts
    naoGuardadas: [
      ...resumoDoEnvio(pranchasDoTomo).falharam,
      ...[...new Set(selosDoTomo.map((s) => s.fileName))].filter(
        (nome) => !pranchasDoTomo.some((p) => p.name === nome),
      ),
    ],
```

    (A regra já está testada em `test-nexo-pre-volume.ts` pelo caso "prancha
    que não foi guardada trava e diz qual"; quem alimenta é o cartão.) Fazer o mesmo no outro `motivoParaNaoMontar` do arquivo (~1358, onde lê `m.pranchaFiles.length` → `m.pranchas.length`).
  - No `catch` da montagem (procurar onde o erro de `assembleVolume(...)` vira mensagem no cartão, perto da linha ~1886), nada muda: `PranchasFaltando` já traz a frase pronta em `message`.

Run para achar tudo: `grep -n "pranchaFiles" modules/nexo/components/ConfirmationCard.tsx modules/nexo/components/NexoChat.tsx modules/nexo/components/NexoCopilot.tsx modules/nexo/lib/*.ts`
Expected depois da troca: só `NexoWorkspace.tsx` ainda usa `pranchaFiles` (Task 9).

- [ ] **Step 5: Tipos.**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: erros só em `NexoWorkspace.tsx` (passa `pranchaFiles=` aos filhos) — resolvidos na Task 9. Nenhum outro.

- [ ] **Step 6: Testes puros vizinhos.**

Run: `node scripts/test-nexo-parts.ts && node scripts/test-nexo-pre-volume.ts && npm run test:pranchas`
Expected: tudo `ok`.

- [ ] **Step 7: Commit junto com a Task 9** (a árvore não compila entre as duas; não commitar aqui).

---

### Task 9: O Nexo guarda, recupera e entrega as pranchas

**Files:**
- Modify: `modules/nexo/components/NexoWorkspace.tsx`

**Interfaces:**
- Consumes: tudo da Task 6; `conv.projectId` (já existe, linha ~2012).
- Produces: `pranchas: PranchaNaSessao[]` passada a `NexoCopilot` (linha ~3068) no lugar de `pranchaFiles`.

- [ ] **Step 1: Estado.** Logo depois de `const [pranchaFiles, setPranchaFiles] = useState<File[]>([]);` (~393):

```tsx
  /*
   * AS PRANCHAS GUARDADAS (09/10/2026). `pranchaFiles` são os bytes desta aba;
   * `fichas` é o que o servidor guardou para o projeto e volta no F5; `envio`
   * diz, por nome, o que ainda sobe ou falhou. `enviados` lembra QUAL `File` já
   * foi guardado — por identidade, não por nome: soltar outro arquivo com o
   * mesmo nome é troca, e precisa subir de novo.
   */
  const [fichas, setFichas] = useState<FichaDePrancha[]>([]);
  const [envio, setEnvio] = useState<ReadonlyMap<string, EstadoDoEnvio>>(new Map());
  const enviados = useRef(new WeakSet<File>());
  const pranchas = useMemo(() => juntarPranchas(pranchaFiles, fichas, envio), [pranchaFiles, fichas, envio]);
```

Imports no topo:

```tsx
import {
  baixarPrancha,
  emParalelo,
  enviarPrancha,
  juntarPranchas,
  listarFichas,
  removerFicha,
  type EstadoDoEnvio,
  type FichaDePrancha,
} from "../lib/pranchas-guardadas";
```

- [ ] **Step 2: `limparPranchas` zera tudo.**

```tsx
  const limparPranchas = useCallback(() => {
    urlsDasPranchas.current.forEach((url) => URL.revokeObjectURL(url));
    urlsDasPranchas.current.clear();
    setPranchaFiles([]);
    setFichas([]);
    setEnvio(new Map());
  }, []);
```

- [ ] **Step 3: Buscar as fichas quando o projeto muda.** Junto do efeito que chama `definirProjetoDaConversa(conv.projectId)` (~2012), acrescentar:

```tsx
  /*
   * NO F5 (e ao abrir outra conversa do projeto) as fichas voltam do servidor —
   * sem bytes. É isto que aposenta o "reanexe-os para montar".
   */
  useEffect(() => {
    const projeto = conv.projectId;
    if (!projeto) return;
    let vivo = true;
    listarFichas(projeto)
      .then((lista) => {
        if (vivo) setFichas(lista);
      })
      .catch(() => {
        // Sem fichas a tela fica como antes do recurso; o envio tenta de novo.
      });
    return () => {
      vivo = false;
    };
  }, [conv.projectId]);
```

- [ ] **Step 4: Subir o que é novo.** Logo abaixo:

```tsx
  /*
   * TODO `File` que entra em `pranchaFiles` sobe uma vez, 3 por vez — seja do
   * drop, do reanexo ou do arquivo que deixou de ser memorial. Sem projeto, nada
   * sobe: a prancha fica na memória como sempre, e sobe quando o projeto existir
   * (o efeito roda de novo quando `conv.projectId` muda).
   */
  useEffect(() => {
    const projeto = conv.projectId;
    if (!projeto) return;
    const novos = pranchaFiles.filter((f) => !enviados.current.has(f));
    if (!novos.length) return;
    novos.forEach((f) => enviados.current.add(f));
    setEnvio((prev) => {
      const prox = new Map(prev);
      novos.forEach((f) => prox.set(f.name, "subindo"));
      return prox;
    });
    void emParalelo(novos, 3, async (file) => {
      try {
        const ficha = await enviarPrancha(projeto, file);
        setFichas((prev) => [...prev.filter((f) => f.fileName !== ficha.fileName), ficha]);
        setEnvio((prev) => {
          const prox = new Map(prev);
          prox.delete(file.name);
          return prox;
        });
      } catch {
        enviados.current.delete(file); // "tentar de novo" = deixar o efeito pegar de novo
        setEnvio((prev) => new Map(prev).set(file.name, "falhou"));
      }
    });
  }, [pranchaFiles, conv.projectId]);

  /** O botão "Tentar de novo": devolve as que falharam para a fila. */
  const tentarDeNovo = useCallback(() => {
    setEnvio((prev) => new Map([...prev].filter(([, estado]) => estado !== "falhou")));
    setPranchaFiles((prev) => [...prev]); // novo array → o efeito de envio roda
  }, []);
```

- [ ] **Step 5: O memorial que sai de prancha tira a ficha.** Na linha ~670 (`setPranchaFiles((prev) => prev.filter((f) => f.name !== file.name));`), logo abaixo:

```tsx
      setFichas((prev) => prev.filter((f) => f.fileName !== file.name));
      if (conv.projectId) removerFicha(conv.projectId, file.name).catch(() => {});
```

Fazer o mesmo na linha ~1277 (memorial vindo do drop, com `memorial.name`).

- [ ] **Step 6: Bytes sob demanda (`garantirBytes`).** Depois de `pranchas`:

```tsx
  /*
   * OS BYTES QUANDO ALGUÉM PRECISA DELES: reler os selos, preencher títulos,
   * abrir no visor. Depois do F5 a prancha guardada não tem `File`; baixa do
   * cofre e entra em `pranchaFiles` já marcada como enviada (não sobe de novo).
   */
  const garantirBytes = useCallback(
    async (nomes?: string[]): Promise<File[]> => {
      const alvo = pranchas.filter((p) => !p.file && p.checksum && (!nomes || nomes.includes(p.name)));
      const baixados = await Promise.all(
        alvo.map((p) => baixarPrancha({ name: p.name, checksum: p.checksum as string })),
      );
      baixados.forEach((f) => enviados.current.add(f));
      if (baixados.length) setPranchaFiles((prev) => [...prev, ...baixados]);
      const emMaos = pranchas.flatMap((p) => (p.file ? [p.file] : []));
      return [...emMaos, ...baixados].filter((f) => !nomes || nomes.includes(f.name));
    },
    [pranchas],
  );
```

E usar:
  - `relerSelos` (~2249): `if (pranchas.length === 0) return;` e `const arquivos = await garantirBytes();` antes de `lerPranchas([...arquivos], [], null, new Set<string>(), { ignorarMemoria: true });`.
  - `preencherTitulos` (~2265): `const n = await preencherTitulosFaltantes(await garantirBytes(), copia);`.
  - `abrirFolha` (~2585):

```tsx
  const abrirFolha = useCallback(
    (id: FolhaId) => {
      if (folhasNoVisor.some((f) => f.id === id)) {
        setFolhaNoVisor(id);
        return;
      }
      // Guardada, sem bytes nesta aba: baixa só ESTA e abre.
      const folha = selos.find((s) => s.id === id);
      if (!folha || !pranchas.some((p) => p.name === folha.fileName)) return;
      void garantirBytes([folha.fileName]).then(() => setFolhaNoVisor(id));
    },
    [folhasNoVisor, selos, pranchas, garantirBytes],
  );
```

  - `arquivosDisponiveis` (~2528): `() => new Set(pranchas.map((p) => p.name)), [pranchas]` — a folha guardada passa a ser abrível no canvas.
  - As faixas das linhas ~2831 e ~2855 (`pranchaFiles.length > 0`) passam a `pranchas.length > 0`.

- [ ] **Step 7: Entregar `pranchas` aos filhos.** Na linha ~3068: `pranchas={pranchas}` no lugar de `pranchaFiles={pranchaFiles}`. Se o `NexoCopilot` tiver um ponto onde o cartão mostra o envio, passar também `tentarDeNovo` — só se já existir um lugar natural; senão, mostrar o botão junto da faixa de aviso do Workspace:

```tsx
      {resumoDoEnvio(pranchas).falharam.length > 0 && (
        <div className="nx-faixa nx-faixa--aviso" role="status">
          {resumoDoEnvio(pranchas).falharam.length === 1
            ? `Não consegui guardar ${resumoDoEnvio(pranchas).falharam[0]}.`
            : `Não consegui guardar ${resumoDoEnvio(pranchas).falharam.length} pranchas.`}{" "}
          <button type="button" className="nx-link" onClick={tentarDeNovo}>
            Tentar de novo
          </button>
        </div>
      )}
```

  Usar as MESMAS classes das faixas vizinhas (~2831/~2855) — ler essas duas e copiar a estrutura delas em vez de `nx-faixa` se forem outras. `resumoDoEnvio` entra no import do Step 1.

- [ ] **Step 8: Tipos, lint do arquivo e testes.**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint modules/nexo/components/NexoWorkspace.tsx modules/nexo/lib/pranchas-guardadas.ts && npm run test:pranchas && node scripts/test-nexo-pre-volume.ts && node scripts/test-nexo-parts.ts`
Expected: tsc sem erros; eslint sem erros NOVOS nesses arquivos (comparar com `git stash` se houver dúvida); testes `ok`.
Se o eslint acusar `react-hooks/set-state-in-effect` no `setEnvio` síncrono do efeito de envio (Step 4), marcar "subindo" dentro de `Promise.resolve().then(() => setEnvio(...))` — o mesmo dado, fora do corpo síncrono do efeito.

- [ ] **Step 9: Commit (Tasks 8 + 9 juntas).**

```bash
git add modules/nexo/lib/assemble-volume.ts modules/nexo/lib/selo-check.ts modules/nexo/lib/generate.ts modules/nexo/components/ConfirmationCard.tsx modules/nexo/components/NexoChat.tsx modules/nexo/components/NexoCopilot.tsx modules/nexo/components/NexoWorkspace.tsx
git diff --cached --stat
git commit -m "Pranchas guardadas no Nexo: sobem ao soltar, voltam no F5 e montam por referência"
```

---

### Task 10: Prova no navegador, medida e o bucket

**Files:**
- Modify: `C:\Users\matheus.mendes\.claude\projects\C--Dev-trabalho-empresa-nexodoc\memory\nexodoc-pranchas-guardadas.md` (novo) + `MEMORY.md`

- [ ] **Step 1: Medir ANTES (caminho antigo).** Em `git stash`/checkout do commit anterior à Task 4 NÃO é necessário: usar a conversa sem projeto (base64) como "antes". No dev local (3000), com DevTools → Network, montar um volume do 084-25 numa conversa sem projeto e anotar o tamanho do pedido `POST /api/nexo/volume`.

- [ ] **Step 2: Prova de ponta a ponta (com projeto).**
  1. Abrir conversa do projeto 084-25, soltar as pranchas (pasta de teste do projeto, ver memória `nexodoc-test-artifacts`; se não achar, **pedir o arquivo ao Matheus**, nunca varrer discos).
  2. Ver no Network os `POST /api/pranchas` (3 por vez) e o cartão em "guardando X de N" até zerar.
  3. F5. Expected: o canvas mostra as folhas, o cartão NÃO pede reanexo, `GET /api/pranchas` devolve as fichas.
  4. Abrir uma folha no visor. Expected: um `GET /api/arquivos/<checksum>` só dessa e o visor abre.
  5. Montar o volume. Expected: `POST /api/nexo/volume` com alguns KB; o PDF sai com o mesmo número de páginas e a mesma ordem do volume montado antes (comparar `pageCount` e as `partes` da resposta).
  6. Anotar os dois tamanhos de pedido (antes/depois).

- [ ] **Step 3: Falhas.**
  - Com DevTools → Network → "Offline" logo depois de soltar: as pranchas viram "não guardada"; a faixa com *Tentar de novo* aparece; voltar online e clicar → sobem.
  - No banco de dev, apagar UMA ficha (`DELETE FROM "PranchaDoProjeto" WHERE "fileName" = '…'`) com a aba aberta e montar: Expected 409 e a frase "A prancha … não está mais guardada — solte o arquivo de novo para montar."

- [ ] **Step 4: Bateria e CI.**

Run: `npm run bateria -- --so-puros`
Expected: verde (os dois testes novos entram sozinhos).
Depois do push, conferir `verificacao` e `bateria` verdes no GitHub Actions (`gh run list -L 4`).

- [ ] **Step 5: O bucket na Railway — PARAR E PERGUNTAR.** Criar o bucket e as variáveis é ação na conta do Matheus: perguntar se ele cria ou se autoriza criar. As variáveis do serviço:

```
NEXODOC_STORAGE_PROVIDER=s3
NEXODOC_S3_ENDPOINT=https://storage.railway.app
NEXODOC_S3_BUCKET=<nome do bucket>
NEXODOC_S3_ACCESS_KEY_ID=<da aba Credentials do bucket>
NEXODOC_S3_SECRET_ACCESS_KEY=<idem>
NEXODOC_S3_REGION=auto
```

  Conferir antes que `NEXODOC_COFRE_CHAVE` já existe na Railway (não criar uma nova se existir — trocar torna ilegível o que já está guardado).

- [ ] **Step 6: Prova em produção.** Depois do deploy: soltar 2-3 pranchas num projeto de teste, F5, montar. Conferir na aba do bucket na Railway que os objetos têm nome `org/sha256` e conteúdo ilegível (cifrado).

- [ ] **Step 7: Memória.** Escrever `nexodoc-pranchas-guardadas.md` (o que foi entregue, os números medidos antes/depois, a regra da `NEXODOC_COFRE_CHAVE`) e a linha no `MEMORY.md`; atualizar `nexodoc-montagem-um-passo.md` ("falta só pranchas no S3" → feito) e `nexodoc-pranchas-reanexadas.md` (o reanexo agora é só para conversa sem projeto ou envio que falhou).
