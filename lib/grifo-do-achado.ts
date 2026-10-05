/**
 * O QUE O VISOR PROCURA NA PÁGINA PARA GRIFAR — em ordem de preferência.
 *
 * O DEFEITO QUE ISTO SUBSTITUI (05/10/2026)
 *
 * O visor procurava UM texto só (`getHighlightNeedle`): o `termo_busca` (que cai
 * na evidência inteira quando falta) ou uma citação entre aspas do conflito. E
 * procurava o MESMO texto em toda página do achado. Três consequências:
 *
 *  - achado entre páginas ("Pág. 10: … | Pág. 22: …") abria a p. 22 procurando
 *    o trecho da p. 10, e não grifava nada;
 *  - evidência que abre com moldura ("Pág. 17: "…", "Fichas dos ambientes:")
 *    não casa — a moldura não está na folha, e `marcacaoDoTrecho` só encurta
 *    pela DIREITA;
 *  - evidência que o modelo costurou com "…" (dois pedaços não contíguos)
 *    também não casa inteira, e o prefixo dela às vezes é curto demais.
 *
 * Agora sai uma LISTA, e o visor fica com o primeiro que casar na página. Cada
 * candidato continua passando pela costura de `marcacaoDoTrecho`, com o mesmo
 * piso de duas palavras — a lista amplia o que se procura, não afrouxa o
 * critério de quando se marca.
 *
 * Puro: sem pdf.js, sem DOM. Medido por `npm run mede:grifo`.
 */
import { trechosDaEvidencia } from "./trechos-da-evidencia.ts";

/** O mínimo que o grifo lê do achado — serve ao `AuditFinding` e ao estruturado da tela. */
export interface AchadoParaGrifar {
  termo_busca?: string | null;
  termoBusca?: string | null;
  evidencia?: string | null;
  conflito?: string | null;
}

/** Abaixo disto o pedaço não diz onde está — a mesma régua de `marcacaoDoTrecho`. */
const MIN_PALAVRAS = 2;
const MIN_LETRAS = 4;

/** Tira a moldura do começo ("Pág. 17:", "Fichas dos ambientes:") e as aspas. */
function semMoldura(texto: string): string {
  return texto
    .trim()
    .replace(/^P[áa]g\.?\s*\d{1,4}\s*:\s*/i, "")
    .replace(/^[A-Za-zÀ-ú ]{3,40}:\s*(?=["“])/, "")
    .replace(/^["“'‘]+|["”'’]+$/g, "")
    .trim();
}

/** Os pedaços contíguos de uma citação costurada com "…", "..." ou " | ". */
function pedacos(texto: string): string[] {
  return texto
    .split(/\s*(?:…|\.{3}|\s\|\s|\[\.\.\.\])\s*/)
    .map(semMoldura)
    .filter(Boolean);
}

function valeComoAgulha(texto: string): boolean {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const letras = texto.replace(/\s/g, "").length;
  return letras >= MIN_LETRAS && (palavras.length >= MIN_PALAVRAS || letras >= 6);
}

/**
 * Os textos a procurar na página `pagina`, do mais específico para o mais
 * largo. `pagina` nula = o achado inteiro (sem preferência de trecho).
 */
export function candidatosDoGrifo(achado: AchadoParaGrifar, pagina: number | null): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  const pôr = (texto: string | null | undefined) => {
    const t = semMoldura(texto ?? "");
    const chave = t.toLowerCase();
    if (!t || vistos.has(chave) || !valeComoAgulha(t)) return;
    vistos.add(chave);
    saida.push(t);
  };

  const trechos = trechosDaEvidencia(achado.evidencia);
  const porPagina = trechos.filter((t) => t.pagina !== null);

  // 1. O trecho DESTA página, quando a evidência é um confronto entre páginas.
  if (pagina !== null) for (const t of porPagina) if (t.pagina === pagina) pôr(t.texto);

  // 2. O termo que o auditor escolheu para a busca.
  pôr(achado.termo_busca ?? achado.termoBusca);

  // 3. As citações entre aspas do conflito.
  for (const m of (achado.conflito ?? "").matchAll(/["“]([^"”]{3,160})["”]/g)) pôr(m[1]);

  // 4. A evidência: inteira sem moldura, depois cada pedaço contíguo dela.
  //    No confronto, só os trechos das OUTRAS páginas ficam de fora quando há
  //    página pedida — grifar na p. 22 o texto da p. 10 seria marca errada.
  const daqui = pagina === null || porPagina.length === 0 ? trechos : trechos.filter((t) => t.pagina === pagina || t.pagina === null);
  for (const t of daqui) {
    // As citações da própria evidência: a IA junta trechos de páginas
    // diferentes como `“A” / “B” / “C”`, e cada um mora numa folha.
    for (const m of t.texto.matchAll(/[“"]([^”"]{3,400})[”"]/g)) {
      pôr(m[1]);
      for (const p of pedacos(m[1])) pôr(p);
    }
    pôr(t.texto);
    for (const p of pedacos(t.texto)) pôr(p);
  }

  return saida;
}
