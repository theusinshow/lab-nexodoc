# Painel do volume + entrega + teto de 20 MB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a Parte 3 do desenho `docs/superpowers/specs/2026-10-06-montagem-de-volume-design.md`: a entrega com dois botões lado a lado e o passo a passo dos editáveis, o peso de cada tomo com o teto de 20 MB, e o painel do volume no palco (capa A4 fiel + tomos numa lista), com o canvas numa aba "Mapa".

**Architecture:** A regra (quais tomos estão montados, quanto pesam, o que trava a entrega) vira um núcleo puro em `modules/nexo/lib/entrega-do-volume.ts`, testado com `node` cru. Um hook (`use-entrega-do-volume.ts`) junta a regra com o estado da conversa e as ações de baixar, que saem de `SalvarEditaveisNoProjeto` e de `VolumesDoConjunto`. Um componente (`EntregaDoVolume`) é usado em dois lugares: no fim do cartão do volume no chat (onde hoje os botões ficam no topo) e no topo do novo `PainelDoVolume`, que o palco mostra numa aba ao lado do canvas.

**Tech Stack:** Next.js (app router), React 19 + React Compiler (lint `react-hooks/*`), Tailwind + tokens do sistema antigo do Nexo (`--status-ok`, `--status-warning`, `Button` de `@/components/ui/button`), `lucide-react`, testes em `scripts/*.ts` rodados com `node` (sem framework).

## Global Constraints

- Teto por tomo: **20 MB = 20 × 1024 × 1024 bytes** (o tamanho como o Windows mostra; os volumes de exemplo ficam em 19,8 / 19,7 / 19,4 "MB" do Explorer).
- A trava dos editáveis continua: o PDF dos volumes só sai depois do ZIP dos editáveis (`liberacaoDoVolume` em `modules/nexo/lib/editaveis-no-projeto.ts`). Agora escrita na tela, não em `title`.
- Ordem dos botões: **"Baixar os editáveis (ODT)"** à esquerda e em destaque; **"Baixar os volumes (PDF)"** à direita.
- Volume de um tomo só baixa o PDF direto; com mais de um, ZIP com `nomeDoZipDosVolumes`.
- Núcleo puro em `modules/nexo/lib/`: **só `import type`** de outros módulos (import de valor com `.ts` quebra o `tsc` com TS5097; sem `.ts` o `node` não resolve). Valores entram por parâmetro.
- Texto da interface em pt-BR, frases curtas, sem emoji.
- Commit e push direto na `main`, mensagem em pt-BR terminando com:
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`

---

## Estrutura de arquivos

| Arquivo | Papel |
|---|---|
| `modules/nexo/lib/entrega-do-volume.ts` (novo) | Puro: tomos montados com peso e veredito, tomos planejados, volume declarado na capa, os passos da entrega. |
| `scripts/test-nexo-entrega-painel.ts` (novo) | Testes do núcleo puro. |
| `modules/nexo/state/use-entrega-do-volume.ts` (novo) | Hook: regra + conversa + ações `baixarEditaveisZip` e `baixarVolumes`. |
| `modules/nexo/components/EntregaDoVolume.tsx` (novo) | Os dois botões, o passo a passo e os tomos acima do teto. |
| `modules/nexo/components/PainelDoVolume.tsx` (novo) | Cabeçalho, entrega, capa A4, lista de tomos. |
| `modules/nexo/components/VistaDoVolume.tsx` (novo) | Abas "Painel" e "Mapa" no palco. |
| `modules/nexo/components/ConfirmationCard.tsx` (modificar) | `VolumesDoConjunto` usa `EntregaDoVolume` no fim; sai o "Baixar todos" do topo, sai `volumeDeclaradoNaCapa` local. |
| `modules/nexo/components/NexoWorkspace.tsx` (modificar) | O `mapa` do palco passa a ser `VistaDoVolume` com o `NexoCanvas` dentro. |
| `modules/nexo/components/SalvarEditaveisNoProjeto.tsx` (apagar) | Substituído pelo hook + `EntregaDoVolume`. |
| `package.json` (modificar) | Script `test:nexo:entrega-painel`. |

---

### Task 1: O núcleo puro da entrega

**Files:**
- Create: `modules/nexo/lib/entrega-do-volume.ts`
- Create: `scripts/test-nexo-entrega-painel.ts`
- Modify: `package.json` (bloco `scripts`)

**Interfaces:**
- Consumes: `SavedResult` (tipo) de `modules/nexo/state/conversation-store.tsx` — campos `artifactId`, `kind`, `payload`, `files: { name, mime, url, primary?, sizeBytes? }[]`.
- Produces:
  - `TETO_DO_TOMO_BYTES: number`
  - `formatarMb(bytes: number): string`
  - `type VereditoDoTomo = "ok" | "aviso" | "critico" | "sem-conferencia"`
  - `interface TomoMontado { tomo: number; nome: string; url: string; bytes: number | null; acimaDoTeto: boolean; veredito: VereditoDoTomo; pontos: number }`
  - `tomosMontados(results: readonly SavedResult[]): TomoMontado[]`
  - `tomosPlanejados(results: readonly SavedResult[]): number`
  - `volumeDaCapa(results: readonly SavedResult[]): string`
  - `interface PassosDaEntrega { editaveis: { feito: boolean; quando: number | null; motivo: string | null }; volumes: { liberado: boolean; motivo: string | null }; acimaDoTeto: TomoMontado[]; prontos: number; planejados: number }`
  - `passosDaEntrega(args: { tomos: readonly TomoMontado[]; planejados: number; liberacao: { liberado: boolean; motivo: string | null }; editaveisSalvosEm: number | null }): PassosDaEntrega`
  - `rotuloDoTomo(tomo: number): string` ("Tomo 04"; `0` → "Volume")

- [ ] **Step 1: Escrever os testes (falham)**

`scripts/test-nexo-entrega-painel.ts`:

```ts
/**
 * A entrega do volume e o teto de 20 MB por tomo. Núcleo PURO → node cru:
 *
 *   node scripts/test-nexo-entrega-painel.ts   (== npm run test:nexo:entrega-painel)
 */
import assert from "node:assert/strict";

import {
  TETO_DO_TOMO_BYTES,
  formatarMb,
  passosDaEntrega,
  rotuloDoTomo,
  tomosMontados,
  tomosPlanejados,
  volumeDaCapa,
} from "../modules/nexo/lib/entrega-do-volume.ts";

const PDF = "application/pdf";
const MB = 1024 * 1024;

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
const volume = (tomo: number, bytes?: number, conferencia?: unknown): any => ({
  artifactId: `volume:x:t${String(tomo).padStart(2, "0")}`,
  kind: "volume",
  summary: "",
  payload: { tomo, ...(conferencia ? { conferencia } : {}) },
  files: [{ label: "PDF do volume", name: `vol_tomo${tomo}.pdf`, mime: PDF, url: `blob:${tomo}`, primary: true, ...(bytes !== undefined ? { sizeBytes: bytes } : {}) }],
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const capa = (numTomos: number, volume = "3"): any => ({
  artifactId: "capa:x",
  kind: "capa",
  summary: "",
  payload: { numTomos, volume },
  files: [],
});

const livre = { liberado: true, motivo: null };

test("o teto é 20 MiB, como o Windows mostra", () => {
  assert.equal(TETO_DO_TOMO_BYTES, 20 * 1024 * 1024);
});

test("formatarMb usa vírgula e uma casa", () => {
  assert.equal(formatarMb(27.6 * MB), "27,6 MB");
  assert.equal(formatarMb(512 * 1024), "0,5 MB");
});

test("tomosMontados: em ordem de tomo, com peso e teto", () => {
  const t = tomosMontados([volume(2, 12 * MB), volume(1, 27.6 * MB)]);
  assert.deepEqual(t.map((x) => x.tomo), [1, 2]);
  assert.equal(t[0].acimaDoTeto, true);
  assert.equal(t[1].acimaDoTeto, false);
});

test("tomosMontados: sem peso conhecido não é declarado acima do teto", () => {
  const [t] = tomosMontados([volume(1)]);
  assert.equal(t.bytes, null);
  assert.equal(t.acimaDoTeto, false);
});

test("tomosMontados: veredito e pontos vêm da conferência gravada", () => {
  const [t] = tomosMontados([
    volume(1, MB, { veredito: "aviso", findings: [{ severidade: "aviso" }, { severidade: "info" }, { severidade: "critico" }] }),
  ]);
  assert.equal(t.veredito, "aviso");
  assert.equal(t.pontos, 2, "info não conta como ponto para olhar");
  assert.equal(tomosMontados([volume(2, MB)])[0].veredito, "sem-conferencia");
});

test("tomosPlanejados: o maior entre o declarado na capa e o montado", () => {
  assert.equal(tomosPlanejados([capa(6), volume(1)]), 6);
  assert.equal(tomosPlanejados([volume(1), volume(2)]), 2);
  assert.equal(tomosPlanejados([]), 0);
});

test("volumeDaCapa: lê o volume declarado na capa", () => {
  assert.equal(volumeDaCapa([capa(1, "I")]), "I");
  assert.equal(volumeDaCapa([volume(1)]), "");
});

test("rotuloDoTomo: dois dígitos; 0 é o volume sem divisão", () => {
  assert.equal(rotuloDoTomo(4), "Tomo 04");
  assert.equal(rotuloDoTomo(0), "Volume");
});

test("passos: faltando tomo, os volumes não liberam e dizem quantos faltam", () => {
  const tomos = tomosMontados([volume(1, MB)]);
  const p = passosDaEntrega({ tomos, planejados: 3, liberacao: livre, editaveisSalvosEm: 1 });
  assert.equal(p.volumes.liberado, false);
  assert.equal(p.volumes.motivo, "Faltam 2 de 3 tomos para montar.");
});

test("passos: um tomo acima do teto trava, com o nome e o peso", () => {
  const tomos = tomosMontados([volume(1, MB), volume(4, 27.6 * MB)]);
  const p = passosDaEntrega({ tomos, planejados: 2, liberacao: livre, editaveisSalvosEm: 1 });
  assert.equal(p.volumes.liberado, false);
  assert.equal(p.volumes.motivo, "O Tomo 04 tem 27,6 MB — passa do teto de 20 MB.");
  assert.equal(p.acimaDoTeto.length, 1);
});

test("passos: vários acima do teto viram uma frase só", () => {
  const tomos = tomosMontados([volume(1, 21 * MB), volume(2, 25 * MB)]);
  const p = passosDaEntrega({ tomos, planejados: 2, liberacao: livre, editaveisSalvosEm: 1 });
  assert.equal(p.volumes.motivo, "2 tomos passam do teto de 20 MB (Tomo 01, Tomo 02).");
});

test("passos: sem os editáveis, o passo 1 está pendente e os volumes pedem ele", () => {
  const tomos = tomosMontados([volume(1, MB)]);
  const p = passosDaEntrega({ tomos, planejados: 1, liberacao: { liberado: false, motivo: "x" }, editaveisSalvosEm: null });
  assert.equal(p.editaveis.feito, false);
  assert.equal(p.editaveis.motivo, null, "nunca baixou: pendente, sem motivo de erro");
  assert.equal(p.volumes.motivo, "Baixe os editáveis primeiro.");
});

test("passos: editáveis envelhecidos voltam a pendente com o motivo", () => {
  const tomos = tomosMontados([volume(1, MB)]);
  const motivo = "A capa, a LD ou a separatriz mudou depois do ZIP — baixe os editáveis de novo.";
  const p = passosDaEntrega({ tomos, planejados: 1, liberacao: { liberado: false, motivo }, editaveisSalvosEm: 5 });
  assert.equal(p.editaveis.feito, false);
  assert.equal(p.editaveis.motivo, motivo);
  assert.equal(p.volumes.motivo, motivo);
});

test("passos: tudo certo libera os volumes", () => {
  const tomos = tomosMontados([volume(1, MB), volume(2, 19 * MB)]);
  const p = passosDaEntrega({ tomos, planejados: 2, liberacao: livre, editaveisSalvosEm: 9 });
  assert.deepEqual(p.editaveis, { feito: true, quando: 9, motivo: null });
  assert.deepEqual(p.volumes, { liberado: true, motivo: null });
});

console.log(`\n${passed} teste(s) da entrega do volume OK`);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node scripts/test-nexo-entrega-painel.ts`
Expected: erro `Cannot find module '…/modules/nexo/lib/entrega-do-volume.ts'`.

- [ ] **Step 3: Implementar o núcleo**

`modules/nexo/lib/entrega-do-volume.ts`:

```ts
/**
 * A ENTREGA DO VOLUME — o que já está montado, quanto pesa, e o que trava o
 * download (06/10/2026, Parte 3 e Parte 9 de
 * docs/superpowers/specs/2026-10-06-montagem-de-volume-design.md).
 *
 * Três travas, nesta ordem de leitura: falta tomo para montar; algum tomo passa
 * do teto de 20 MB (regra do escritório); os editáveis não foram baixados, ou
 * envelheceram. A dos editáveis já existia (`liberacaoDoVolume`); ela entra
 * aqui PRONTA, por parâmetro — este módulo é puro e não importa valor.
 *
 * PURO: só `import type`. `node scripts/test-nexo-entrega-painel.ts`.
 */
import type { SavedResult } from "../state/conversation-store";

/** 20 MB como o Windows mostra (MiB): os volumes do escritório param em 19,8. */
export const TETO_DO_TOMO_BYTES = 20 * 1024 * 1024;

const PDF = "application/pdf";

export function formatarMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function rotuloDoTomo(tomo: number): string {
  return tomo > 0 ? `Tomo ${String(tomo).padStart(2, "0")}` : "Volume";
}

export type VereditoDoTomo = "ok" | "aviso" | "critico" | "sem-conferencia";

export interface TomoMontado {
  /** `0` = volume sem divisão em tomos. */
  tomo: number;
  nome: string;
  url: string;
  /** Peso do PDF; `null` quando o registro não guardou (conversa antiga). */
  bytes: number | null;
  acimaDoTeto: boolean;
  veredito: VereditoDoTomo;
  /** Achados de conferência que pedem um olhar (crítico + aviso; info não conta). */
  pontos: number;
}

interface ConferenciaGravada {
  veredito?: unknown;
  findings?: { severidade?: unknown }[];
}

function vereditoDe(conferencia: ConferenciaGravada | undefined): { veredito: VereditoDoTomo; pontos: number } {
  const v = conferencia?.veredito;
  if (v !== "ok" && v !== "aviso" && v !== "critico") return { veredito: "sem-conferencia", pontos: 0 };
  const pontos = (conferencia?.findings ?? []).filter((f) => f.severidade === "critico" || f.severidade === "aviso").length;
  return { veredito: v, pontos };
}

/** Os tomos montados, em ordem, com peso, teto e conferência. */
export function tomosMontados(results: readonly SavedResult[]): TomoMontado[] {
  const tomos: TomoMontado[] = [];
  for (const r of results) {
    if (r.kind !== "volume") continue;
    const arquivo = r.files.find((f) => f.mime === PDF && f.primary) ?? r.files.find((f) => f.mime === PDF);
    if (!arquivo?.url) continue;
    const payload = (r.payload ?? {}) as { tomo?: unknown; conferencia?: ConferenciaGravada };
    const tomo = typeof payload.tomo === "number" ? payload.tomo : 0;
    const bytes = typeof arquivo.sizeBytes === "number" ? arquivo.sizeBytes : null;
    tomos.push({
      tomo,
      nome: arquivo.name,
      url: arquivo.url,
      bytes,
      acimaDoTeto: bytes !== null && bytes > TETO_DO_TOMO_BYTES,
      ...vereditoDe(payload.conferencia),
    });
  }
  return tomos.sort((a, b) => a.tomo - b.tomo);
}

/**
 * Quantos tomos o volume TEM de ter: o maior entre o declarado na capa/LD
 * (`payload.numTomos`) e o que já foi montado. Comparar só com os montados
 * diria "completo" com 4 de 6.
 */
export function tomosPlanejados(results: readonly SavedResult[]): number {
  let declarado = 0;
  let montados = 0;
  for (const r of results) {
    const n = (r.payload as { numTomos?: unknown } | undefined)?.numTomos;
    if (typeof n === "number" && Number.isFinite(n)) declarado = Math.max(declarado, Math.floor(n));
    if (r.kind === "volume") montados++;
  }
  return Math.max(declarado, montados);
}

/** O número do volume impresso na capa ("3", "I"), ou "" sem capa. */
export function volumeDaCapa(results: readonly SavedResult[]): string {
  for (const r of results) {
    if (r.kind !== "capa") continue;
    const v = (r.payload as { volume?: unknown } | undefined)?.volume;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export interface PassosDaEntrega {
  editaveis: { feito: boolean; quando: number | null; motivo: string | null };
  volumes: { liberado: boolean; motivo: string | null };
  acimaDoTeto: TomoMontado[];
  prontos: number;
  planejados: number;
}

export function passosDaEntrega(args: {
  tomos: readonly TomoMontado[];
  planejados: number;
  liberacao: { liberado: boolean; motivo: string | null };
  editaveisSalvosEm: number | null;
}): PassosDaEntrega {
  const { tomos, planejados, liberacao, editaveisSalvosEm } = args;
  const acimaDoTeto = tomos.filter((t) => t.acimaDoTeto);
  const feito = editaveisSalvosEm !== null && liberacao.liberado;
  // Nunca baixou é PENDENTE, não erro: o motivo só aparece quando envelheceu.
  const editaveis = {
    feito,
    quando: feito ? editaveisSalvosEm : null,
    motivo: !feito && editaveisSalvosEm !== null ? liberacao.motivo : null,
  };

  const faltam = Math.max(0, planejados - tomos.length);
  let motivo: string | null = null;
  if (faltam > 0) {
    motivo = `Faltam ${faltam} de ${planejados} tomos para montar.`;
  } else if (acimaDoTeto.length === 1) {
    const t = acimaDoTeto[0];
    motivo = `O ${rotuloDoTomo(t.tomo)} tem ${formatarMb(t.bytes ?? 0)} — passa do teto de 20 MB.`;
  } else if (acimaDoTeto.length > 1) {
    motivo = `${acimaDoTeto.length} tomos passam do teto de 20 MB (${acimaDoTeto.map((t) => rotuloDoTomo(t.tomo)).join(", ")}).`;
  } else if (!liberacao.liberado) {
    motivo = editaveisSalvosEm === null ? "Baixe os editáveis primeiro." : liberacao.motivo;
  }

  return {
    editaveis,
    volumes: { liberado: motivo === null && tomos.length > 0, motivo },
    acimaDoTeto,
    prontos: tomos.length,
    planejados,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node scripts/test-nexo-entrega-painel.ts`
Expected: `14 teste(s) da entrega do volume OK`, sem `FALHOU`.

- [ ] **Step 5: Registrar o script e commitar**

Em `package.json`, junto aos outros `test:nexo:*`:

```json
"test:nexo:entrega-painel": "node scripts/test-nexo-entrega-painel.ts",
```

```bash
npx tsc --noEmit -p .
git add modules/nexo/lib/entrega-do-volume.ts scripts/test-nexo-entrega-painel.ts package.json
git commit -m "Entrega do volume: núcleo puro com peso por tomo e teto de 20 MB

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: A entrega com dois botões, no fim do cartão do volume

**Files:**
- Create: `modules/nexo/state/use-entrega-do-volume.ts`
- Create: `modules/nexo/components/EntregaDoVolume.tsx`
- Modify: `modules/nexo/components/ConfirmationCard.tsx` (imports ~linhas 155-166; `volumeDeclaradoNaCapa` ~1487-1494; `VolumesDoConjunto` ~1496-1645)
- Delete: `modules/nexo/components/SalvarEditaveisNoProjeto.tsx`

**Interfaces:**
- Consumes (Task 1): `tomosMontados`, `tomosPlanejados`, `passosDaEntrega`, `volumeDaCapa`, `TomoMontado`, `PassosDaEntrega`, `formatarMb`, `rotuloDoTomo`.
- Consumes (existentes): `useConversation()` → `{ results, identidade, editaveisSalvos, registrarEditaveisSalvos }`; `useLiberacaoDoVolume()`; `baixarEditaveis`, `baixarArquivosEmZip`, `editaveisDosResultados` de `../lib/editaveis`; `nomesDosEditaveis`, `nomeDoZipDosVolumes` de `../lib/nome-do-volume`; `gerarEditaveisConsolidados`, `parametrosDaEntrega` de `../lib/editaveis-consolidados`; `assinaturaDosDocumentos` de `../lib/editaveis-no-projeto`; `volumesProntosDosResultados` de `../lib/volumes-prontos`.
- Produces:
  - `useEntregaDoVolume(selos: SeloForLd[]): { passos: PassosDaEntrega; tomos: TomoMontado[]; temEditaveis: boolean; ocupado: "editaveis" | "volumes" | null; erro: string | null; baixarEditaveisZip(): Promise<void>; baixarVolumes(): Promise<void> }`
  - `<EntregaDoVolume selos={SeloForLd[]} />`

- [ ] **Step 1: O hook**

`modules/nexo/state/use-entrega-do-volume.ts`:

```ts
"use client";

/**
 * A ENTREGA DO VOLUME como ação: a regra pura (`entrega-do-volume.ts`) + o
 * estado da conversa + os dois downloads. Um lugar só para o cartão do chat e
 * o painel do palco — duas cópias do "baixar" são duas travas, e uma esquece.
 *
 * Os downloads vieram de `SalvarEditaveisNoProjeto` (o ZIP dos editáveis) e de
 * `VolumesDoConjunto` (o "baixar todos").
 */
import { useMemo, useState } from "react";

import type { SeloForLd } from "@/server/nexo/build-ld-proposal";

import { baixarArquivosEmZip, baixarEditaveis, editaveisDosResultados } from "../lib/editaveis";
import { gerarEditaveisConsolidados, parametrosDaEntrega } from "../lib/editaveis-consolidados";
import { assinaturaDosDocumentos } from "../lib/editaveis-no-projeto";
import { passosDaEntrega, tomosMontados, tomosPlanejados, volumeDaCapa } from "../lib/entrega-do-volume";
import { nomeDoZipDosVolumes, nomesDosEditaveis } from "../lib/nome-do-volume";
import { volumesProntosDosResultados } from "../lib/volumes-prontos";
import { useConversation } from "./conversation-store";
import { useLiberacaoDoVolume } from "./use-liberacao-do-volume";

/** Um arquivo só: link de download direto, sem ZIP. */
function baixarUrl(url: string, nome: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function useEntregaDoVolume(selos: SeloForLd[]) {
  const { results, identidade, editaveisSalvos, registrarEditaveisSalvos } = useConversation();
  const liberacao = useLiberacaoDoVolume();
  const [ocupado, setOcupado] = useState<"editaveis" | "volumes" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const tomos = useMemo(() => tomosMontados(results), [results]);
  const planejados = useMemo(() => tomosPlanejados(results), [results]);
  const temEditaveis = useMemo(() => editaveisDosResultados(results).length > 0, [results]);
  const passos = useMemo(
    () => passosDaEntrega({ tomos, planejados, liberacao, editaveisSalvosEm: editaveisSalvos?.quando ?? null }),
    [tomos, planejados, liberacao, editaveisSalvos],
  );

  async function baixarEditaveisZip() {
    setErro(null);
    setOcupado("editaveis");
    try {
      const assinatura = assinaturaDosDocumentos(results);
      const nomes = nomesDosEditaveis(selos, identidade ?? {});
      const { editaveis: todos, falhas } = await gerarEditaveisConsolidados({
        selos,
        nomes,
        params: parametrosDaEntrega(results),
        identidade,
      });
      // Liberar com um editável faltando é liberar o volume que perde a capa editável.
      if (falhas.length > 0) throw new Error(`Não deu para gerar: ${falhas.join("; ")}. O ZIP não saiu.`);
      await baixarEditaveis(todos, nomes.zip);
      registrarEditaveisSalvos({ pasta: "", quando: Date.now(), modo: "zip", arquivos: todos.map((e) => e.nome), assinatura });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao juntar os editáveis.");
    } finally {
      setOcupado(null);
    }
  }

  async function baixarVolumes() {
    if (!passos.volumes.liberado) return;
    setErro(null);
    setOcupado("volumes");
    try {
      const prontos = volumesProntosDosResultados(results);
      if (prontos.length === 1) baixarUrl(prontos[0].url, prontos[0].nome);
      else await baixarArquivosEmZip(prontos, nomeDoZipDosVolumes(selos, identidade ?? {}, volumeDaCapa(results) || undefined));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao juntar os volumes.");
    } finally {
      setOcupado(null);
    }
  }

  return { passos, tomos, temEditaveis, ocupado, erro, baixarEditaveisZip, baixarVolumes };
}
```

- [ ] **Step 2: O componente**

`modules/nexo/components/EntregaDoVolume.tsx`:

```tsx
"use client";

/**
 * A ENTREGA (06/10/2026): dois botões lado a lado, na ordem do trabalho, e o
 * passo a passo que se marca sozinho. A trava dos editáveis já existia; agora
 * está ESCRITA na tela, e o teto de 20 MB por tomo entra no mesmo lugar.
 */
import { CircleCheck, Circle, FileDown, FolderDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatarDataHora } from "@/lib/fuso-de-brasilia";
import type { SeloForLd } from "@/server/nexo/build-ld-proposal";

import { formatarMb, rotuloDoTomo } from "../lib/entrega-do-volume";
import { useEntregaDoVolume } from "../state/use-entrega-do-volume";

function Passo({ feito, titulo, nota, alerta }: { feito: boolean; titulo: string; nota?: string | null; alerta?: string | null }) {
  return (
    <li className="flex items-start gap-2 text-xs leading-relaxed">
      {feito ? (
        <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--status-ok)]" aria-label="Feito" />
      ) : (
        <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Pendente" />
      )}
      <span className="grid gap-0.5">
        <span className={feito ? "text-muted-foreground" : "text-foreground"}>{titulo}</span>
        {alerta && <span className="text-[var(--status-warning)]">{alerta}</span>}
        {!alerta && nota && <span className="text-muted-foreground">{nota}</span>}
      </span>
    </li>
  );
}

export function EntregaDoVolume({ selos }: { selos: SeloForLd[] }) {
  const e = useEntregaDoVolume(selos);
  const { passos } = e;
  if (!e.temEditaveis && e.tomos.length === 0) return null;
  const volumesRotulo = passos.planejados > 1 ? `Baixar os ${passos.planejados} volumes (PDF)` : "Baixar o volume (PDF)";

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-3" data-prova="entrega-do-volume" aria-label="Entrega do volume">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={passos.editaveis.feito ? "secondary" : "default"} loading={e.ocupado === "editaveis"} disabled={e.ocupado !== null || !e.temEditaveis} onClick={() => void e.baixarEditaveisZip()}>
          <FolderDown className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {e.ocupado === "editaveis" ? "Gerando os editáveis…" : "Baixar os editáveis (ODT)"}
        </Button>
        <Button size="sm" variant={passos.editaveis.feito ? "default" : "secondary"} loading={e.ocupado === "volumes"} disabled={e.ocupado !== null || !passos.volumes.liberado} onClick={() => void e.baixarVolumes()}>
          <FileDown className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {e.ocupado === "volumes" ? "Juntando os volumes…" : volumesRotulo}
        </Button>
      </div>

      <ol className="flex flex-col gap-1.5">
        <Passo
          feito={passos.editaveis.feito}
          titulo="1. Baixe os editáveis e salve na pasta do projeto no servidor."
          nota={passos.editaveis.feito && passos.editaveis.quando ? `Baixados em ${formatarDataHora(passos.editaveis.quando)}.` : "São eles que a equipe edita depois. Sem eles na pasta, a próxima revisão começa do zero."}
          alerta={passos.editaveis.motivo}
        />
        <Passo feito={false} titulo="2. Baixe os volumes (PDF)." alerta={passos.volumes.motivo} />
      </ol>

      {passos.acimaDoTeto.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-[var(--status-warning)]" data-prova="acima-do-teto">
          {passos.acimaDoTeto.map((t) => (
            <li key={t.tomo}>
              {rotuloDoTomo(t.tomo)}: {formatarMb(t.bytes ?? 0)} — passa do teto de 20 MB. Divida o tomo ou comprima as imagens antes de entregar.
            </li>
          ))}
        </ul>
      )}

      {e.erro && <p className="text-xs text-[var(--destructive)]">{e.erro}</p>}
    </section>
  );
}
```

- [ ] **Step 3: Trocar no cartão do volume**

Em `modules/nexo/components/ConfirmationCard.tsx`:

1. Imports — remover `import { SalvarEditaveisNoProjeto } from "./SalvarEditaveisNoProjeto";` e `import { todosOsVolumesProntos, volumesProntosDosResultados } from "../lib/volumes-prontos";`, e acrescentar:

```ts
import { EntregaDoVolume } from "./EntregaDoVolume";
import { volumeDaCapa } from "../lib/entrega-do-volume";
```

   Se `baixarArquivosEmZip`, `nomeDoZipDosVolumes` ou `useLiberacaoDoVolume` ficarem sem uso no arquivo depois do passo 3, tirá-los do import (o `tsc`/lint aponta).

2. Apagar a função local `volumeDeclaradoNaCapa` (≈ linhas 1487-1494) e trocar as chamadas restantes, se houver, por `volumeDaCapa(results)`.

3. Em `VolumesDoConjunto`, apagar: `liberacao`, `volumesProntos`, `conjuntoCompleto`, `baixandoVolumes`, `erroDosVolumes`, `baixarTodosOsVolumes`, o `<Button>` "Baixar os N volumes" e o `{editaveis.length > 0 && <SalvarEditaveisNoProjeto … />}`. O `return` fica:

```tsx
  return (
    <>
      {tomos.length > 1 && (
        <div className="flex flex-col gap-2">
          <ConfirmButton
            busy={montando !== null}
            label={`Montar os ${tomos.length} volumes`}
            busyLabel={montando !== null ? `Montando ${montando + 1} de ${tomos.length}…` : "Montando…"}
            onConfirm={montarTodos}
          />
          {falhas.length > 0 && (
            <p className="text-xs text-[var(--destructive)]">
              {plural(falhas.length, "volume não montou", "volumes não montaram")}:{" "}
              {falhas.map((f) => `${f.rotulo} (${f.motivo})`).join("; ")}. Os outros estão prontos.
            </p>
          )}
        </div>
      )}
      {tomos.map((t) => (
        <VolumeConfirmation key={t.sufixo || "unico"} {...props} tomo={t} />
      ))}
      {/*
        A ENTREGA NO FIM (06/10/2026): os botões de baixar ficavam no topo, e
        com seis tomos era preciso rolar de volta por cima de todos os cartões.
        Agora vêm depois do que se acabou de montar — na ordem em que se usa.
      */}
      {(editaveis.length > 0 || tomos.length > 1) && <EntregaDoVolume selos={props.selos} />}
    </>
  );
```

4. Apagar o arquivo `modules/nexo/components/SalvarEditaveisNoProjeto.tsx` e confirmar que não há outro uso:

Run: `grep -rn "SalvarEditaveisNoProjeto" modules components app`
Expected: nenhuma linha.

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit -p . && npx eslint modules/nexo/components/ConfirmationCard.tsx modules/nexo/components/EntregaDoVolume.tsx modules/nexo/state/use-entrega-do-volume.ts`
Expected: sem saída do `tsc`; o `eslint` sem erros novos (comparar com `git stash` se aparecer erro preexistente no ConfirmationCard).

Run: `node scripts/test-nexo-entrega-painel.ts && node scripts/test-nexo-volumes-prontos.ts && node --import ./scripts/lib/resolver-de-imports.mjs scripts/test-entrega-do-volume.ts`
Expected: todos `OK`, nenhum `FALHOU`.

- [ ] **Step 5: Commit**

```bash
git add modules/nexo/state/use-entrega-do-volume.ts modules/nexo/components/EntregaDoVolume.tsx modules/nexo/components/ConfirmationCard.tsx
git rm modules/nexo/components/SalvarEditaveisNoProjeto.tsx
git commit -m "Entrega do volume: dois botões no fim do cartão, passo a passo dos editáveis e teto de 20 MB

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: O painel do volume no palco

**Files:**
- Create: `modules/nexo/components/PainelDoVolume.tsx`
- Create: `modules/nexo/components/VistaDoVolume.tsx`
- Modify: `modules/nexo/components/NexoWorkspace.tsx` (o `mapa={<NexoCanvas … />}` ≈ linha 3010)

**Interfaces:**
- Consumes (Task 1): `tomosMontados`, `tomosPlanejados`, `volumeDaCapa`, `formatarMb`, `rotuloDoTomo`, `TomoMontado`.
- Consumes (Task 2): `<EntregaDoVolume selos />`.
- Consumes (existentes): `ArtifactThumb` (`pdfUrl`, `width`, `kind`, `pageNumber`); `useConversation()` → `{ results, identidade }`.
- Produces: `<VistaDoVolume selos mapa />`, `<PainelDoVolume selos />`.

- [ ] **Step 1: O painel**

`modules/nexo/components/PainelDoVolume.tsx`:

```tsx
"use client";

/**
 * O PAINEL DO VOLUME (06/10/2026, Parte 4 do desenho): o que foi gerado, de
 * relance, e a entrega sempre à vista. O canvas continua na aba "Mapa" para
 * quem quer arrastar folha; aqui é para conferir e baixar.
 */
import { ExternalLink } from "lucide-react";
import { useMemo } from "react";

import type { SeloForLd } from "@/server/nexo/build-ld-proposal";

import { formatarMb, rotuloDoTomo, tomosMontados, tomosPlanejados, volumeDaCapa, type TomoMontado } from "../lib/entrega-do-volume";
import { useConversation } from "../state/conversation-store";
import { ArtifactThumb } from "./ArtifactThumb";
import { EntregaDoVolume } from "./EntregaDoVolume";

const PDF = "application/pdf";

function LinhaDoTomo({ numero, montado }: { numero: number; montado: TomoMontado | undefined }) {
  return (
    <li className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border py-2 text-xs first:border-t-0" data-prova="tomo-do-painel">
      <span className="font-mono">{rotuloDoTomo(numero)}</span>
      {montado ? (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className={montado.acimaDoTeto ? "text-[var(--status-warning)]" : "text-muted-foreground"}>
            {montado.bytes !== null ? formatarMb(montado.bytes) : "peso desconhecido"}
            {montado.acimaDoTeto ? " · passa do teto de 20 MB" : ""}
          </span>
          <span className={montado.veredito === "ok" ? "text-[var(--status-ok)]" : montado.veredito === "sem-conferencia" ? "text-muted-foreground" : "text-[var(--status-warning)]"}>
            {montado.veredito === "ok" ? "conferido" : montado.veredito === "sem-conferencia" ? "sem conferência" : `${montado.pontos} ${montado.pontos === 1 ? "ponto" : "pontos"} para olhar`}
          </span>
        </span>
      ) : (
        <span className="text-muted-foreground">ainda não montado</span>
      )}
      {montado ? (
        <a href={montado.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline">
          <ExternalLink className="h-3 w-3" aria-hidden /> Abrir
        </a>
      ) : (
        <span />
      )}
    </li>
  );
}

export function PainelDoVolume({ selos }: { selos: SeloForLd[] }) {
  const { results, identidade } = useConversation();
  const tomos = useMemo(() => tomosMontados(results), [results]);
  const planejados = useMemo(() => tomosPlanejados(results), [results]);
  const volume = volumeDaCapa(results);
  const capas = useMemo(
    () =>
      results
        .filter((r) => r.kind === "capa")
        .map((r) => ({ id: r.artifactId, pdf: r.files.find((f) => f.mime === PDF)?.url ?? null }))
        .filter((c): c is { id: string; pdf: string } => c.pdf !== null),
    [results],
  );
  const numeros = planejados > 1 ? Array.from({ length: planejados }, (_, i) => i + 1) : tomos.length ? [tomos[0].tomo] : [];
  const pontos = tomos.reduce((s, t) => s + t.pontos, 0) + tomos.filter((t) => t.acimaDoTeto).length;

  if (capas.length === 0 && tomos.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground" data-prova="painel-vazio">
        Gere o volume pelo chat para ver o painel aqui.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4" data-prova="painel-do-volume">
      <header className="flex flex-col gap-1">
        <h2 className="text-base font-medium">
          {volume ? `Volume ${volume}` : "Volume"}
          {identidade?.obra ? ` · ${identidade.obra}` : ""}
        </h2>
        <p className="text-xs text-muted-foreground">
          {identidade?.codigo ? `${identidade.codigo} · ` : ""}
          {planejados > 1 ? `${planejados} tomos · ` : ""}
          {selos.length} folhas · {tomos.length} de {Math.max(planejados, 1)} montado{tomos.length === 1 ? "" : "s"}
          {pontos > 0 ? ` · ${pontos} ${pontos === 1 ? "ponto" : "pontos"} para olhar` : ""}
        </p>
      </header>

      <EntregaDoVolume selos={selos} />

      {capas.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Capa">
          <h3 className="text-xs font-medium text-muted-foreground">Capa{capas.length > 1 ? "s" : ""}</h3>
          <div className="flex flex-wrap gap-3">
            {capas.map((c) => (
              // A4 de verdade: 1 : 1,414 (era 3:4 no canvas e "distorcido" no chat).
              <div key={c.id} className="aspect-[1/1.414] w-[180px] overflow-hidden rounded-sm border border-border bg-white">
                <ArtifactThumb pdfUrl={c.pdf} pageNumber={1} kind="capa" width={180} />
              </div>
            ))}
          </div>
        </section>
      )}

      {numeros.length > 0 && (
        <section className="flex flex-col gap-1" aria-label="Tomos">
          <h3 className="text-xs font-medium text-muted-foreground">{planejados > 1 ? "Tomos" : "Volume montado"}</h3>
          <ul className="rounded-md border border-border bg-card px-3">
            {numeros.map((n) => (
              <LinhaDoTomo key={n} numero={n} montado={tomos.find((t) => t.tomo === n)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: As abas Painel / Mapa**

`modules/nexo/components/VistaDoVolume.tsx`:

```tsx
"use client";

/**
 * PAINEL OU MAPA, no palco (06/10/2026). Com um volume montado o palco abre no
 * painel — é a pergunta da hora ("ficou certo? onde baixo?"); antes disso, no
 * mapa (o canvas), onde se confere e arruma as folhas. A escolha da pessoa vale
 * até ela trocar.
 */
import { useState, type ReactNode } from "react";

import type { SeloForLd } from "@/server/nexo/build-ld-proposal";

import { useConversation } from "../state/conversation-store";
import { PainelDoVolume } from "./PainelDoVolume";

export function VistaDoVolume({ selos, mapa }: { selos: SeloForLd[]; mapa: ReactNode }) {
  const { results } = useConversation();
  const temVolume = results.some((r) => r.kind === "volume");
  const [escolha, setEscolha] = useState<"painel" | "mapa" | null>(null);
  const aba = escolha ?? (temVolume ? "painel" : "mapa");

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-border px-3 py-1.5" role="tablist" aria-label="Vista do volume">
        {(["painel", "mapa"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={aba === v}
            onClick={() => setEscolha(v)}
            className={`rounded-md px-2.5 py-1 text-xs ${aba === v ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {v === "painel" ? "Painel" : "Mapa"}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">{aba === "painel" ? <PainelDoVolume selos={selos} /> : mapa}</div>
    </div>
  );
}
```

- [ ] **Step 3: Ligar no palco**

Em `modules/nexo/components/NexoWorkspace.tsx`, acrescentar o import junto ao do `NexoCanvas`:

```ts
import { VistaDoVolume } from "./VistaDoVolume";
```

e trocar `mapa={<NexoCanvas … />}` por:

```tsx
            mapa={
              <VistaDoVolume
                selos={selos}
                mapa={
                  <NexoCanvas
                    memorial={memorialFile?.name ?? null}
                    folhas={selos}
                    numeros={numerosDasFolhas}
                    origens={origensDasFolhas}
                    arquivosDisponiveis={arquivosDisponiveis}
                    onAbrirFolha={abrirFolha}
                    totais={totaisDasFolhas}
                    onCorrigirFolha={corrigirFolha}
                    onRemoverFolha={removerFolha}
                    onMoverFolhas={moverFolhas}
                    onVoltarAoAutomatico={voltarAoAutomatico}
                    onCriarTomo={criarTomo}
                    onCriarFolha={criarFolha}
                    removidas={removidas}
                    onRestaurarFolhas={restaurarFolhas}
                    tomosDeclarados={conv.tomosDeclarados}
                    conferencia={conferenciaDoVolume}
                  />
                }
              />
            }
```

(O tipo de `selos` em `NexoWorkspace` deve ser compatível com `SeloForLd[]`; se o `tsc` acusar, usar o mesmo valor que já vai para `VolumesDoConjunto`.)

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit -p . && npx eslint modules/nexo/components/PainelDoVolume.tsx modules/nexo/components/VistaDoVolume.tsx modules/nexo/components/NexoWorkspace.tsx`
Expected: sem erros novos.

- [ ] **Step 5: Commit**

```bash
git add modules/nexo/components/PainelDoVolume.tsx modules/nexo/components/VistaDoVolume.tsx modules/nexo/components/NexoWorkspace.tsx
git commit -m "Painel do volume no palco: capa A4, tomos com peso e conferência, entrega à vista

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Prova no navegador e entrega

**Files:** nenhum novo (só verificação).

- [ ] **Step 1: Subir o dev server** (`npm run dev`; se já estiver rodando, recarregar a página). Abrir `http://localhost:3000/nexo`.

- [ ] **Step 2: Montar um volume de verdade**: anexar as pranchas de `C:\Users\matheus.mendes\Desktop\NexoDoc\NEXO - TESTES\Volumes\084-25\10_inc_spd\arquivos separados` (o vol. 10 montado tem 27,6 MB — o caso acima do teto), seguir o fluxo atual até "Montar os N volumes".

- [ ] **Step 3: Conferir no chat**: a `EntregaDoVolume` aparece DEPOIS dos cartões dos tomos; "Baixar os editáveis (ODT)" à esquerda; "Baixar os volumes" desligado com "Baixe os editáveis primeiro." escrito; depois do ZIP o passo 1 vira ✓ com o horário.

- [ ] **Step 4: Conferir o teto**: se algum tomo passar de 20 MB, a linha âmbar "Tomo NN: X MB — passa do teto" aparece e o passo 2 diz o motivo; nenhum tomo acima → o botão de volumes liga.

- [ ] **Step 5: Conferir o palco**: com volume montado, o palco abre na aba "Painel": cabeçalho com volume/obra/código, a mesma entrega, as capas em A4 (proporção 1 : 1,414), a lista de tomos com peso, conferência e "Abrir". A aba "Mapa" mostra o canvas como antes.

- [ ] **Step 6: Push**

```bash
git push origin main
```

---

## Self-review (feito)

- **Cobertura do desenho (Parte 3 da ordem de entrega = Partes 4, 5 e medida da 9):** dois botões lado a lado ✓ (Task 2); passo a passo com a trava escrita ✓ (Task 2); entrega no fim, sem rolar ✓ (Task 2); painel com cabeçalho, entrega à vista, capa A4, tomos numa lista ✓ (Task 3); canvas numa aba "Mapa" ✓ (Task 3); peso por tomo e teto de 20 MB com motivo ✓ (Tasks 1-3). **Fora deste plano, de propósito:** "Corrigir" e histórico de alterações (Parte 3 do desenho → plano 4), as saídas "Dividir/Comprimir" (planos 4 e 6), o cartão curto "Volume pronto" no chat e a capa com campos editáveis no lugar (dependem do piloto, plano 2).
- **Placeholders:** nenhum.
- **Tipos:** `TomoMontado`, `PassosDaEntrega`, `useEntregaDoVolume` e `EntregaDoVolume` usados com os mesmos nomes e campos nas Tasks 1-3.
