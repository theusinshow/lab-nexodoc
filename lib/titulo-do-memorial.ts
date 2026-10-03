/**
 * O TÍTULO DO MEMORIAL pelo nome do arquivo, na língua da tela:
 * `117_25_md_geral_a.pdf` → "Memorial geral, revisão A".
 *
 * O escritório nomeia o memorial como `<obra>_<ano>_md_<parte>_<revisão>`; o
 * lab mostra o título assim no painel da auditoria e no resultado. Só se
 * afirma o que o nome diz: sem `md`, é "Memorial descritivo"; sem a letra da
 * revisão, o título sai sem ela. Mesma regra de corte da revisão que a chave do
 * documento (`chaveDoDocumento` em lib/elegibilidade-da-base.ts).
 *
 * PURO.
 */
export function tituloDoMemorial(arquivo: string): string {
  const tokens = arquivo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\.[a-z0-9]+$/, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const corte = tokens.findIndex((t) => /^[a-z]$/.test(t) || /^r(ev|\d+)$/.test(t));
  const revisao = corte >= 0 && /^[a-z]$/.test(tokens[corte]) ? tokens[corte].toUpperCase() : null;
  const md = tokens.indexOf("md");
  const parte = md >= 0 ? tokens.slice(md + 1, corte >= 0 ? corte : undefined).filter((t) => !/^\d+$/.test(t)).join(" ") : "";
  const nome = parte ? `Memorial ${parte}` : "Memorial descritivo";
  return revisao ? `${nome}, revisão ${revisao}` : nome;
}
