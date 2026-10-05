/**
 * MEDE A NAVEGAÇÃO E O GRIFO DO VISOR contra parecer + PDF reais, sem token.
 *
 *   node scripts/mede-grifo.ts                  (== npm run mede:grifo)
 *
 * Para cada achado responde o que o visor faria: o texto do grifo casa na
 * primeira página citada? Noutra página citada? Numa página que o achado NÃO
 * cita? Em lugar nenhum? É a mesma costura do visor (`marcacaoDoTrecho`) sobre
 * os mesmos itens que o pdf.js entrega à camada de texto.
 *
 * Duas colunas: o grifo de HOJE (`getHighlightNeedle`, reproduzido) e o novo
 * (`lib/grifo-do-achado.ts`), para o ganho ser número e não impressão.
 */
import fs from "node:fs";

import { marcacaoDoTrecho } from "../lib/marcacao-do-trecho.ts";
import { paginasDoAchado } from "../lib/paginas-do-achado.ts";
import type { ItemDeTexto } from "../lib/texto-do-pdf.ts";
import { candidatosDoGrifo } from "../lib/grifo-do-achado.ts";

type Achado = {
  id: string;
  pagina?: string;
  referencia_comparada?: string;
  termo_busca?: string;
  evidencia?: string;
  conflito?: string;
  origem?: string;
};

const PARES: [string, string][] = [
  ["docs/benchmarks/117-25/parecer-nexodoc-2026-09-24-controle-56.json", "docs/samples/117-25/1_memorial/117_25_md_geral_a.pdf"],
  ["docs/benchmarks/113-22/parecer-nexodoc-2026-08-18.json", "docs/samples/113-22/1_memorial/113_22_md_geral_a.pdf"],
];

/** O grifo de hoje: `getHighlightNeedle(reportFindingToStructured(f))`. */
function grifoDeHoje(f: Achado): string {
  const termoBusca = f.termo_busca ?? f.evidencia;
  const evidencia = f.evidencia ?? "";
  const candidatos = [termoBusca, ...Array.from((f.conflito ?? "").matchAll(/"([^"]{3,120})"/g)).map((m) => m[1])]
    .map((x) => x?.trim())
    .filter((x): x is string => Boolean(x && x.length >= 3));
  return candidatos.find((c) => evidencia.toLowerCase().includes(c.toLowerCase())) ?? candidatos[0] ?? "";
}

async function itensPorPagina(arquivo: string): Promise<ItemDeTexto[][]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(arquivo)), disableWorker: true } as never).promise;
  const paginas: ItemDeTexto[][] = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const c = await (await doc.getPage(n)).getTextContent();
    paginas.push(c.items.filter((i) => typeof (i as { str?: unknown }).str === "string") as unknown as ItemDeTexto[]);
  }
  return paginas;
}

type Desfecho = "primeira" | "outra-citada" | "nao-citada" | "nenhuma" | "sem-grifo";

function desfecho(paginas: ItemDeTexto[][], citadas: number[], achaNa: (p: number) => boolean, temGrifo: boolean): Desfecho {
  if (!temGrifo) return "sem-grifo";
  if (citadas[0] && achaNa(citadas[0])) return "primeira";
  if (citadas.slice(1).some(achaNa)) return "outra-citada";
  for (let p = 1; p <= paginas.length; p += 1) if (achaNa(p)) return "nao-citada";
  return "nenhuma";
}

const total = { hoje: new Map<Desfecho, number>(), novo: new Map<Desfecho, number>() };
const exemplos: string[] = [];
const cobertura = { paginas: 0, hoje: 0, novo: 0 };

for (const [parecer, pdf] of PARES) {
  const j = JSON.parse(fs.readFileSync(parecer, "utf8"));
  const achados: Achado[] = (j.report ?? j).incongruencias ?? [];
  const paginas = await itensPorPagina(pdf);
  const casa = (p: number, termo: string) => Boolean(termo) && (paginas[p - 1] ? marcacaoDoTrecho(paginas[p - 1], termo).size > 0 : false);

  for (const f of achados) {
    const citadas = paginasDoAchado({ pagina: f.pagina, referencia: f.referencia_comparada });
    const hoje = grifoDeHoje(f);
    const dHoje = desfecho(paginas, citadas, (p) => casa(p, hoje), hoje.length >= 3);
    const dNovo = desfecho(paginas, citadas, (p) => candidatosDoGrifo(f, p).some((t) => casa(p, t)), candidatosDoGrifo(f, citadas[0] ?? null).length > 0);
    // Cobertura POR PÁGINA CITADA: em quantas das páginas do achado o visor
    // grifa algo ao abrir nela ("Abrir p. 22", ou andar pela régua).
    for (const p of citadas) {
      cobertura.paginas += 1;
      if (casa(p, hoje)) cobertura.hoje += 1;
      if (candidatosDoGrifo(f, p).some((t) => casa(p, t))) cobertura.novo += 1;
    }
    total.hoje.set(dHoje, (total.hoje.get(dHoje) ?? 0) + 1);
    total.novo.set(dNovo, (total.novo.get(dNovo) ?? 0) + 1);
    if (dNovo !== "primeira" && exemplos.length < 25) exemplos.push(`${parecer.split("/")[2]} ${f.id} [${f.origem ?? "ia"}] p.${f.pagina} hoje=${dHoje} novo=${dNovo} | ${(f.evidencia ?? "").slice(0, 110).replace(/\s+/g, " ")}`);
  }
}

const ordem: Desfecho[] = ["primeira", "outra-citada", "nao-citada", "nenhuma", "sem-grifo"];
const n = [...total.hoje.values()].reduce((a, b) => a + b, 0);
console.log(`\n${n} achados`);
console.log("desfecho".padEnd(14), "hoje".padStart(6), "novo".padStart(6));
for (const d of ordem) console.log(d.padEnd(14), String(total.hoje.get(d) ?? 0).padStart(6), String(total.novo.get(d) ?? 0).padStart(6));
console.log(`\npáginas citadas com grifo: hoje ${cobertura.hoje}/${cobertura.paginas}, novo ${cobertura.novo}/${cobertura.paginas}`);
console.log("\nainda fora da 1ª página citada (novo):");
for (const e of exemplos) console.log(" ", e);
