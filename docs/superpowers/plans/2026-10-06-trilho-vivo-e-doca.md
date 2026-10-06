# Trilho vivo, doca de entrega e cartão curto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Etapas 1 e 2 de `docs/superpowers/specs/2026-10-06-canvas-da-montagem-design.md`: cada tomo do canvas vira um trilho vivo (cabeçalho com estado, peso, **Montar**/**Baixar**, e a fileira anima durante a montagem), a entrega vira uma doca no rodapé do canvas, o palco abre sempre no canvas (Volume | Lista), e o chat troca a pilha de cartões por tomo por um cartão curto.

**Architecture:** A montagem continua UMA só: o `VolumeConfirmation` de cada tomo. Ele passa a ser montado **sem tela** pelo chat (`MontadoresDoVolume`), sempre que há capa ou LD — não só quando o agente propôs um volume —, registra o montador e publica a sua situação (fase, bloqueio, erro) num contexto. O canvas (cabeçalho do tomo, nó do volume, arestas, folhas), a doca e o cartão curto só LEEM esse contexto e chamam `montador(id)`. Uma regra pura (`trilho-do-tomo.ts`) decide o que cada tomo mostra.

**Tech Stack:** Next.js + React 19 (React Compiler lint), `@xyflow/react` (canvas), `motion/react` + `lib/ds/movimento.ts` (animação), Tailwind + tokens `.ds`, `lucide-react`, testes `node scripts/*.ts`.

## Global Constraints

- Só bibliotecas que já estão no `package.json`. Nada de `three`/`gsap` neste fluxo; nada de neon/partículas.
- Toda animação tem versão parada sob `prefers-reduced-motion` (`useReducedMotion` do `motion/react` ou `@media (prefers-reduced-motion: reduce)`).
- Progresso honesto: a etapa escrita é a real (`rotuloDaFase`); a onda das folhas é decorativa e nunca diz "prancha N de M".
- Uma via de montagem: nada fora do `VolumeConfirmation` monta volume. Botões chamam `montador(id)`.
- Trava dos editáveis + teto de 20 MB valem para TODO download de PDF de volume (doca e "Baixar" do tomo).
- Núcleo puro em `modules/nexo/lib/` só com `import type` de outros módulos.
- Texto em pt-BR, frases curtas, sem emoji.
- Commit direto na `main`; mensagem termina com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. **Push só no fim (Task 6), junto com os 7 commits locais de 06/10.**

---

## Estrutura de arquivos

| Arquivo | Papel |
|---|---|
| `modules/nexo/lib/tomos-do-volume.ts` (novo) | Puro: `tomosDaProposta`, `tomosDoVolume`, `idDoVolume` — saem de `ConfirmationCard.tsx` para o canvas e o cartão usarem a mesma conta. |
| `modules/nexo/lib/trilho-do-tomo.ts` (novo) | Puro: o estado de um tomo para desenhar (estado, frase, preenchimento, ação, baixar). |
| `modules/nexo/lib/entrega-do-volume.ts` (mod.) | `TomoMontado` ganha `id` (artifactId). |
| `modules/nexo/state/montadores-de-volume.tsx` (mod.) | O contexto das fases ganha `situacoes` (bloqueio, erro) e `publicarSituacao`. |
| `modules/nexo/state/use-montar-todos.ts` (novo) | Montar um / montar todos via `montarEmLote`, com a fila no contexto. |
| `modules/nexo/components/ConfirmationCard.tsx` (mod.) | `VolumeConfirmation` ganha `semTela` e publica a situação; `MontadoresDoVolume` exportado; `case "volume"` vira `CartaoDaMontagem`; `VolumesDoConjunto` sai. |
| `modules/nexo/components/CartaoDaMontagem.tsx` (novo) | O cartão curto do chat. |
| `modules/nexo/components/NexoChat.tsx` (mod.) | Monta `<MontadoresDoVolume>` uma vez. |
| `modules/nexo/lib/layout-canvas.ts` (mod.) | `ALTURA_DA_CABECA`. |
| `modules/nexo/components/CabecaDoTomo.tsx` (novo) | Nó `cabeca` (estado + peças + Montar/Baixar + contador) e nó `volumeVazio`. |
| `modules/nexo/components/NexoCanvas.tsx` (mod.) | Layout com cabeça por fileira, nó do volume vazio, arestas/folhas vivas, enchimento no nó do volume, seguir o tomo em curso. |
| `components/telas/nexo/nexo.css` (mod.) | Keyframes da onda e da varredura das folhas. |
| `modules/nexo/components/DocaDaEntrega.tsx` (novo) | A doca no rodapé. |
| `modules/nexo/components/VistaDoVolume.tsx` (mod.) | Volume (padrão) / Lista; doca sobre o canvas. |
| `scripts/test-nexo-tomos-do-volume.ts`, `scripts/test-nexo-trilho-do-tomo.ts` (novos) | Testes dos puros. |

---

### Task 1: Os núcleos puros (tomos do volume + trilho do tomo)

**Files:**
- Create: `modules/nexo/lib/tomos-do-volume.ts`, `modules/nexo/lib/trilho-do-tomo.ts`
- Create: `scripts/test-nexo-tomos-do-volume.ts`, `scripts/test-nexo-trilho-do-tomo.ts`
- Modify: `modules/nexo/lib/entrega-do-volume.ts` (`TomoMontado.id`), `modules/nexo/components/ConfirmationCard.tsx` (usar a lib), `package.json`

**Interfaces:**
- Produces:
  - `interface TomoDaProposta { atual: number; numero: number; sufixo: string }`
  - `tomosDaProposta(numTomos: number, tomoInicial: number): TomoDaProposta[]`
  - `tomosDoVolume(results: readonly SavedResult[]): TomoDaProposta[]`
  - `idDoVolume(codigo: string | null | undefined, sufixo: string): string` → `volume:<codigo|x><sufixo>`
  - `sufixoDoTomoNoCanvas(tomoDaFileira: number): string` → `""` para 0, `:tNN` para N>0
  - `TomoMontado.id: string`
  - `type EstadoDoTomo = "incompleto" | "pronto-para-montar" | "montando" | "montado" | "acima-do-teto" | "falhou" | "fora-da-maquina"`
  - `interface Trilho { estado: EstadoDoTomo; frase: string; preenchimento: number; acao: { tipo: "montar" | "remontar" | "tentar-de-novo"; habilitada: boolean; motivo: string | null }; baixar: { habilitado: boolean; motivo: string | null; url: string | null; nome: string } | null }`
  - `trilhoDoTomo(e: EntradaDoTrilho): Trilho` com `EntradaDoTrilho = { folhas: number; fase?: FaseDaMontagem; montado?: TomoMontado; temMontador: boolean; bloqueio: string | null; erro: string | null; trava: string | null; liberacao: { liberado: boolean; motivo: string | null } }`

- [ ] **Step 1: Testes (falham)**

`scripts/test-nexo-tomos-do-volume.ts`:

```ts
/**
 * Os tomos de um volume e o id do volume de cada tomo — a MESMA conta do cartão
 * e do canvas. Núcleo PURO → node cru:
 *
 *   node scripts/test-nexo-tomos-do-volume.ts   (== npm run test:nexo:tomos-do-volume)
 */
import assert from "node:assert/strict";

import { idDoVolume, sufixoDoTomoNoCanvas, tomosDaProposta, tomosDoVolume } from "../modules/nexo/lib/tomos-do-volume.ts";

let passed = 0;
function test(nome: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${nome}`);
  } catch (err) {
    console.error(`FALHOU  ${nome}`);
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r = (kind: string, payload: unknown): any => ({ artifactId: kind, kind, summary: "", payload, files: [] });

test("um tomo só: sufixo vazio, atual 0, número = tomo inicial", () => {
  assert.deepEqual(tomosDaProposta(1, 1), [{ atual: 0, numero: 1, sufixo: "" }]);
});

test("vários tomos: sufixo :tNN pelo número real", () => {
  assert.deepEqual(tomosDaProposta(2, 5), [
    { atual: 1, numero: 5, sufixo: ":t05" },
    { atual: 2, numero: 6, sufixo: ":t06" },
  ]);
});

test("tomosDoVolume lê numTomos/tomoInicial da LD ou da capa", () => {
  assert.equal(tomosDoVolume([r("ld", { numTomos: 3, tomoInicial: 2 })]).length, 3);
  assert.deepEqual(tomosDoVolume([r("capa", { numTomos: 1 })]), [{ atual: 0, numero: 1, sufixo: "" }]);
  assert.deepEqual(tomosDoVolume([]), [{ atual: 0, numero: 1, sufixo: "" }]);
});

test("idDoVolume é o mesmo id do cartão de volume", () => {
  assert.equal(idDoVolume("084-25", ":t02"), "volume:084-25:t02");
  assert.equal(idDoVolume(null, ""), "volume:x");
});

test("no canvas, a fileira 0 é o volume sem divisão", () => {
  assert.equal(sufixoDoTomoNoCanvas(0), "");
  assert.equal(sufixoDoTomoNoCanvas(3), ":t03");
});

console.log(`\n${passed} teste(s) dos tomos do volume OK`);
```

`scripts/test-nexo-trilho-do-tomo.ts`:

```ts
/**
 * O que cada tomo mostra no canvas. Núcleo PURO → node cru:
 *
 *   node scripts/test-nexo-trilho-do-tomo.ts   (== npm run test:nexo:trilho-do-tomo)
 */
import assert from "node:assert/strict";

import { trilhoDoTomo } from "../modules/nexo/lib/trilho-do-tomo.ts";

let passed = 0;
function test(nome: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${nome}`);
  } catch (err) {
    console.error(`FALHOU  ${nome}`);
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

const MB = 1024 * 1024;
const base = { folhas: 12, temMontador: true, bloqueio: null, erro: null, trava: null, liberacao: { liberado: true, motivo: null } };
const montado = (bytes: number | null, url: string | null = "blob:1") => ({
  id: "volume:x:t02", tomo: 2, nome: "v.pdf", url, bytes, acimaDoTeto: bytes !== null && bytes > 20 * MB, veredito: "ok" as const, pontos: 0,
});

test("sem montador (sem capa/LD): incompleto e o porquê", () => {
  const t = trilhoDoTomo({ ...base, temMontador: false });
  assert.equal(t.estado, "incompleto");
  assert.equal(t.acao.habilitada, false);
  assert.equal(t.acao.motivo, "Gere a capa e a LD primeiro.");
});

test("bloqueio do cartão vira o motivo do botão", () => {
  const t = trilhoDoTomo({ ...base, bloqueio: "faltam as pranchas deste tomo" });
  assert.equal(t.estado, "incompleto");
  assert.equal(t.acao.motivo, "Faltam as pranchas deste tomo.");
});

test("pronto para montar: botão Montar ligado", () => {
  const t = trilhoDoTomo(base);
  assert.equal(t.estado, "pronto-para-montar");
  assert.equal(t.frase, "12 folhas · pronto para montar");
  assert.deepEqual(t.acao, { tipo: "montar", habilitada: true, motivo: null });
  assert.equal(t.baixar, null);
});

test("aba travada desliga o botão com o motivo", () => {
  const t = trilhoDoTomo({ ...base, trava: "Esta conversa mudou em outra aba." });
  assert.equal(t.acao.habilitada, false);
  assert.equal(t.acao.motivo, "Esta conversa mudou em outra aba.");
});

test("montando: frase da fase real e preenchimento parcial", () => {
  const t = trilhoDoTomo({ ...base, fase: "juntando" });
  assert.equal(t.estado, "montando");
  assert.equal(t.frase, "juntando 12 pranchas…");
  assert.ok(t.preenchimento > 0 && t.preenchimento < 1);
  assert.equal(t.acao.habilitada, false);
});

test("montado: peso, baixar ligado, remontar disponível", () => {
  const t = trilhoDoTomo({ ...base, montado: montado(4.1 * MB) });
  assert.equal(t.estado, "montado");
  assert.equal(t.frase, "4,1 MB · conferido");
  assert.equal(t.preenchimento, 1);
  assert.equal(t.acao.tipo, "remontar");
  assert.deepEqual(t.baixar, { habilitado: true, motivo: null, url: "blob:1", nome: "v.pdf" });
});

test("montado sem os editáveis: baixar travado com o motivo", () => {
  const t = trilhoDoTomo({ ...base, montado: montado(MB), liberacao: { liberado: false, motivo: "Baixe os editáveis primeiro." } });
  assert.equal(t.baixar?.habilitado, false);
  assert.equal(t.baixar?.motivo, "Baixe os editáveis primeiro.");
});

test("acima do teto: âmbar e baixar travado", () => {
  const t = trilhoDoTomo({ ...base, montado: montado(27.6 * MB) });
  assert.equal(t.estado, "acima-do-teto");
  assert.equal(t.frase, "27,6 MB · passa do teto de 20 MB");
  assert.equal(t.baixar?.habilitado, false);
});

test("PDF fora deste navegador: remontar", () => {
  const t = trilhoDoTomo({ ...base, montado: montado(MB, null) });
  assert.equal(t.estado, "fora-da-maquina");
  assert.equal(t.frase, "montado em outra máquina");
  assert.equal(t.acao.tipo, "remontar");
  assert.equal(t.baixar?.habilitado, false);
});

test("falhou: motivo e tentar de novo", () => {
  const t = trilhoDoTomo({ ...base, fase: "falhou", erro: "Erro ao montar o volume." });
  assert.equal(t.estado, "falhou");
  assert.equal(t.frase, "Erro ao montar o volume.");
  assert.deepEqual(t.acao, { tipo: "tentar-de-novo", habilitada: true, motivo: null });
});

test("remontando um tomo já montado mostra a fase, não o peso velho", () => {
  const t = trilhoDoTomo({ ...base, fase: "preparando", montado: montado(MB) });
  assert.equal(t.estado, "montando");
});

console.log(`\n${passed} teste(s) do trilho do tomo OK`);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node scripts/test-nexo-tomos-do-volume.ts; node scripts/test-nexo-trilho-do-tomo.ts`
Expected: `Cannot find module` nos dois.

- [ ] **Step 3: `tomos-do-volume.ts`**

```ts
/**
 * OS TOMOS DE UM VOLUME e o id do volume de cada um. Saíram de
 * `ConfirmationCard.tsx` (06/10/2026) porque o canvas passou a montar e baixar
 * por tomo: duas contas de "qual é o id do volume do Tomo 02" divergem no
 * primeiro volume que começa no Tomo 05.
 *
 * PURO: só `import type`. `node scripts/test-nexo-tomos-do-volume.ts`.
 */
import type { SavedResult } from "../state/conversation-store";

export interface TomoDaProposta {
  /** 0 = documento único; 1..N = posição na divisão. */
  atual: number;
  /** O número que sai impresso ("TOMO 05"). */
  numero: number;
  /** `""` no volume único; `:tNN` (número real) com vários. */
  sufixo: string;
}

/**
 * Cada tomo é um volume físico: com 2 tomos saem 2 capas, 2 LDs, 2 volumes.
 * Um tomo só devolve `atual: 0` — as chaves ficam as de sempre e nada migra.
 */
export function tomosDaProposta(numTomos: number, tomoInicial: number): TomoDaProposta[] {
  if (numTomos <= 1) return [{ atual: 0, numero: tomoInicial, sufixo: "" }];
  return Array.from({ length: numTomos }, (_, i) => {
    const numero = tomoInicial + i;
    return { atual: i + 1, numero, sufixo: `:t${String(numero).padStart(2, "0")}` };
  });
}

/** A divisão vem da primeira LD/capa gerada que a declara; sem nada, um tomo. */
export function tomosDoVolume(results: readonly SavedResult[]): TomoDaProposta[] {
  const comTomos = results.find(
    (r) => (r.kind === "ld" || r.kind === "capa") && typeof (r.payload as { numTomos?: unknown } | undefined)?.numTomos === "number",
  );
  const p = comTomos?.payload as { numTomos?: number; tomoInicial?: number } | undefined;
  return tomosDaProposta(p?.numTomos ?? 1, p?.tomoInicial ?? 1);
}

export function idDoVolume(codigo: string | null | undefined, sufixo: string): string {
  return `volume:${codigo ?? "x"}${sufixo}`;
}

/** A fileira do canvas é o tomo do artefato (`tomoDoArtefato`): 0 = sem divisão. */
export function sufixoDoTomoNoCanvas(tomoDaFileira: number): string {
  return tomoDaFileira > 0 ? `:t${String(tomoDaFileira).padStart(2, "0")}` : "";
}
```

- [ ] **Step 4: `ConfirmationCard.tsx` passa a usar a lib**

1. Apagar as funções locais `tomosDaProposta` e `tomosDoVolume` (≈ linhas 240-288; manter `tomosDoVolumeTotal`, reescrita abaixo) e importar:

```ts
import { idDoVolume, tomosDaProposta, tomosDoVolume as tomosDoVolumeDaConversa } from "../lib/tomos-do-volume";
```

2. Manter a assinatura antiga para os chamadores existentes (são vários, todos com `(selos, results)`):

```ts
/** As chamadas antigas passam os selos; a conta só precisa dos resultados. */
function tomosDoVolume(_selos: SeloForLd[], results: SavedResult[]) {
  return tomosDoVolumeDaConversa(results);
}
function tomosDoVolumeTotal(selos: SeloForLd[], results: SavedResult[]): number {
  return tomosDoVolume(selos, results).length;
}
```

3. `volumeId` passa a usar a lib (uma fonte para o id):

```ts
function volumeId(selos: SeloForLd[]): string {
  return idDoVolume(summarizeSelos(selos).codigo, "");
}
```

- [ ] **Step 5: `TomoMontado.id`**

Em `modules/nexo/lib/entrega-do-volume.ts`, na interface `TomoMontado` acrescentar `/** O artifactId do volume. */ id: string;` e, em `tomosMontados`, `id: r.artifactId,` no objeto empurrado.

- [ ] **Step 6: `trilho-do-tomo.ts`**

```ts
/**
 * O TRILHO DO TOMO (06/10/2026): tudo o que o canvas sabe de um tomo, num
 * estado só para desenhar — o cabeçalho, o nó do volume, as arestas e as folhas
 * leem daqui. Spec: docs/superpowers/specs/2026-10-06-canvas-da-montagem-design.md.
 *
 * PURO: só `import type`. `node scripts/test-nexo-trilho-do-tomo.ts`.
 */
import type { TomoMontado } from "./entrega-do-volume";
import type { FaseDaMontagem } from "./progresso-da-montagem";

export type EstadoDoTomo =
  | "incompleto"
  | "pronto-para-montar"
  | "montando"
  | "montado"
  | "acima-do-teto"
  | "falhou"
  | "fora-da-maquina";

export interface EntradaDoTrilho {
  folhas: number;
  fase?: FaseDaMontagem;
  montado?: TomoMontado;
  /** O cartão (sem tela) deste tomo está registrado — só existe com capa ou LD. */
  temMontador: boolean;
  /** `motivoParaNaoMontar` do cartão. */
  bloqueio: string | null;
  /** O erro da última tentativa. */
  erro: string | null;
  /** `motivoParaNaoGastar` quando a aba está travada. */
  trava: string | null;
  /** A trava dos editáveis (`useLiberacaoDoVolume`). */
  liberacao: { liberado: boolean; motivo: string | null };
}

export interface Trilho {
  estado: EstadoDoTomo;
  frase: string;
  /** 0..1 — quanto o nó do volume está "cheio". */
  preenchimento: number;
  acao: { tipo: "montar" | "remontar" | "tentar-de-novo"; habilitada: boolean; motivo: string | null };
  /** `null` enquanto não há volume montado. */
  baixar: { habilitado: boolean; motivo: string | null; url: string | null; nome: string } | null;
}

const PESO: Record<FaseDaMontagem, number> = {
  aguardando: 0,
  "conferindo-versao": 0.05,
  preparando: 0.15,
  juntando: 0.35,
  conferindo: 0.8,
  pronto: 1,
  falhou: 1,
};

function emCurso(f: FaseDaMontagem | undefined): boolean {
  return f === "conferindo-versao" || f === "preparando" || f === "juntando" || f === "conferindo";
}

function fraseDaFase(f: FaseDaMontagem, folhas: number): string {
  switch (f) {
    case "conferindo-versao":
      return "conferindo se a conversa está atual…";
    case "preparando":
      return "preparando capa, LD e separatriz…";
    case "juntando":
      return `juntando ${folhas} ${folhas === 1 ? "prancha" : "pranchas"}…`;
    case "conferindo":
      return "montado — conferindo os carimbos…";
    default:
      return "na fila…";
  }
}

function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function frasePronta(s: string): string {
  const t = s.trim().replace(/\.$/, "");
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}.`;
}

export function trilhoDoTomo(e: EntradaDoTrilho): Trilho {
  const travado = (motivo: string | null) => (e.trava ? { habilitada: false, motivo: e.trava } : { habilitada: motivo === null, motivo });

  if (emCurso(e.fase) || e.fase === "aguardando") {
    const fase = e.fase as FaseDaMontagem;
    return {
      estado: "montando",
      frase: fraseDaFase(fase, e.folhas),
      preenchimento: PESO[fase],
      acao: { tipo: "montar", habilitada: false, motivo: null },
      baixar: null,
    };
  }

  if (e.fase === "falhou" || (e.erro && !e.montado)) {
    return {
      estado: "falhou",
      frase: e.erro ?? "não montou",
      preenchimento: 0,
      acao: { tipo: "tentar-de-novo", ...travado(null) },
      baixar: null,
    };
  }

  if (e.montado) {
    const m = e.montado;
    const remontar = { tipo: "remontar" as const, ...travado(e.temMontador ? null : "Gere a capa e a LD primeiro.") };
    if (m.url === null) {
      return {
        estado: "fora-da-maquina",
        frase: "montado em outra máquina",
        preenchimento: 1,
        acao: remontar,
        baixar: { habilitado: false, motivo: "O PDF não está neste navegador. Monte de novo.", url: null, nome: m.nome },
      };
    }
    if (m.acimaDoTeto) {
      return {
        estado: "acima-do-teto",
        frase: `${mb(m.bytes ?? 0)} · passa do teto de 20 MB`,
        preenchimento: 1,
        acao: remontar,
        baixar: { habilitado: false, motivo: "Passa do teto de 20 MB.", url: m.url, nome: m.nome },
      };
    }
    const conferencia = m.veredito === "ok" ? "conferido" : m.veredito === "sem-conferencia" ? "sem conferência" : `${m.pontos} ${m.pontos === 1 ? "ponto" : "pontos"} para olhar`;
    return {
      estado: "montado",
      frase: m.bytes !== null ? `${mb(m.bytes)} · ${conferencia}` : conferencia,
      preenchimento: 1,
      acao: remontar,
      baixar: { habilitado: e.liberacao.liberado, motivo: e.liberacao.liberado ? null : e.liberacao.motivo, url: m.url, nome: m.nome },
    };
  }

  if (!e.temMontador) {
    return {
      estado: "incompleto",
      frase: `${e.folhas} folhas · falta a capa e a LD`,
      preenchimento: 0,
      acao: { tipo: "montar", habilitada: false, motivo: "Gere a capa e a LD primeiro." },
      baixar: null,
    };
  }
  if (e.bloqueio) {
    return {
      estado: "incompleto",
      frase: `${e.folhas} folhas · ${e.bloqueio}`,
      preenchimento: 0,
      acao: { tipo: "montar", habilitada: false, motivo: frasePronta(e.bloqueio) },
      baixar: null,
    };
  }
  return {
    estado: "pronto-para-montar",
    frase: `${e.folhas} folhas · pronto para montar`,
    preenchimento: 0,
    acao: { tipo: "montar", ...travado(null) },
    baixar: null,
  };
}
```

- [ ] **Step 7: Rodar e ver passar; registrar os scripts**

Run: `node scripts/test-nexo-tomos-do-volume.ts && node scripts/test-nexo-trilho-do-tomo.ts && node scripts/test-nexo-entrega-painel.ts`
Expected: `5 … OK`, `11 … OK`, `17 … OK`.

Em `package.json`, junto aos `test:nexo:*`:

```json
"test:nexo:tomos-do-volume": "node scripts/test-nexo-tomos-do-volume.ts",
"test:nexo:trilho-do-tomo": "node scripts/test-nexo-trilho-do-tomo.ts",
```

Run: `npx tsc --noEmit -p . && npx eslint modules/nexo/components/ConfirmationCard.tsx modules/nexo/lib/trilho-do-tomo.ts modules/nexo/lib/tomos-do-volume.ts`
Expected: sem saída.

- [ ] **Step 8: Commit**

```bash
git add modules/nexo/lib/tomos-do-volume.ts modules/nexo/lib/trilho-do-tomo.ts modules/nexo/lib/entrega-do-volume.ts modules/nexo/components/ConfirmationCard.tsx scripts/test-nexo-tomos-do-volume.ts scripts/test-nexo-trilho-do-tomo.ts package.json
git commit -m "Trilho do tomo: estado puro de cada tomo e a conta dos tomos fora do cartão

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Montadores sem tela + cartão curto no chat

**Files:**
- Modify: `modules/nexo/state/montadores-de-volume.tsx`
- Create: `modules/nexo/state/use-montar-todos.ts`
- Modify: `modules/nexo/components/ConfirmationCard.tsx` (`VolumeConfirmation`, `MontadoresDoVolume`, `case "volume"`, apagar `VolumesDoConjunto`)
- Create: `modules/nexo/components/CartaoDaMontagem.tsx`
- Modify: `modules/nexo/components/NexoChat.tsx`

**Interfaces:**
- Consumes (Task 1): `tomosDoVolume`, `idDoVolume`, `TomoDaProposta`.
- Consumes (existentes): `montarEmLote` (`../lib/lote-de-volumes`), `useMontadoresDeVolume`, `useFasesDaMontagem`, `BarraDaMontagem` (`./ProgressoDaMontagem`), `progressoDoLote`, `tomosMontados`, `formatarMb`, `useAuditoria().escolherVista`.
- Produces:
  - `useFasesDaMontagem(): { fases; marcarFase; situacoes: Readonly<Record<string, SituacaoDoMontador>>; publicarSituacao(id: string, s: SituacaoDoMontador | null): void }` com `SituacaoDoMontador = { bloqueio: string | null; erro: string | null }`
  - `useMontarTodos(selos: SeloForLd[]): { tomos: { id: string; rotulo: string; numero: number }[]; montando: boolean; falhas: { rotulo: string; motivo: string }[]; montarTodos(): Promise<void>; montarUm(id: string): Promise<string | null> }`
  - `export function MontadoresDoVolume(props: { selos: SeloForLd[]; pranchaFiles: File[]; templates: NexoTemplateOption[] })` (em `ConfirmationCard.tsx`)
  - `<CartaoDaMontagem selos />`

- [ ] **Step 1: Situação no contexto**

Em `montadores-de-volume.tsx`, dentro de `MontadoresDeVolumeProvider`, ao lado de `fases`:

```ts
  /*
   * A SITUAÇÃO de cada montador (bloqueio e erro), publicada pelo cartão sem
   * tela. O canvas não tem como perguntar a um componente invisível "por que
   * você não monta?" — ele lê daqui.
   */
  const [situacoes, setSituacoes] = useState<Readonly<Record<string, SituacaoDoMontador>>>({});
  const publicarSituacao = useCallback((artifactId: string, s: SituacaoDoMontador | null) => {
    setSituacoes((atual) => {
      const antes = atual[artifactId];
      if (s && antes && antes.bloqueio === s.bloqueio && antes.erro === s.erro) return atual;
      if (!s && !antes) return atual;
      const proximo = { ...atual };
      if (s) proximo[artifactId] = s;
      else delete proximo[artifactId];
      return proximo;
    });
  }, []);
  const valorDasFases = useMemo(
    () => ({ fases, marcarFase, situacoes, publicarSituacao }),
    [fases, marcarFase, situacoes, publicarSituacao],
  );
```

(substitui o `valorDasFases` atual). E acima de `interface FasesDaMontagem`:

```ts
export interface SituacaoDoMontador {
  bloqueio: string | null;
  erro: string | null;
}
```

Na interface `FasesDaMontagem` acrescentar `situacoes: Readonly<Record<string, SituacaoDoMontador>>;` e `publicarSituacao: (artifactId: string, s: SituacaoDoMontador | null) => void;`; em `SEM_FASES`, `situacoes: {}, publicarSituacao: () => {}`.

- [ ] **Step 2: `VolumeConfirmation` sem tela e publicando a situação**

Em `ConfirmationCard.tsx`, `VolumeConfirmation`:

1. Props: acrescentar `semTela?: boolean` (tipo e desestruturação).
2. `const { fases, marcarFase } = useFasesDaMontagem();` vira `const { fases, marcarFase, publicarSituacao } = useFasesDaMontagem();`.
3. Logo antes do `return (` com `<CardShell kind="volume"`:

```ts
  /*
   * A SITUAÇÃO SAI DAQUI (06/10/2026): o canvas e o cartão curto mostram o
   * bloqueio e o erro deste tomo sem renderizar este cartão.
   */
  useEffect(() => {
    publicarSituacao(id, { bloqueio: motivoDeBloqueio ?? null, erro: error });
  }, [publicarSituacao, id, motivoDeBloqueio, error]);
  useEffect(() => () => publicarSituacao(id, null), [publicarSituacao, id]);

  // Sem tela: a lógica (registro, montagem, situação) roda; a interface mora no canvas.
  if (semTela) return null;
```

4. Exportar `VolumeConfirmation` não é preciso; acrescentar no fim do arquivo:

```tsx
/**
 * OS MONTADORES DO VOLUME, sem tela (06/10/2026). Um `VolumeConfirmation` por
 * tomo, montado SEMPRE que há capa ou LD — e não só quando o agente propõe um
 * volume —, para o canvas poder montar e baixar por tomo. É a mesma via de
 * montagem de sempre; só deixou de ter cartão.
 */
export function MontadoresDoVolume({
  selos,
  pranchaFiles,
  templates,
}: {
  selos: SeloForLd[];
  pranchaFiles: File[];
  templates: NexoTemplateOption[];
}) {
  const { results } = useConversation();
  if (selos.length === 0 || !results.some((r) => r.kind === "capa" || r.kind === "ld")) return null;
  return (
    <>
      {tomosDoVolume(selos, results).map((t) => (
        <VolumeConfirmation key={t.sufixo || "unico"} semTela resumo="" selos={selos} pranchaFiles={pranchaFiles} templates={templates} tomo={t} />
      ))}
    </>
  );
}
```

- [ ] **Step 3: `useMontarTodos`**

`modules/nexo/state/use-montar-todos.ts`:

```ts
"use client";

/**
 * MONTAR UM / MONTAR TODOS — o laço que morava em `VolumesDoConjunto`, agora
 * para quem não é cartão: o cartão curto do chat e o canvas. A montagem de
 * cada tomo é o montador registrado pelo cartão sem tela.
 */
import { useMemo, useState } from "react";

import type { SeloForLd } from "@/server/nexo/build-ld-proposal";
import { summarizeSelos } from "../lib/agent-context";
import { montarEmLote } from "../lib/lote-de-volumes";
import { idDoVolume, tomosDoVolume } from "../lib/tomos-do-volume";
import { useConversation } from "./conversation-store";
import { useFasesDaMontagem, useMontadoresDeVolume } from "./montadores-de-volume";

export function useMontarTodos(selos: SeloForLd[]) {
  const { montador } = useMontadoresDeVolume();
  const { marcarFase } = useFasesDaMontagem();
  const { results, conferirAntesDeGastar } = useConversation();
  const [montando, setMontando] = useState(false);
  const [falhas, setFalhas] = useState<{ rotulo: string; motivo: string }[]>([]);

  const tomos = useMemo(() => {
    const codigo = summarizeSelos(selos).codigo;
    const lista = tomosDoVolume(results);
    return lista.map((t) => ({
      id: idDoVolume(codigo, t.sufixo),
      numero: t.numero,
      rotulo: lista.length > 1 ? `TOMO ${String(t.numero).padStart(2, "0")}` : "VOLUME",
    }));
  }, [selos, results]);

  async function montarUm(id: string): Promise<string | null> {
    const m = montador(id);
    if (!m) return "Gere a capa e a LD primeiro.";
    return m();
  }

  async function montarTodos() {
    setFalhas([]);
    setMontando(true);
    for (const t of tomos) if (montador(t.id)) marcarFase(t.id, "aguardando");
    const comecados = new Set<number>();
    let coletadas: { rotulo: string; motivo: string }[] = [];
    try {
      const lote = await montarEmLote({
        itens: tomos.map((t) => ({ id: t.id, rotulo: t.rotulo, montar: montador(t.id) })),
        conferir: conferirAntesDeGastar,
        aoComecar: (i) => comecados.add(i),
      });
      coletadas = lote.recusado ? [{ rotulo: "Volumes", motivo: lote.recusado }] : lote.falhas;
    } finally {
      // Quem não chegou a começar sai da fila — senão "montando" para sempre.
      tomos.forEach((t, i) => {
        if (!comecados.has(i)) marcarFase(t.id, null);
      });
      setFalhas(coletadas);
      setMontando(false);
    }
  }

  return { tomos, montando, falhas, montarTodos, montarUm };
}
```

(Se `summarizeSelos` não estiver em `../lib/agent-context`, usar o mesmo import que `NexoCanvas.tsx` usa: `import { summarizeSelos } from "../lib/agent-context";` — é esse.)

- [ ] **Step 4: O cartão curto**

`modules/nexo/components/CartaoDaMontagem.tsx`:

```tsx
"use client";

/**
 * O CARTÃO CURTO DA MONTAGEM (06/10/2026). No lugar da pilha de cartões por
 * tomo ("Montar volume" × 6, cada um com Folhas/Título/Partes): antes, um botão
 * para o conjunto; durante, a barra; depois, "pronto — veja no canvas". O
 * detalhe de cada tomo mora no canvas.
 */
import { CircleCheck, LayoutGrid } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import type { SeloForLd } from "@/server/nexo/build-ld-proposal";

import { formatarMb, tomosMontados } from "../lib/entrega-do-volume";
import { progressoDoLote, rotuloDaFase } from "../lib/progresso-da-montagem";
import { useAuditoria } from "../state/auditoria-store";
import { useConversation } from "../state/conversation-store";
import { useFasesDaMontagem } from "../state/montadores-de-volume";
import { useMontarTodos } from "../state/use-montar-todos";
import { BarraDaMontagem } from "./ProgressoDaMontagem";

export function CartaoDaMontagem({ selos }: { selos: SeloForLd[] }) {
  const { results, podeGastar, motivoParaNaoGastar } = useConversation();
  const { fases, situacoes } = useFasesDaMontagem();
  const { escolherVista } = useAuditoria();
  const m = useMontarTodos(selos);

  const lista = m.tomos.map((t) => fases[t.id]);
  const p = progressoDoLote(lista);
  const montados = useMemo(() => tomosMontados(results), [results]);
  const doConjunto = montados.filter((t) => m.tomos.some((x) => x.id === t.id));
  const peso = doConjunto.reduce((s, t) => s + (t.bytes ?? 0), 0);
  const bloqueio = m.tomos.map((t) => situacoes[t.id]?.bloqueio).find(Boolean) ?? null;
  const semMontador = m.tomos.every((t) => !situacoes[t.id]);
  const n = m.tomos.length;
  const atual = p.atual >= 0 ? m.tomos[p.atual] : undefined;
  const pronto = !p.emCurso && doConjunto.length === n && n > 0;

  return (
    <section className="flex flex-col gap-2.5 rounded-md border border-border bg-card p-3" data-prova="cartao-da-montagem" aria-label="Montagem do volume">
      {p.emCurso ? (
        <>
          <span className="text-xs font-medium" aria-live="polite">
            Montando {n > 1 ? `os volumes · ${p.prontos} de ${n} prontos` : "o volume"}
          </span>
          <BarraDaMontagem fases={lista} rotulo="Progresso da montagem" />
          {atual && (
            <span className="text-xs text-muted-foreground">
              {atual.rotulo} · {rotuloDaFase(fases[atual.id], undefined)}
            </span>
          )}
        </>
      ) : pronto ? (
        <span className="flex items-center gap-2 text-xs" data-prova="montagem-pronta">
          <CircleCheck className="h-4 w-4 text-[var(--status-ok)]" aria-hidden />
          {n > 1 ? `${n} tomos montados` : "Volume montado"} · {formatarMb(peso)}
        </span>
      ) : (
        <span className="text-xs">
          {n > 1 ? `${n} tomos prontos para montar.` : "O volume está pronto para montar."}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!p.emCurso && (
          <Button
            size="sm"
            variant={pronto ? "secondary" : "default"}
            disabled={!podeGastar || semMontador || Boolean(bloqueio)}
            title={!podeGastar ? (motivoParaNaoGastar ?? undefined) : undefined}
            onClick={() => void m.montarTodos()}
          >
            {pronto ? "Montar de novo" : n > 1 ? `Montar os ${n} volumes` : "Montar o volume"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => escolherVista("*", "mapa")}>
          <LayoutGrid className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Ver no canvas
        </Button>
      </div>

      {!p.emCurso && bloqueio && <p className="text-xs text-muted-foreground">{bloqueio.charAt(0).toUpperCase() + bloqueio.slice(1)}.</p>}
      {m.falhas.length > 0 && (
        <p className="text-xs text-[var(--destructive)]">
          {m.falhas.map((f) => `${f.rotulo}: ${f.motivo}`).join("; ")}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Ligar e apagar a pilha**

Em `ConfirmationCard.tsx`:
1. `case "volume":` passa a `return <CartaoDaMontagem selos={selos} />;` e importar `import { CartaoDaMontagem } from "./CartaoDaMontagem";`.
2. Apagar a função `VolumesDoConjunto` inteira e os imports que ficarem sem uso (`EntregaDoVolume`, `PainelDaMontagem`, `montarEmLote`, `editaveisDosResultados` se só ele usava) — o `tsc`/`eslint` aponta.

Em `NexoChat.tsx`, importar `MontadoresDoVolume` do `./ConfirmationCard` (já importa `idsBaseDosArtefatos` de lá) e, logo depois de `<div className="cx nx-chat flex h-full min-h-0 flex-col">`:

```tsx
      {/* Quem sabe montar cada tomo — sem tela; o canvas e o cartão curto chamam. */}
      <MontadoresDoVolume selos={selos} pranchaFiles={pranchaFiles} templates={templates} />
```

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit -p . && npx eslint modules/nexo/components/ConfirmationCard.tsx modules/nexo/components/CartaoDaMontagem.tsx modules/nexo/components/NexoChat.tsx modules/nexo/state/use-montar-todos.ts modules/nexo/state/montadores-de-volume.tsx`
Expected: sem saída.

Run: `grep -n "VolumesDoConjunto" -r modules` → nenhuma linha.

Run: `node --import ./scripts/lib/resolver-de-imports.mjs scripts/test-entrega-do-volume.ts && node scripts/test-nexo-progresso-da-montagem.ts`
Expected: OK.

- [ ] **Step 7: Commit**

```bash
git add modules/nexo/state/montadores-de-volume.tsx modules/nexo/state/use-montar-todos.ts modules/nexo/components/ConfirmationCard.tsx modules/nexo/components/CartaoDaMontagem.tsx modules/nexo/components/NexoChat.tsx
git commit -m "Montagem: montadores sem tela e cartão curto no chat no lugar da pilha por tomo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: O cabeçalho do tomo e o nó do volume no canvas

**Files:**
- Modify: `modules/nexo/lib/layout-canvas.ts`
- Create: `modules/nexo/components/CabecaDoTomo.tsx`
- Modify: `modules/nexo/components/NexoCanvas.tsx`

**Interfaces:**
- Consumes: `trilhoDoTomo`, `idDoVolume`, `sufixoDoTomoNoCanvas`, `tomosMontados`, `useFasesDaMontagem`, `useMontadoresDeVolume`, `useLiberacaoDoVolume`, `useConversation`, `DURACAO`/`CURVA`/`MOLA` de `@/lib/ds/movimento`.
- Produces:
  - `ALTURA_DA_CABECA = 64`
  - `type CabecaDoTomoData = { tomo: number; unico: boolean; folhas: number; idDoVolume: string; pecas: { capa: boolean; separatriz: boolean; ld: boolean } }`
  - `CabecaDoTomo` (nodeType `cabeca`), `VolumeVazioNode` (nodeType `volumeVazio`, data `{ idDoVolume: string; folhas: number }`), `EnchimentoDoVolume({ fase })`

- [ ] **Step 1: A altura do cabeçalho**

Em `layout-canvas.ts`, depois de `ALTURA_MINIMA_FILEIRA`:

```ts
/** Faixa acima de cada fileira para o cabeçalho do tomo (estado + Montar/Baixar). */
export const ALTURA_DA_CABECA = 64;
```

- [ ] **Step 2: `CabecaDoTomo.tsx`**

```tsx
"use client";

/**
 * O CABEÇALHO DO TOMO no canvas (06/10/2026, "trilho vivo"): estado, peças,
 * peso e os botões Montar/Baixar em cima da fileira. Lê tudo do contexto dos
 * montadores e decide com `trilhoDoTomo`; monta pelo montador registrado — a
 * mesma via de sempre.
 */
import { CircleAlert, CircleCheck, Download, LoaderCircle, RotateCcw } from "lucide-react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useMemo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import { Button } from "@/components/ui/button";
import { CURVA, DURACAO, MOLA } from "@/lib/ds/movimento";

import { formatarMb, tomosMontados } from "../lib/entrega-do-volume";
import type { FaseDaMontagem } from "../lib/progresso-da-montagem";
import { trilhoDoTomo, type Trilho } from "../lib/trilho-do-tomo";
import { useConversation } from "../state/conversation-store";
import { useFasesDaMontagem, useMontadoresDeVolume } from "../state/montadores-de-volume";
import { useLiberacaoDoVolume } from "../state/use-liberacao-do-volume";

export type CabecaDoTomoData = {
  tomo: number;
  unico: boolean;
  folhas: number;
  idDoVolume: string;
  pecas: { capa: boolean; separatriz: boolean; ld: boolean };
};

/** O estado do tomo, montado das mesmas fontes em todo lugar do canvas. */
export function useTrilho(idDoVolume: string, folhas: number): Trilho {
  const { results, podeGastar, motivoParaNaoGastar } = useConversation();
  const { fases, situacoes } = useFasesDaMontagem();
  const liberacao = useLiberacaoDoVolume();
  const montado = useMemo(() => tomosMontados(results).find((t) => t.id === idDoVolume), [results, idDoVolume]);
  const s = situacoes[idDoVolume];
  return trilhoDoTomo({
    folhas,
    fase: fases[idDoVolume],
    montado,
    temMontador: s !== undefined,
    bloqueio: s?.bloqueio ?? null,
    erro: s?.erro ?? null,
    trava: podeGastar ? null : (motivoParaNaoGastar ?? "Esta conversa mudou em outra aba."),
    liberacao,
  });
}

/** O peso conta de 0 até o valor quando o volume fica pronto. */
function Peso({ bytes }: { bytes: number }) {
  const reduzido = useReducedMotion();
  const v = useMotionValue(reduzido ? bytes : 0);
  const texto = useTransform(v, (b) => formatarMb(b));
  useEffect(() => {
    if (reduzido) {
      v.set(bytes);
      return;
    }
    const c = animate(v, bytes, { duration: DURACAO.layout * 3, ease: CURVA.out });
    return () => c.stop();
  }, [bytes, reduzido, v]);
  return <motion.span className="tabular-nums">{texto}</motion.span>;
}

function Peca({ nome, pronta }: { nome: string; pronta: boolean }) {
  const reduzido = useReducedMotion();
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] ${pronta ? "border-[var(--status-ok)]/40 text-foreground" : "border-border text-muted-foreground"}`}>
      <AnimatePresence initial={false}>
        {pronta && (
          <motion.span
            key="ok"
            initial={reduzido ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={MOLA.snappy}
            className="inline-flex"
          >
            <CircleCheck className="h-3 w-3 text-[var(--status-ok)]" aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
      {nome}
    </span>
  );
}

export function CabecaDoTomo({ data }: NodeProps<Node<CabecaDoTomoData & Record<string, unknown>>>) {
  const t = useTrilho(data.idDoVolume, data.folhas);
  const { montador } = useMontadoresDeVolume();
  const { results } = useConversation();
  const reduzido = useReducedMotion();
  const bytes = useMemo(() => tomosMontados(results).find((x) => x.id === data.idDoVolume)?.bytes ?? null, [results, data.idDoVolume]);
  const rotulo = data.unico ? "Volume" : `Tomo ${String(data.tomo).padStart(2, "0")}`;
  const cor =
    t.estado === "falhou" ? "text-[var(--destructive)]" : t.estado === "acima-do-teto" || t.estado === "fora-da-maquina" ? "text-[var(--status-warning)]" : t.estado === "montado" ? "text-[var(--status-ok)]" : "text-muted-foreground";

  return (
    <div className="nodrag nopan flex w-[880px] items-center gap-3 rounded-md border border-border bg-card/80 px-3 py-2 backdrop-blur-sm" data-prova="cabeca-do-tomo" data-estado={t.estado}>
      <span className="font-mono text-[12px] font-medium uppercase tracking-[0.07em]">{rotulo}</span>
      <span className="flex items-center gap-1">
        <Peca nome="Capa" pronta={data.pecas.capa} />
        <Peca nome="Separatriz" pronta={data.pecas.separatriz} />
        <Peca nome="LD" pronta={data.pecas.ld} />
      </span>
      <span className={`flex min-w-0 items-center gap-1.5 text-xs ${cor}`} aria-live="polite">
        {t.estado === "montando" && <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />}
        {t.estado === "montado" && <CircleCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        {(t.estado === "falhou" || t.estado === "acima-do-teto") && <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        <span className="truncate">
          {t.estado === "montado" && bytes !== null ? (
            <>
              <Peso bytes={bytes} /> · {t.frase.split(" · ").slice(1).join(" · ")}
            </>
          ) : (
            t.frase
          )}
        </span>
      </span>
      <span className="ml-auto flex items-center gap-2">
        {t.baixar && (
          t.baixar.habilitado && t.baixar.url ? (
            <a href={t.baixar.url} download={t.baixar.nome} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-accent">
              <Download className="h-3.5 w-3.5" aria-hidden /> Baixar
            </a>
          ) : (
            <span className="text-[11px] text-muted-foreground" title={t.baixar.motivo ?? undefined}>
              {t.baixar.motivo}
            </span>
          )
        )}
        <motion.span layout={!reduzido} transition={{ duration: DURACAO.state, ease: CURVA.out }}>
          {t.estado === "montando" ? (
            <span className="inline-flex h-8 items-center px-2" aria-hidden>
              <LoaderCircle className="h-4 w-4 animate-spin text-[var(--ds-nexo)] motion-reduce:animate-none" />
            </span>
          ) : (
            <Button
              size="sm"
              variant={t.acao.tipo === "montar" ? "default" : "secondary"}
              disabled={!t.acao.habilitada}
              title={t.acao.motivo ?? undefined}
              onClick={() => void montador(data.idDoVolume)?.()}
            >
              {t.acao.tipo !== "montar" && <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />}
              {t.acao.tipo === "montar" ? "Montar" : t.acao.tipo === "remontar" ? "Remontar" : "Tentar de novo"}
            </Button>
          )}
        </motion.span>
      </span>
    </div>
  );
}

/** O volume ENCHE de baixo para cima conforme a fase; some quando não há fase. */
export function EnchimentoDoVolume({ fase, preenchimento }: { fase: FaseDaMontagem | undefined; preenchimento: number }) {
  const reduzido = useReducedMotion();
  // O pulso entra UMA vez quando a fase vira "pronto" (monta, anima até sumir e
  // fica parado). Sem estado nem efeito: o React Compiler barra setState em efeito.
  return (
    <>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgb(139_124_246/0.28),rgb(139_124_246/0.06))]"
        initial={false}
        animate={{ height: `${Math.round((fase && fase !== "pronto" && fase !== "falhou" ? preenchimento : 0) * 100)}%` }}
        transition={{ duration: reduzido ? 0 : DURACAO.layout * 2, ease: CURVA.out }}
      />
      {fase === "pronto" && !reduzido && (
        <motion.span
          key="pulso"
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-md"
          initial={{ boxShadow: "inset 0 0 0 2px var(--status-ok)", opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: DURACAO.layout * 3, ease: CURVA.out }}
        />
      )}
    </>
  );
}

/** O lugar do volume antes de ele existir: tracejado, enche durante a montagem. */
export function VolumeVazioNode({ data }: NodeProps<Node<{ idDoVolume: string; folhas: number } & Record<string, unknown>>>) {
  const t = useTrilho(data.idDoVolume, data.folhas);
  const { fases } = useFasesDaMontagem();
  return (
    <div className="relative flex aspect-[3/4] w-[200px] flex-col justify-end overflow-hidden rounded-md border border-dashed border-border bg-card/40 p-2" data-prova="volume-vazio">
      <EnchimentoDoVolume fase={fases[data.idDoVolume]} preenchimento={t.preenchimento} />
      <p className="relative font-mono text-[11px] font-medium uppercase tracking-[0.05em]">Volume</p>
      <p className="relative mt-0.5 text-[11px] text-muted-foreground">{t.estado === "montando" ? t.frase : "ainda não montado"}</p>
      <Handle type="target" position={Position.Left} className="!opacity-0" />
    </div>
  );
}
```

- [ ] **Step 3: Layout com cabeça e volume vazio**

Em `NexoCanvas.tsx`:

1. Imports:

```ts
import { ALTURA_DA_CABECA } from "../lib/layout-canvas"; // junto ao import de layout-canvas existente
import { idDoVolume as idDoVolumeDe, sufixoDoTomoNoCanvas } from "../lib/tomos-do-volume";
import { CabecaDoTomo, EnchimentoDoVolume, VolumeVazioNode, useTrilho } from "./CabecaDoTomo";
import { useFasesDaMontagem } from "../state/montadores-de-volume";
```

2. `const nodeTypes = { artifact: ArtifactNode, rotulo: RotuloNode, folha: FolhaNode, cabeca: CabecaDoTomo, volumeVazio: VolumeVazioNode };`

3. No `useMemo` do layout:
   - `const topos = topoDasFileiras(folhasPorFileira.map((fs) => alturaDaFileira(fs.length) + ALTURA_DA_CABECA));`
   - `const codigoDoVolume = summarizeSelos(folhas).codigo;` (antes do `grupos.forEach`)
   - Dentro do `forEach`, `const y = topos[linha] + ALTURA_DA_CABECA;` e, logo abaixo:

```ts
      const ehResto = grupo.tomo === 0 && grupos.length > 1;
      const idDoVolume = idDoVolumeDe(codigoDoVolume, sufixoDoTomoNoCanvas(grupo.tomo));
```

   - Em `empurrar`, nas arestas, acrescentar `data: { volume: idDoVolume },`; na aresta que entra na primeira folha, idem.
   - Depois de `depois.forEach(empurrar);`:

```ts
      // O LUGAR DO VOLUME antes dele existir: a fileira termina onde ele vai nascer.
      if (!ehResto && daFileira.length > 0 && !grupo.itens.some((a) => a.kind === "volume")) {
        const id = `volume-vazio:${grupo.tomo}`;
        nodes.push({ id, type: "volumeVazio", position: { x: cursorX, y }, data: { idDoVolume, folhas: daFileira.length }, draggable: false, selectable: false });
        if (anterior) {
          edges.push({
            id: `${anterior}->${id}`,
            source: anterior,
            target: id,
            data: { volume: idDoVolume },
            style: { stroke: "var(--ring)", strokeWidth: 1.5, opacity: 0.35, strokeDasharray: "4 4" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--ring)" },
          });
        }
        idsDaFileira.push(id);
        cursorX += 260;
      }
```

   - Trocar o bloco `if (grupos.length > 1) { nodes.push({ id: \`rotulo:...\` ... }) }` por:

```ts
      if (ehResto) {
        nodes.push({
          id: `rotulo:${grupo.tomo}`,
          type: "rotulo",
          position: { x: -150, y: y + 130 },
          data: { tomo: grupo.tomo, folhas: daFileira.length, documentos: grupo.itens.map((a) => a.id) },
          draggable: false,
          selectable: false,
        });
      } else {
        const kinds = new Set(grupo.itens.map((a) => a.kind));
        nodes.push({
          id: `cabeca:${grupo.tomo}`,
          type: "cabeca",
          position: { x: 0, y: topos[linha] },
          data: {
            tomo: grupo.tomo,
            unico: tomosReais <= 1,
            folhas: daFileira.length,
            idDoVolume,
            pecas: { capa: kinds.has("capa"), separatriz: kinds.has("separatriz"), ld: kinds.has("ld") },
          },
          draggable: false,
          selectable: false,
        });
      }
```

4. No `ArtifactNode`, para o volume encher também durante uma REmontagem: depois de `const [confirmando, setConfirmando] = useState(false);`:

```ts
  const { fases } = useFasesDaMontagem();
  const trilho = useTrilho(data.id, 0);
  const faseDoVolume = data.kind === "volume" ? fases[data.id] : undefined;
```

e dentro do `<div className="group relative block aspect-[3/4] ...">`, depois do `<ArtifactThumb … />`:

```tsx
        {data.kind === "volume" && <EnchimentoDoVolume fase={faseDoVolume} preenchimento={trilho.preenchimento} />}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit -p . && npx eslint modules/nexo/components/NexoCanvas.tsx modules/nexo/components/CabecaDoTomo.tsx modules/nexo/lib/layout-canvas.ts && node scripts/test-nexo-drop.ts && node scripts/test-nexo-canvas-teclado.ts`
Expected: sem erro de tipo/lint; testes do drop e do teclado OK.

- [ ] **Step 5: Commit**

```bash
git add modules/nexo/lib/layout-canvas.ts modules/nexo/components/CabecaDoTomo.tsx modules/nexo/components/NexoCanvas.tsx
git commit -m "Canvas: cabeçalho do tomo com Montar/Baixar e o lugar do volume que enche

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: A fileira viva (arestas, folhas, seguir o tomo)

**Files:**
- Modify: `modules/nexo/components/NexoCanvas.tsx`
- Modify: `components/telas/nexo/nexo.css`

**Interfaces:**
- Consumes: `useFasesDaMontagem().fases`, a `data.volume` das arestas (Task 3), os nós `cabeca:*` com `data.idDoVolume`.
- Produces: classes `nx-onda` / `nx-varredura` nos nós de folha; arestas `animated` durante "juntando"/"conferindo".

- [ ] **Step 1: Folhas sabem de que volume são**

No `useMemo` do layout, guardar a fileira de cada folha. Acima de `grupos.forEach`: `const volumeDaFolha = new Map<string, { volume: string; indice: number }>();` e, dentro do `daFileira.forEach((f, i) => { … })`, `volumeDaFolha.set(id, { volume: idDoVolume, indice: i });`. Devolver no objeto do memo: `return { nodes, edges, fileiras, fileirasDoDrop, folhasPorTomo, volumeDaFolha };` e desestruturar `volumeDaFolha` junto.

- [ ] **Step 2: Vivos a partir das fases**

Depois do memo do layout:

```ts
  /*
   * A FILEIRA VIVA (06/10/2026): durante "juntando" as setas correm e as folhas
   * acendem em onda; durante "conferindo" uma varredura passa folha a folha.
   * Fica FORA do memo do layout: mudar de fase não pode recalcular o mapa.
   */
  const { fases } = useFasesDaMontagem();
  const edgesVivas = useMemo(
    () =>
      edges.map((e) => {
        const f = fases[(e.data as { volume?: string } | undefined)?.volume ?? ""];
        return f === "juntando" || f === "conferindo"
          ? { ...e, animated: true, style: { ...e.style, stroke: "var(--ds-nexo)", opacity: 0.9 } }
          : e;
      }),
    [edges, fases],
  );
  const derivadosVivos = useMemo(
    () =>
      derivados.map((n) => {
        const v = volumeDaFolha.get(n.id);
        const f = v ? fases[v.volume] : undefined;
        if (!v || (f !== "juntando" && f !== "conferindo")) return n;
        return {
          ...n,
          className: f === "juntando" ? "nx-onda" : "nx-varredura",
          style: { ...n.style, ["--onda-i" as string]: v.indice },
        };
      }),
    [derivados, volumeDaFolha, fases],
  );
```

Trocar o `derivados` do efeito que chama `setNodes(… reconciliar(derivados, atuais))` por `derivadosVivos` (e nas dependências), e `edges={edges}` do `<ReactFlow>` por `edges={edgesVivas}`.

- [ ] **Step 3: Seguir o tomo em curso**

Dentro de `CanvasInterno` (já está sob o `ReactFlowProvider`):

```ts
  const { setCenter, getZoom } = useReactFlow();
  const reduzido = useReducedMotion();
  const volumeEmCurso = Object.entries(fases).find(([, f]) => f === "conferindo-versao" || f === "preparando" || f === "juntando" || f === "conferindo")?.[0];
  useEffect(() => {
    if (!volumeEmCurso) return;
    const cabeca = derivados.find((n) => n.type === "cabeca" && (n.data as { idDoVolume?: string }).idDoVolume === volumeEmCurso);
    if (!cabeca) return;
    // O canvas desliza até o tomo que está montando — no "montar todos", um após o outro.
    void setCenter(cabeca.position.x + 440, cabeca.position.y + 220, { zoom: getZoom(), duration: reduzido ? 0 : 600 });
  }, [volumeEmCurso, derivados, setCenter, getZoom, reduzido]);
```

Import: `import { useReducedMotion } from "motion/react";`.

- [ ] **Step 4: Keyframes**

No fim de `components/telas/nexo/nexo.css`:

```css
/* A FILEIRA VIVA (06/10/2026): onda ao juntar, varredura ao conferir. Decorativas:
   o texto do cabeçalho é que diz a fase real. */
.ds .react-flow__node.nx-onda > * { animation: nx-onda 1.8s var(--ease-entrance) infinite; animation-delay: calc(var(--onda-i, 0) * 70ms); }
.ds .react-flow__node.nx-varredura > * { animation: nx-varredura 2.4s var(--ease-entrance) infinite; animation-delay: calc(var(--onda-i, 0) * 110ms); }
@keyframes nx-onda {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  35% { box-shadow: 0 0 0 1px var(--ds-nexo), 0 0 16px rgb(139 124 246 / 0.22); }
}
@keyframes nx-varredura {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  20% { box-shadow: 0 0 0 1px var(--status-ok), 0 0 12px rgb(63 185 132 / 0.2); }
}
@media (prefers-reduced-motion: reduce) {
  .ds .react-flow__node.nx-onda > *, .ds .react-flow__node.nx-varredura > * { animation: none; }
}
```

- [ ] **Step 5: Verificar e commitar**

Run: `npx tsc --noEmit -p . && npx eslint modules/nexo/components/NexoCanvas.tsx`
Expected: sem saída.

```bash
git add modules/nexo/components/NexoCanvas.tsx components/telas/nexo/nexo.css
git commit -m "Canvas: a fileira viva — setas correm, folhas em onda, varredura na conferência e o canvas segue o tomo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: A doca de entrega e o palco Volume | Lista

**Files:**
- Create: `modules/nexo/components/DocaDaEntrega.tsx`
- Modify: `modules/nexo/components/VistaDoVolume.tsx`

**Interfaces:**
- Consumes: `useEntregaDoVolume(selos)` (`passos`, `tomos`, `ocupado`, `erro`, `baixarEditaveisZip`, `baixarVolumes`), `formatarMb`, `rotuloDoTomo`, `formatarDataHora`, `DURACAO`/`CURVA`.
- Produces: `<DocaDaEntrega selos />`, `VistaDoVolume` com Volume (padrão) | Lista.

- [ ] **Step 1: A doca**

`modules/nexo/components/DocaDaEntrega.tsx`:

```tsx
"use client";

/**
 * A DOCA DE ENTREGA (06/10/2026): a entrega flutua no rodapé do canvas, sempre
 * à vista — passo 1 (editáveis), passo 2 (volumes), o total, e os dois botões.
 * A regra é a de `entrega-do-volume.ts`; aqui é só a forma.
 */
import { CircleCheck, Circle, FileDown, FolderDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import { CURVA, DURACAO } from "@/lib/ds/movimento";
import { formatarDataHora } from "@/lib/fuso-de-brasilia";
import type { SeloForLd } from "@/server/nexo/build-ld-proposal";

import { formatarMb } from "../lib/entrega-do-volume";
import { useEntregaDoVolume } from "../state/use-entrega-do-volume";

export function DocaDaEntrega({ selos }: { selos: SeloForLd[] }) {
  const e = useEntregaDoVolume(selos);
  const reduzido = useReducedMotion();
  const { passos } = e;
  const visivel = e.temEditaveis || e.tomos.length > 0;
  const peso = e.tomos.reduce((s, t) => s + (t.bytes ?? 0), 0);
  const trava = passos.volumes.motivo;

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          key="doca"
          initial={reduzido ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduzido ? { opacity: 0 } : { y: 24, opacity: 0 }}
          transition={{ duration: DURACAO.layout, ease: CURVA.out }}
          className="absolute bottom-3 left-1/2 z-20 flex w-[min(760px,calc(100%-140px))] -translate-x-1/2 flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-[var(--shadow-panel)] backdrop-blur"
          data-prova="doca-da-entrega"
          role="region"
          aria-label="Entrega do volume"
        >
          <span className="flex items-center gap-1.5 text-xs">
            {passos.editaveis.feito ? <CircleCheck className="h-3.5 w-3.5 text-[var(--status-ok)]" aria-hidden /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
            {passos.editaveis.feito && passos.editaveis.quando ? `Editáveis baixados ${formatarDataHora(passos.editaveis.quando)}` : "1 · Editáveis na pasta do projeto"}
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <Circle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />2 · Volumes
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {passos.prontos} de {Math.max(passos.planejados, 1)} montados{peso > 0 ? ` · ${formatarMb(peso)}` : ""}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <Button size="sm" variant={passos.editaveis.feito ? "secondary" : "default"} loading={e.ocupado === "editaveis"} disabled={e.ocupado !== null} onClick={() => void e.baixarEditaveisZip()}>
              <FolderDown className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Editáveis (ODT)
            </Button>
            <Button size="sm" variant={passos.editaveis.feito ? "default" : "secondary"} loading={e.ocupado === "volumes"} disabled={e.ocupado !== null || !passos.volumes.liberado} title={trava ?? undefined} onClick={() => void e.baixarVolumes()}>
              <FileDown className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              {passos.planejados > 1 ? `Baixar os ${passos.planejados} volumes` : "Baixar o volume"}
            </Button>
          </span>
          {(trava || passos.editaveis.motivo || e.erro) && (
            <motion.p
              key={trava ?? e.erro ?? passos.editaveis.motivo ?? ""}
              initial={reduzido ? false : { x: -4 }}
              animate={{ x: [-4, 4, -2, 0] }}
              transition={{ duration: DURACAO.layout, ease: CURVA.feedback }}
              className={`basis-full text-xs ${e.erro ? "text-[var(--destructive)]" : "text-[var(--status-warning)]"}`}
            >
              {e.erro ?? passos.editaveis.motivo ?? trava}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Volume | Lista**

Reescrever `modules/nexo/components/VistaDoVolume.tsx`:

```tsx
"use client";

/**
 * VOLUME OU LISTA, no mapa do volume (06/10/2026). O CANVAS É O PADRÃO, sempre
 * — é onde se organiza e, agora, onde se monta e baixa (cabeçalho de cada
 * tomo + doca). A Lista (capas A4 + tomos) é a alternativa sem canvas. A vista
 * "Obra" entra na etapa 3 do desenho; até lá não aparece — um botão que não
 * leva a lugar nenhum se lê como defeito.
 */
import { useState, type ReactNode } from "react";

import type { SeloForLd } from "@/server/nexo/build-ld-proposal";

import { useConversation } from "../state/conversation-store";
import { DocaDaEntrega } from "./DocaDaEntrega";
import { PainelDoVolume } from "./PainelDoVolume";

export function VistaDoVolume({ selos, mapa }: { selos: SeloForLd[]; mapa: ReactNode }) {
  const { results } = useConversation();
  const temDocumentos = results.some((r) => r.kind === "capa" || r.kind === "ld" || r.kind === "volume");
  const [vista, setVista] = useState<"volume" | "lista">("volume");
  const lista = temDocumentos && vista === "lista";

  return (
    <div className="relative flex h-full min-h-0 flex-col" data-prova="vista-do-volume">
      {temDocumentos && (
        <div className="absolute right-3 top-3 z-20">
          <span className="nw-vistas" role="group" aria-label="Vista do volume">
            <button type="button" aria-pressed={!lista} onClick={() => setVista("volume")}>
              Volume
            </button>
            <button type="button" aria-pressed={lista} onClick={() => setVista("lista")}>
              Lista
            </button>
          </span>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {lista ? (
          <PainelDoVolume selos={selos} />
        ) : (
          <>
            {mapa}
            <DocaDaEntrega selos={selos} />
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar e commitar**

Run: `npx tsc --noEmit -p . && npx eslint modules/nexo/components/DocaDaEntrega.tsx modules/nexo/components/VistaDoVolume.tsx`
Expected: sem saída.

```bash
git add modules/nexo/components/DocaDaEntrega.tsx modules/nexo/components/VistaDoVolume.tsx
git commit -m "Palco: canvas como padrão (Volume | Lista) e a doca de entrega no rodapé

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Prova no navegador e push

- [ ] **Step 1:** `npm run dev` rodando; janela do Chrome **em primeiro plano** (aba oculta congela o pdf.js e o rAF — `nexodoc-aba-em-segundo-plano`).
- [ ] **Step 2:** Abrir a conversa do 084-25 EST (6 tomos). Conferir sem montar: palco abre no **Volume**; cada fileira tem cabeçalho "TOMO 0N" com as peças ✓, o peso e Baixar/Remontar; doca no rodapé com "6 de 6 montados · 18,6 MB"; "Lista" mostra o painel; chat sem a pilha por tomo, com o cartão curto.
- [ ] **Step 3:** No cabeçalho do TOMO 02, **Remontar**: anel girando, frase da fase mudando, setas do tomo correndo, folhas em onda, volume enchendo; no fim, pulso verde e o peso contando. Gravar GIF (`mcp__claude-in-chrome__gif_creator`, nome `trilho-vivo-remontar.gif`).
- [ ] **Step 4:** No cartão curto, **Montar de novo**: o canvas desliza tomo a tomo; a barra do cartão anda; falha num tomo não para os outros.
- [ ] **Step 5:** Conversa nova com o vol. 10 inc_spd (27,6 MB): o cabeçalho fica âmbar "passa do teto de 20 MB", o Baixar do tomo e o da doca ficam travados com o motivo.
- [ ] **Step 6:** Rodar todos os testes tocados:

```bash
node scripts/test-nexo-tomos-do-volume.ts && node scripts/test-nexo-trilho-do-tomo.ts && node scripts/test-nexo-entrega-painel.ts && node scripts/test-nexo-progresso-da-montagem.ts && node scripts/test-nexo-next-steps.ts && node scripts/test-nexo-drop.ts && node --import ./scripts/lib/resolver-de-imports.mjs scripts/test-entrega-do-volume.ts
```

- [ ] **Step 7:** Com o ok do Matheus: `git push origin main`.

---

## Self-review (feito)

- **Cobertura do desenho (etapas 1 e 2):** trilho vivo — cabeçalho com estado/peças/peso/Montar/Baixar (T3), fileira anima: peças ✓ com mola (T3), setas correm + onda + varredura (T4), volume enche + pulso de pronto + contador de peso (T3), canvas segue o tomo em curso (T4); doca no rodapé com a mesma regra (T5); Volume padrão + Lista (T5); cartão curto (T2); montadores sem tela = uma via de montagem (T2); falhas — tomo falhou com "Tentar de novo", aba travada, fora da máquina com "Remontar", teto travando o Baixar (T1/T3/T5). **Fora deste plano:** vista Obra + rota (etapa 3), transição Obra ↔ Volume (etapa 4), botão de clique→anel com `layoutId` (simplificado para `layout` no mesmo slot; o efeito visual é o mesmo dentro de um nó).
- **Placeholders:** nenhum.
- **Tipos:** `Trilho`, `EntradaDoTrilho`, `SituacaoDoMontador`, `CabecaDoTomoData`, `useMontarTodos`, `idDoVolume`/`sufixoDoTomoNoCanvas` com os mesmos nomes em todas as tasks; `TomoMontado.id` criado na T1 e usado na T3.
