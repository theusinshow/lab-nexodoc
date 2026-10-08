/**
 * O GRIFO APROXIMADO VALE A PENA? Medido antes de construir (08/10/2026).
 *
 *   node scripts/mede-grifo-aproximado.ts   (== npm run mede:grifo-aproximado)
 *
 * Quando nenhum candidato casa exato na página (`marcacaoDoTrecho`), o visor
 * diz "não grifou". A ideia era procurar o trecho MAIS PARECIDO e marcá-lo
 * com contorno tracejado. O risco é o defeito de agosto: marca no lugar
 * errado com cara de certa. Então se medem os dois lados, sem token:
 *
 *  - IMPOSTORES: para cada achado que casa exato na página P, a melhor nota
 *    aproximada dos candidatos dele em OUTRAS páginas (onde o trecho não
 *    está). É a nota que um acerto falso tiraria.
 *  - FALTANTES: as páginas citadas onde o exato falha; a melhor nota
 *    aproximada lá, e o trecho que ela marcaria.
 *
 * A nota é a fração das palavras do candidato que aparecem NA ORDEM numa
 * janela da página (LCS de palavras ÷ palavras do candidato). *
 * RESULTADO (08/10/2026, 117-25 + 113-22) — NÃO CONSTRUIR:
 *  - faltantes: 24 páginas citadas sem grifo exato; só 1 tem trecho parecido
 *    de verdade (117-25 INC-036 p.62, 0,85). Nas outras 23 o texto citado não
 *    está na página (paráfrase da IA, página errada, citação curta demais).
 *  - impostores: 12 de 173 tiram 1,00 em página onde o casamento exato não
 *    acha o trecho. Um corte que pegasse a 1 (≥ 0,85) marcaria 12 erradas.
 * O aviso "não grifou" (`porQueSemGrifo`) continua sendo a resposta honesta.
 */
import fs from "node:fs";

import { candidatosDoGrifo } from "../lib/grifo-do-achado.ts";
import { marcacaoDoTrecho } from "../lib/marcacao-do-trecho.ts";
import { paginasDoAchado } from "../lib/paginas-do-achado.ts";
import type { ItemDeTexto } from "../lib/texto-do-pdf.ts";

type Achado = { id: string; pagina?: string; referencia_comparada?: string; termo_busca?: string; evidencia?: string; conflito?: string; origem?: string };

const PARES: [string, string][] = [
  ["docs/benchmarks/117-25/parecer-nexodoc-2026-09-24-controle-56.json", "docs/samples/117-25/1_memorial/117_25_md_geral_a.pdf"],
  ["docs/benchmarks/113-22/parecer-nexodoc-2026-08-18.json", "docs/samples/113-22/1_memorial/113_22_md_geral_a.pdf"],
];

const palavras = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 2);

function lcs(a: string[], b: string[]): number {
  let ant = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? ant[j - 1] + 1 : Math.max(ant[j], cur[j - 1]);
    ant = cur;
  }
  return ant[b.length];
}

/** A melhor janela da página para o candidato: nota e o texto da janela. */
function melhor(cand: string[], pagina: string[]): { nota: number; janela: string } {
  if (cand.length < 3 || !pagina.length) return { nota: 0, janela: "" };
  const tam = Math.ceil(cand.length * 1.3);
  let best = { nota: 0, janela: "" };
  for (let i = 0; i < Math.max(1, pagina.length - cand.length + 1); i++) {
    const janela = pagina.slice(i, i + tam);
    const nota = lcs(cand, janela) / cand.length;
    if (nota > best.nota) best = { nota, janela: janela.join(" ") };
  }
  return best;
}

async function lerPdf(arquivo: string): Promise<ItemDeTexto[][]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(arquivo)), disableWorker: true } as never).promise;
  const paginas: ItemDeTexto[][] = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const c = await (await doc.getPage(n)).getTextContent();
    paginas.push(c.items.filter((i) => typeof (i as { str?: unknown }).str === "string") as unknown as ItemDeTexto[]);
  }
  return paginas;
}

const impostores: number[] = [];
const faltantes: { onde: string; nota: number; cand: string; janela: string }[] = [];

for (const [parecer, pdf] of PARES) {
  const j = JSON.parse(fs.readFileSync(parecer, "utf8"));
  const achados: Achado[] = (j.report ?? j).incongruencias ?? [];
  const itens = await lerPdf(pdf);
  const textoDa = itens.map((pg) => palavras(pg.map((i) => i.str).join(" ")));
  const casa = (p: number, t: string) => Boolean(itens[p - 1]) && marcacaoDoTrecho(itens[p - 1], t).size > 0;
  const doc = parecer.split("/")[2];

  for (const f of achados) {
    const citadas = paginasDoAchado({ pagina: f.pagina, referencia: f.referencia_comparada });
    for (const p of citadas) {
      if (!itens[p - 1]) continue;
      const cands = candidatosDoGrifo(f, p);
      const exato = cands.find((t) => casa(p, t));
      if (exato) {
        // O impostor: o MESMO candidato que casou, procurado nas páginas onde ele não está.
        const c = palavras(exato);
        if (c.length < 3) continue;
        let pior = 0;
        for (let q = 1; q <= itens.length; q++) {
          if (q === p || casa(q, exato)) continue;
          pior = Math.max(pior, melhor(c, textoDa[q - 1]).nota);
        }
        impostores.push(pior);
      } else {
        let best = { nota: 0, janela: "", cand: "" };
        for (const t of cands) {
          const m = melhor(palavras(t), textoDa[p - 1]);
          if (m.nota > best.nota) best = { ...m, cand: t };
        }
        faltantes.push({ onde: `${doc} ${f.id} p.${p} [${f.origem ?? "ia"}]`, nota: best.nota, cand: best.cand, janela: best.janela });
      }
    }
  }
}

const faixa = (xs: number[], lim: number) => xs.filter((x) => x >= lim).length;
impostores.sort((a, b) => b - a);
console.log(`\nIMPOSTORES (achado que casa exato, procurado nas outras páginas): ${impostores.length}`);
for (const lim of [0.6, 0.7, 0.8, 0.85, 0.9, 0.95]) console.log(`  nota ≥ ${lim}: ${faixa(impostores, lim)}`);
console.log(`  as 10 maiores: ${impostores.slice(0, 10).map((x) => x.toFixed(2)).join(" ")}`);

faltantes.sort((a, b) => b.nota - a.nota);
console.log(`\nFALTANTES (página citada sem grifo exato): ${faltantes.length}`);
for (const lim of [0.6, 0.7, 0.8, 0.85, 0.9, 0.95]) console.log(`  nota ≥ ${lim}: ${faixa(faltantes.map((f) => f.nota), lim)}`);
console.log("");
for (const f of faltantes) {
  console.log(`  ${f.nota.toFixed(2)}  ${f.onde}`);
  console.log(`        procura: ${f.cand.slice(0, 120).replace(/\s+/g, " ")}`);
  console.log(`        acharia: ${f.janela.slice(0, 120)}`);
}
