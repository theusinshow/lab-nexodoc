// O suporte: as regras que decidem o que vira chamado, o que agrupa e o que avisa.
//
//   node scripts/test-suporte.ts   (== npm run test:suporte)
//
// O caso que carrega o desenho: O MESMO ERRO NÃO INUNDA. A segunda ocorrência
// soma no chamado aberto e não manda e-mail; só os marcos (10, 100, 1000) e a
// reabertura de um resolvido voltam a avisar.
import { criarTrilha, rotuloDoClique, LIMITE_DA_TRILHA } from "../lib/suporte/trilha.ts";
import { caminhoMesmaOrigem, formatarProtocolo, limparContexto, normalizarRota, projetoDaRota } from "../lib/suporte/comum.ts";
import { decidirOcorrencia, ehMarco, impressaoDoErro, podeAbrirManual } from "../lib/suporte/regras.ts";
import { guardarPendente, tirarPendentes, TETO_DA_FILA, type Armazem } from "../lib/suporte/fila-local.ts";

let falhas = 0;
function check(nome: string, ok: boolean, detalhe = "") {
  if (ok) console.log(`  OK      ${nome}`);
  else {
    falhas++;
    console.error(`  FALHOU  ${nome}${detalhe ? ` :: ${detalhe}` : ""}`);
  }
}

// rota
check("tira query e hash", normalizarRota("/projetos?x=1#a") === "/projetos", normalizarRota("/projetos?x=1#a"));
check("cuid vira :id", normalizarRota("/projetos/cmg1x2y3z4a5b6c7d8e9f0g1h/achados") === "/projetos/:id/achados");
check("uuid vira :id", normalizarRota("/api/audits/3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f") === "/api/audits/:id");
check("número vira :id", normalizarRota("/api/ld/42") === "/api/ld/:id");
check("barra final some", normalizarRota("/ajuda/") === "/ajuda");
check("raiz continua raiz", normalizarRota("/") === "/");
check("URL absoluta vira caminho", normalizarRota("https://nexo.app/api/x?y=1") === "/api/x");
check("palavra comum fica", normalizarRota("/admin/suporte") === "/admin/suporte");

check("mesma origem dá caminho", caminhoMesmaOrigem("/api/x?a=1", "https://n.app") === "/api/x");
check("outra origem é null", caminhoMesmaOrigem("https://outro.com/api/x", "https://n.app") === null);
check("projeto da rota", projetoDaRota("/projetos/abc123/achados") === "abc123");
check("sem projeto", projetoDaRota("/ajuda") === null);
check("protocolo com 4 dígitos", formatarProtocolo(42) === "#0042");
check("protocolo grande não corta", formatarProtocolo(12345) === "#12345");

// contexto
const sujo = limparContexto({
  trilha: [...Array(50)].map((_, i) => ({ t: i, tipo: "clique", texto: "x".repeat(900) })).concat([{ t: 1, tipo: "hack", texto: "y" } as never]),
  navegador: "N".repeat(1000),
  viewport: "1280×800",
  projeto: 7,
  extra: "fora",
});
check("trilha limitada a 30", sujo.trilha.length === 30, String(sujo.trilha.length));
check("tipo inválido some", sujo.trilha.every((p) => p.tipo === "clique"));
check("texto do passo cortado em 300", sujo.trilha[0].texto.length === 300);
check("navegador cortado em 300", sujo.navegador?.length === 300);
check("projeto não-string some", sujo.projeto === undefined);
check("campo desconhecido some", !("extra" in sujo));
check("lixo vira contexto vazio", limparContexto("lixo").trilha.length === 0);

// trilha
const t = criarTrilha();
for (let i = 0; i < 40; i++) t.registrar({ tipo: "rota", texto: `/r${i}` });
const lidos = t.ler();
check("anel guarda só os últimos 30", lidos.length === LIMITE_DA_TRILHA && lidos[0].texto === "/r10", lidos[0]?.texto);
lidos[0].texto = "mexido";
check("ler devolve cópia", t.ler()[0].texto === "/r10");

type Falso = { tagName: string; textContent: string | null; getAttribute(n: string): string | null; closest(s: string): Falso | null };
const el = (tag: string, attrs: Record<string, string>, texto: string | null): Falso => ({
  tagName: tag,
  textContent: texto,
  getAttribute: (n: string) => attrs[n] ?? null,
  closest: () => (["BUTTON", "A"].includes(tag) || attrs.role === "button" ? el(tag, attrs, texto) : null),
});
check("botão usa aria-label", rotuloDoClique(el("BUTTON", { "aria-label": "Enviar" }, "→")) === "botão: Enviar");
check("botão usa texto", rotuloDoClique(el("BUTTON", {}, "  Salvar   rascunho ")) === "botão: Salvar rascunho");
check("link usa texto", rotuloDoClique(el("A", {}, "Projetos")) === "link: Projetos");
check("campo nunca é rotulado", rotuloDoClique(el("INPUT", { value: "segredo" }, null)) === null);
check("div solta não conta", rotuloDoClique(el("DIV", {}, "texto")) === null);
check("null é null", rotuloDoClique(null) === null);

// regras
const a = impressaoDoErro({ rota: "/api/audits/cmg1x2y3z4a5b6c7d8e9f0g1h", nome: "TypeError", mensagem: "timeout after 3012ms\n at x" });
const b = impressaoDoErro({ rota: "/api/audits/cmh9x9y9z9a9b9c9d9e9f9g9h", nome: "TypeError", mensagem: "timeout after 18ms\n at y" });
const c = impressaoDoErro({ rota: "/api/audits/cmh9x9y9z9a9b9c9d9e9f9g9h", nome: "RangeError", mensagem: "timeout after 18ms" });
check("mesmo erro em ids e números diferentes agrupa", a === b);
check("nome diferente separa", a !== c);
check("impressão é sha1 hex", /^[0-9a-f]{40}$/.test(a));

check("1 é marco", ehMarco(1));
check("10, 100, 1000 são marcos", ehMarco(10) && ehMarco(100) && ehMarco(1000));
check("2, 11, 50 não são", !ehMarco(2) && !ehMarco(11) && !ehMarco(50));
check("0 não é marco", !ehMarco(0));

const novo = decidirOcorrencia(null);
check("sem existente cria e avisa", novo.acao === "criar" && novo.ocorrencias === 1 && novo.avisar && novo.motivo === "novo");
const segunda = decidirOcorrencia({ status: "ABERTO", ocorrencias: 1 });
check("segunda soma calada", segunda.acao === "somar" && segunda.ocorrencias === 2 && !segunda.avisar);
const decima = decidirOcorrencia({ status: "EM_ANALISE", ocorrencias: 9 });
check("décima avisa como marco", decima.acao === "somar" && decima.avisar && decima.motivo === "marco");
const volta = decidirOcorrencia({ status: "RESOLVIDO", ocorrencias: 4 });
check("resolvido que volta reabre e avisa", volta.acao === "reabrir" && volta.ocorrencias === 5 && volta.avisar && volta.motivo === "reaberto");

check("9 na hora pode", podeAbrirManual(9));
check("10 na hora não pode", !podeAbrirManual(10));

// fila local
const mapa = new Map<string, string>();
const armazem: Armazem = { getItem: (k) => mapa.get(k) ?? null, setItem: (k, v) => void mapa.set(k, v), removeItem: (k) => void mapa.delete(k) };
for (let i = 0; i < 8; i++) guardarPendente(armazem, { rota: "/api/suporte/erro", corpo: { i }, em: i });
const tirados = tirarPendentes(armazem);
check("fila guarda só os últimos 5", tirados.length === TETO_DA_FILA && (tirados[0].corpo as { i: number }).i === 3);
check("tirar esvazia", tirarPendentes(armazem).length === 0);
mapa.set("nexo:suporte:pendentes", "{lixo");
check("fila corrompida não lança", tirarPendentes(armazem).length === 0);
check("sem armazém não lança", (guardarPendente(null, { rota: "x", corpo: 1, em: 1 }), tirarPendentes(null).length === 0));
const quebrado: Armazem = {
  getItem: () => {
    throw new Error("bloqueado");
  },
  setItem: () => {
    throw new Error("bloqueado");
  },
  removeItem: () => {},
};
check("armazém que lança não lança", (guardarPendente(quebrado, { rota: "x", corpo: 1, em: 1 }), tirarPendentes(quebrado).length === 0));

if (falhas > 0) {
  console.error(`\n${falhas} falha(s).`);
  process.exit(1);
}
console.log("\nTudo certo.");
