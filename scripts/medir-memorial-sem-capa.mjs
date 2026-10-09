// O 040-26 DE PONTA A PONTA, sem banco e sem IA (09/10/2026): a disciplina sem
// capa antes e depois do geral. Ver
// docs/superpowers/specs/2026-10-09-memorial-sem-capa-design.md.
//
//   npm run medir:memorial-sem-capa
import { existsSync, readFileSync } from "node:fs";

const DISCIPLINA = "docs/samples/040-26/estrutural_concreto/040_26_est_md_a.pdf";
const GERAL = "docs/samples/040-26/1_memorial/040_26_md_geral_a.pdf";
for (const f of [DISCIPLINA, GERAL]) {
  if (!existsSync(f)) {
    console.warn(`pulando: falta ${f}`);
    process.exit(0);
  }
}

const { classifyDocuments } = await import("../server/nexo/classify-documents.ts");
const { aplicarEscadaAoDossie } = await import("../modules/nexo/lib/dossie-com-projeto.ts");
const { aplicarGravacao, conferirAuditoria, lerIdentidadeDoProjeto } = await import("../lib/identidade-do-projeto.ts");
const { camposDaCapaNoDossie } = await import("../modules/nexo/lib/identidade-no-projeto.ts");

const ler = async (f, projeto = null) =>
  aplicarEscadaAoDossie(await classifyDocuments([{ fileName: f.split("/").pop(), buffer: readFileSync(f) }]), projeto);
const falha = (msg) => {
  console.error(`FALHOU  ${msg}`);
  process.exit(1);
};
const EM = new Date().toISOString();

const antes = await ler(DISCIPLINA);
console.log("1. disciplina sozinha:", antes.obra, antes.origens?.obra, "código", antes.codigo);
console.log("   sinais:", antes.arquivos[0].sinais);
if (antes.codigo !== "040-26") falha(`o código tinha de vir do nome do arquivo, veio ${antes.codigo}`);
if (antes.origens?.obra?.origem !== "corpo") falha("sem projeto, a obra é sugestão do corpo");
if (!antes.arquivos[0].sinais.some((s) => s.startsWith("código do corpo (125-23)"))) falha("faltou o sinal do 125-23");

const geral = await ler(GERAL);
const campos = camposDaCapaNoDossie(geral);
console.log("2. capa do geral sobe:", campos);
const projeto = aplicarGravacao(lerIdentidadeDoProjeto(null), { origem: "capa", fonte: "040_26_md_geral_a.pdf p.1", em: EM, campos });
if (!projeto.obraDaCapa) falha("a capa do geral não trouxe a obra");

const c = conferirAuditoria(antes.obra, projeto.obraDaCapa, EM);
console.log("3. auditoria da disciplina × capa do geral:", c.estado);
if (c.estado !== "diverge") falha("o 040-26 tinha de divergir");

const depois = await ler(DISCIPLINA, projeto.identidade);
console.log("4. disciplina com o projeto conhecido:", depois.obra, depois.origens?.obra, "| município", depois.municipio, depois.origens?.municipio);
if (depois.origens?.obra?.origem !== "projeto") falha("a obra tinha de vir do projeto");
if (depois.municipio !== "Chapecó") falha("o município tinha de vir do projeto");
console.log("\nok");
