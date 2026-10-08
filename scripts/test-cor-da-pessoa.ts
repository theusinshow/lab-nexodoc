// A cor do avatar: grupo técnico, e um anel para quem administra.
//
//   node scripts/test-cor-da-pessoa.ts   (== npm run test:cor-da-pessoa)
//
// O caso que carrega o desenho: ADMIN NÃO TROCA A COR. A pessoa continua na cor
// da equipe dela; ser admin só acrescenta o anel (e vermelho não aparece em
// lugar nenhum, porque vermelho é "bloqueia" nos achados).
import { corDaPessoa } from "../lib/cor-da-pessoa.ts";

let falhas = 0;
function check(nome: string, ok: boolean, detalhe = "") {
  if (ok) console.log(`  OK      ${nome}`);
  else {
    falhas++;
    console.error(`  FALHOU  ${nome}${detalhe ? ` :: ${detalhe}` : ""}`);
  }
}

check("arquitetura e azul (arq)", corDaPessoa({ grupo: "arquitetura", role: "MEMBER" }).tom === "arq");
check("estrutural e est", corDaPessoa({ grupo: "estrutural", role: "MEMBER" }).tom === "est");
check("complementares e comp", corDaPessoa({ grupo: "complementares", role: "MEMBER" }).tom === "comp");
check("grupo com caixa e espaco ainda casa", corDaPessoa({ grupo: " Arquitetura ", role: "MEMBER" }).tom === "arq");

const admArq = corDaPessoa({ grupo: "arquitetura", role: "ADMIN" });
check("admin de arquitetura continua azul", admArq.tom === "arq" && admArq.admin);
check("dono do escritorio tambem e admin", corDaPessoa({ grupo: null, role: "OWNER" }).admin);
check("a dica diz grupo e papel", admArq.rotulo === "Arquitetura · admin", String(admArq.rotulo));

for (const grupo of ["orcamento", "externo", "diretoria", "", null]) {
  check(`grupo ${JSON.stringify(grupo)} fica no cinza`, corDaPessoa({ grupo, role: "MEMBER" }).tom === null);
}
check("diretor admin sem cor de grupo ainda ganha o anel", corDaPessoa({ grupo: "diretoria", role: "ADMIN" }).admin);
check("pessoa desconhecida: cinza, sem anel, sem dica", (() => {
  const c = corDaPessoa(undefined);
  return c.tom === null && !c.admin && c.rotulo === null;
})());

if (falhas > 0) {
  console.error(`\n${falhas} falha(s).`);
  process.exit(1);
}
console.log("\nTudo certo.");
