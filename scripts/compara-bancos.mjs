// Confere uma cópia de banco: conta as linhas de cada tabela nos dois lados.
//
//   node scripts/compara-bancos.mjs "<url de origem>" "<url de destino>"
//
// Feito para a migração Neon → Railway (docs/migracao-railway.md). Só LÊ os
// dois bancos. Sai com status 1 se alguma tabela não bater.
import pg from "pg";

const [origem, destino] = process.argv.slice(2);
if (!origem || !destino) {
  console.error('Uso: node scripts/compara-bancos.mjs "<url de origem>" "<url de destino>"');
  process.exit(1);
}

async function contagens(url) {
  const cliente = new pg.Client({ connectionString: url });
  await cliente.connect();
  try {
    const tabelas = await cliente.query(
      `select tablename from pg_tables where schemaname = 'public' order by tablename`,
    );
    const resultado = new Map();
    for (const { tablename } of tabelas.rows) {
      const r = await cliente.query(`select count(*)::int as n from "public"."${tablename}"`);
      resultado.set(tablename, r.rows[0].n);
    }
    return resultado;
  } finally {
    await cliente.end();
  }
}

const [a, b] = await Promise.all([contagens(origem), contagens(destino)]);
const nomes = [...new Set([...a.keys(), ...b.keys()])].sort();
let diferentes = 0;
for (const nome of nomes) {
  const na = a.get(nome);
  const nb = b.get(nome);
  const ok = na === nb;
  if (!ok) diferentes++;
  console.log(`${ok ? "  ok " : "  ✗  "} ${nome.padEnd(32)} ${String(na ?? "—").padStart(7)} ${String(nb ?? "—").padStart(7)}`);
}
console.log(diferentes === 0 ? `\nAs ${nomes.length} tabelas batem.` : `\n${diferentes} tabela(s) não batem.`);
process.exit(diferentes === 0 ? 0 : 1);
