/**
 * A GRAFIA ERRADA QUE SE REPETE — 07/10/2026.
 *
 * O modelo lê o memorial por blocos e aponta "CMB" (no lugar de "CBM") no
 * bloco em que reparou. A mesma sigla trocada estava em outras páginas, e o
 * parecer dizia uma página só: quem corrigia aquela ocorrência emitia o
 * documento com as outras. Encontrar TODAS as ocorrências de um termo exato é
 * trabalho de software, não de leitura — o prompt já avisa o modelo disso
 * (`prompts-da-leitura.ts`: "isso é trabalho do software, não seu").
 *
 * O QUE FAZ: para cada achado de texto em que dá para ler o par
 * termo-errado → termo-certo, procura o termo errado em todas as páginas do
 * mesmo arquivo e estende o MESMO achado com as páginas onde ele aparece. Uma
 * decisão ("trocar CMB por CBM") resolve todas, então é um achado com várias
 * páginas, e o visor folheia entre elas. Achados do mesmo par que o modelo
 * tenha dado separados se juntam no primeiro — nenhuma página se perde.
 *
 * O QUE NÃO FAZ, de propósito: concordância e acento. "realizada" → "realizado"
 * e "esta" → "está" estão erradas NAQUELA frase e certas em outras; varrer o
 * documento atrás delas marcaria texto correto. Por isso só entram siglas e
 * palavras longas com erro de letra que não seja só a terminação nem só o acento.
 *
 * Puro: sem IO, sem `@/`. Testado em `scripts/test-grafia-repetida.ts`.
 */
import type { AuditFinding } from "./audit-report.ts";

export interface PaginaDeTexto {
  page: number;
  text: string;
}

/** O par lido do achado. */
export interface TrocaDeGrafia {
  errado: string;
  certo: string;
  sigla: boolean;
}

const TEXTO = /\b(?:grafia|ortograf|acentua|digitac|portugues|palavra trocada|gramat|sigla|redacao|erro de digitacao|abreviatura)/;
/** Quantos trechos novos entram na evidência; o resto só na lista de páginas. */
const MAX_TRECHOS = 12;

function semAcento(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function distancia(a: string, b: string): number {
  const linha = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0];
    linha[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = linha[j];
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = guardado;
    }
  }
  return linha[b.length];
}

function escapar(texto: string) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function padraoDe(troca: TrocaDeGrafia) {
  // Fronteira por letra/dígito e não `\b`: `\b` do JS não conhece acento.
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapar(troca.errado)}(?![\\p{L}\\p{N}])`, troca.sigla ? "gu" : "giu");
}

export function ehAchadoDeTexto(f: Pick<AuditFinding, "tipo" | "categoria">): boolean {
  return TEXTO.test(semAcento(`${f.tipo ?? ""} ${f.categoria ?? ""}`));
}

/** Os termos de uma palavra só que o achado cita: entre aspas, e siglas soltas. */
function termosCitados(texto: string): string[] {
  const termos: string[] = [];
  for (const m of texto.matchAll(/["“'‘«]([\p{L}\p{N}][\p{L}\p{N}-]{0,38})["”'’»]/gu)) termos.push(m[1]);
  for (const m of texto.matchAll(/(?<![\p{L}\p{N}])[A-Z][A-Z0-9]{1,9}(?![\p{L}\p{N}])/gu)) termos.push(m[0]);
  return termos;
}

/**
 * O par errado → certo, ou `null` quando o achado não diz um par seguro.
 *
 * Sem depender da frase do modelo ("trocar X por Y", "X → Y", "Y em vez de
 * X"): o ERRADO é o termo citado que está no trecho do documento; o CERTO é o
 * termo parecido com ele que não está.
 */
export function trocaDoAchado(f: Pick<AuditFinding, "evidencia" | "termo_busca" | "sugestao_correcao" | "conflito" | "descricao">): TrocaDeGrafia | null {
  const evidencia = f.evidencia ?? "";
  const citados = [...new Set(termosCitados([f.sugestao_correcao, f.conflito, f.descricao, f.termo_busca].filter(Boolean).join(" \n ")))];
  const termo = (f.termo_busca ?? "").trim();
  if (/^[\p{L}\p{N}-]{2,40}$/u.test(termo) && !citados.includes(termo)) citados.push(termo);

  const naEvidencia = (t: string, sigla: boolean) => padraoDe({ errado: t, certo: "", sigla }).test(evidencia);

  for (const errado of citados) {
    const sigla = /^[A-Z0-9]{3,10}$/.test(errado) && /[A-Z]/.test(errado);
    if (!naEvidencia(errado, sigla)) continue;
    for (const certo of citados) {
      if (certo === errado || naEvidencia(certo, sigla)) continue;
      if (sigla) {
        if (!/^[A-Z0-9]{2,10}$/.test(certo)) continue;
        if (distancia(errado, certo) > 2) continue;
        return { errado, certo, sigla: true };
      }
      if (errado.length < 6) continue;
      const a = semAcento(errado);
      const b = semAcento(certo);
      // Só acento: depende da frase ("esta"/"está").
      if (a === b) continue;
      if (distancia(a, b) > 2) continue;
      // Só a terminação (gênero, número, flexão): concordância, depende da frase.
      const raiz = Math.min(a.length, b.length) - 2;
      if (a.slice(0, raiz) === b.slice(0, raiz)) continue;
      return { errado, certo, sigla: false };
    }
  }
  return null;
}

function paginasDoCampo(pagina: string): number[] {
  return [...pagina.matchAll(/\d{1,4}/g)].map((m) => Number(m[0])).filter((n) => n > 0);
}

/** A linha do termo, curta: o bastante para o grifo achar o lugar na folha. */
function trechoEmVolta(texto: string, inicio: number, tamanho: number) {
  const plano = texto.replace(/\s+/g, " ");
  const antes = texto.slice(0, inicio).replace(/\s+/g, " ").length;
  const de = Math.max(0, plano.lastIndexOf(" ", Math.max(0, antes - 40)) + 1);
  const ate = plano.indexOf(" ", Math.min(plano.length, antes + tamanho + 40));
  return plano.slice(de, ate < 0 ? plano.length : ate).trim().replace(/"/g, "'");
}

export interface ResultadoDaVarredura {
  achados: AuditFinding[];
  /** Uma linha por achado estendido, para o log da auditoria. */
  notas: string[];
}

/**
 * Estende os achados de grafia com todas as páginas onde o termo errado aparece.
 * `paginasDo(arquivo)` devolve o texto das páginas do arquivo do achado.
 */
export function estenderGrafiaRepetida(
  achados: AuditFinding[],
  paginasDo: (arquivo: string | undefined) => readonly PaginaDeTexto[] | undefined,
): ResultadoDaVarredura {
  const notas: string[] = [];
  const porPar = new Map<string, AuditFinding>();
  const saida: AuditFinding[] = [];

  for (const achado of achados) {
    const troca = ehAchadoDeTexto(achado) ? trocaDoAchado(achado) : null;
    const paginas = troca ? paginasDo(achado.arquivo) : undefined;
    if (!troca || !paginas?.length) {
      saida.push(achado);
      continue;
    }

    const chave = `${achado.arquivo ?? ""}|${troca.errado}`;
    const anterior = porPar.get(chave);
    if (anterior) {
      // O modelo já deu outra ocorrência do mesmo par: ela vira página do
      // primeiro — inclusive a que a varredura não vê (folha lida por visão).
      anterior.pagina = [...new Set([...paginasDoCampo(anterior.pagina), ...paginasDoCampo(achado.pagina)])].sort((a, b) => a - b).join(", ");
      notas.push(`${achado.id} juntado a ${anterior.id} ("${troca.errado}" → "${troca.certo}")`);
      continue;
    }

    const ocorrencias = new Map<number, { quantas: number; trecho: string }>();
    for (const pagina of paginas) {
      const achadas = [...pagina.text.matchAll(padraoDe(troca))];
      if (!achadas.length) continue;
      ocorrencias.set(pagina.page, { quantas: achadas.length, trecho: trechoEmVolta(pagina.text, achadas[0].index ?? 0, troca.errado.length) });
    }

    const doAchado = paginasDoCampo(achado.pagina);
    const novas = [...ocorrencias.keys()].filter((p) => !doAchado.includes(p)).sort((a, b) => a - b);
    if (!novas.length) {
      const copia = { ...achado };
      porPar.set(chave, copia);
      saida.push(copia);
      continue;
    }

    const todas = [...new Set([...doAchado, ...ocorrencias.keys()])].sort((a, b) => a - b);
    const total = [...ocorrencias.values()].reduce((s, o) => s + o.quantas, 0);

    // A evidência vira o confronto por página (`Pág. N: "…" | …`), que a tela
    // já mostra lado a lado e o grifo já procura página a página.
    const principal = doAchado[0] ?? todas[0];
    const original = /^P[áa]g\.?\s*\d/i.test(achado.evidencia.trim()) ? achado.evidencia.trim() : `Pág. ${principal}: "${achado.evidencia.trim().replace(/^["“]|["”]$/g, "")}"`;
    const trechos = novas.slice(0, MAX_TRECHOS).map((p) => `Pág. ${p}: "${ocorrencias.get(p)!.trecho}"`);

    const listadas = novas.length > 15 ? `${novas.slice(0, 15).join(", ")} e mais ${novas.length - 15}` : novas.join(", ");
    const estendido: AuditFinding = {
      ...achado,
      pagina: todas.join(", "),
      evidencia: [original, ...trechos].join(" | "),
      descricao: `${achado.descricao.trim()} O mesmo "${troca.errado}" aparece também ${novas.length === 1 ? "na página" : "nas páginas"} ${listadas} — ${total} ${total === 1 ? "ocorrência" : "ocorrências"} no documento, todas a corrigir para "${troca.certo}".`,
    };
    porPar.set(chave, estendido);
    saida.push(estendido);
    notas.push(`${achado.id}: "${troca.errado}" → "${troca.certo}" em ${todas.length} página(s), ${total} ocorrência(s)`);
  }

  return { achados: saida, notas };
}
