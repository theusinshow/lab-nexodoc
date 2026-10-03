/**
 * Disciplina → sigla de três letras e cor do canvas.
 *
 * A REGRA, do sistema de design: o código mono de três letras é o portador
 * PRIMÁRIO; a cor é secundária. Nenhuma decisão do produto pode depender só da
 * cor — quem não distingue matiz continua lendo "ARQ" e "EST".
 *
 * São oito cores para vinte e três códigos do léxico do escritório, e isso é de
 * propósito: agrupar por família (tudo que é terra numa cor, tudo que é
 * instalação elétrica noutra) mantém a escala legível. O que não casa fica SEM
 * cor — inventar um tom para cada código faria a paleta competir com os três
 * sinais de status, que é justamente o que a escala categórica não pode fazer.
 *
 * PURO e sem imports: dá para testar no node cru.
 */

/** Normaliza para comparação: minúsculas, sem acento. */
function normalizar(valor: string): string {
  return valor
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Famílias, na ordem de teste. A primeira que casar vence. */
/*
 * `siglas`: o carimbo muitas vezes traz SÓ a sigla ("EST", "FND"), e nenhum dos
 * termos por extenso casava — o quadradinho da disciplina saía cinza (03/10/2026).
 * A sigla exata casa a família.
 *
 * FUNDAÇÕES TEM COR PRÓPRIA (03/10/2026): é do grupo estrutural, mas o volume
 * do estrutural abre com ela (017-26: 4 de FND e 24 de EST no mesmo PDF), e com
 * a mesma cor os dois blocos não se separavam no mapa.
 */
const FAMILIAS: { sigla: string; token: string; termos: string[]; siglas?: string[] }[] = [
  { sigla: "ARQ", token: "arq", termos: ["arquitet"] },
  { sigla: "FND", token: "fnd", termos: ["fundac"], siglas: ["fnd"] },
  {
    sigla: "EST",
    token: "est",
    termos: ["estrutur", "forma", "metalic"],
    siglas: ["est", "met", "cnc"],
  },
  { sigla: "HID", token: "hid", termos: ["hidro", "hidros", "agua", "sanitar"], siglas: ["hid", "his"] },
  {
    sigla: "ELE",
    token: "ele",
    termos: ["eletric", "eletr", "cabeament", "cftv", "spda"],
    siglas: ["ele", "elt", "spd", "cft"],
  },
  { sigla: "PCI", token: "pci", termos: ["incendio", "preventivo", "ppci"], siglas: ["pci", "inc"] },
  { sigla: "CLI", token: "cli", termos: ["climatiz", "gases", "medicinais"], siglas: ["cli"] },
  {
    sigla: "TER",
    token: "ter",
    termos: [
      "terraplen",
      "drenagem",
      "pavimenta",
      "topografia",
      "sondagem",
      "geometric",
      "levantament",
    ],
    siglas: ["ter", "dre", "pav", "top", "snd", "gmt"],
  },
  { sigla: "PAI", token: "pai", termos: ["paisag", "urbanis"], siglas: ["pai"] },
];

/** Sigla de três letras. Sem família conhecida, as três primeiras do rótulo. */
export function siglaDaDisciplina(disciplina: string | null | undefined): string {
  const valor = normalizar(disciplina ?? "");
  if (!valor) return "";
  /*
   * As `siglas` da família NÃO entram aqui, só na cor: o código do carimbo
   * ("met", "his", "inc") é o que a barra lateral e o canvas mostram, e casá-lo
   * na família trocaria o nome do volume ("MET · HIS · INC" virava
   * "EST · HID · PCI"). Ver `scripts/test-pasta-do-projeto.ts`.
   */
  for (const familia of FAMILIAS) {
    if (familia.termos.some((t) => valor.startsWith(t) || valor.includes(t))) {
      return familia.sigla;
    }
  }
  return valor.slice(0, 3).toLocaleUpperCase("pt-BR");
}

/**
 * A variável CSS da cor, ou `null` quando a disciplina não pertence a nenhuma
 * das oito famílias — sem cor é melhor que cor errada.
 */
export function corDaDisciplina(
  disciplina: string | null | undefined,
): string | null {
  const valor = normalizar(disciplina ?? "");
  if (!valor) return null;
  for (const familia of FAMILIAS) {
    if (familia.siglas?.includes(valor) || familia.termos.some((t) => valor.startsWith(t) || valor.includes(t))) {
      return `var(--discipline-${familia.token})`;
    }
  }
  return null;
}
