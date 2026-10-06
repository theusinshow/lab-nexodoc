/**
 * O TRILHO DO TOMO (06/10/2026): tudo o que o canvas sabe de um tomo, num
 * estado só para desenhar — o cabeçalho, o nó do volume, as arestas e as folhas
 * leem daqui. Spec: docs/superpowers/specs/2026-10-06-canvas-da-montagem-design.md.
 *
 * PURO: só `import type`. `node scripts/test-nexo-trilho-do-tomo.ts`.
 */
import type { TomoMontado } from "./entrega-do-volume";
import type { FaseDaMontagem } from "./progresso-da-montagem";

export type EstadoDoTomo =
  | "incompleto"
  | "pronto-para-montar"
  | "montando"
  | "montado"
  | "acima-do-teto"
  | "falhou"
  | "fora-da-maquina";

export interface EntradaDoTrilho {
  folhas: number;
  fase?: FaseDaMontagem;
  montado?: TomoMontado;
  /** O cartão (sem tela) deste tomo está registrado — só existe com capa ou LD. */
  temMontador: boolean;
  /** `motivoParaNaoMontar` do cartão. */
  bloqueio: string | null;
  /** O erro da última tentativa. */
  erro: string | null;
  /** `motivoParaNaoGastar` quando a aba está travada. */
  trava: string | null;
  /** A trava dos editáveis (`useLiberacaoDoVolume`). */
  liberacao: { liberado: boolean; motivo: string | null };
  /** O gerar do plano do chat (`useGeradorDoPlano`); ausente = nenhum plano. */
  gerador?: { bloqueio: string | null; gerando: boolean } | null;
}

export interface Trilho {
  estado: EstadoDoTomo;
  frase: string;
  /** 0..1 — quanto o nó do volume está "cheio". */
  preenchimento: number;
  acao: { tipo: "gerar" | "montar" | "remontar" | "tentar-de-novo"; habilitada: boolean; motivo: string | null };
  /** `null` enquanto não há volume montado. */
  baixar: { habilitado: boolean; motivo: string | null; url: string | null; nome: string } | null;
}

const PESO: Record<FaseDaMontagem, number> = {
  aguardando: 0,
  "conferindo-versao": 0.05,
  preparando: 0.15,
  juntando: 0.35,
  conferindo: 0.8,
  pronto: 1,
  falhou: 1,
};

function emCurso(f: FaseDaMontagem | undefined): boolean {
  return f === "conferindo-versao" || f === "preparando" || f === "juntando" || f === "conferindo";
}

function fraseDaFase(f: FaseDaMontagem, folhas: number): string {
  switch (f) {
    case "conferindo-versao":
      return "conferindo se a conversa está atual…";
    case "preparando":
      return "preparando capa, LD e separatriz…";
    case "juntando":
      return `juntando ${folhas} ${folhas === 1 ? "prancha" : "pranchas"}…`;
    case "conferindo":
      return "montado — conferindo os carimbos…";
    default:
      return "na fila…";
  }
}

function folhas(n: number): string {
  return n === 1 ? "1 folha" : `${n} folhas`;
}

function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function frasePronta(s: string): string {
  const t = s.trim().replace(/\.$/, "");
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}.`;
}

export function trilhoDoTomo(e: EntradaDoTrilho): Trilho {
  const travado = (motivo: string | null) => (e.trava ? { habilitada: false, motivo: e.trava } : { habilitada: motivo === null, motivo });

  if (emCurso(e.fase) || e.fase === "aguardando") {
    const fase = e.fase as FaseDaMontagem;
    return {
      estado: "montando",
      frase: fraseDaFase(fase, e.folhas),
      preenchimento: PESO[fase],
      acao: { tipo: "montar", habilitada: false, motivo: null },
      baixar: null,
    };
  }

  if (e.fase === "falhou" || (e.erro && !e.montado)) {
    return {
      estado: "falhou",
      frase: e.erro ?? "não montou",
      preenchimento: 0,
      acao: { tipo: "tentar-de-novo", ...travado(null) },
      baixar: null,
    };
  }

  if (e.montado) {
    const m = e.montado;
    // Remontar passa pelas MESMAS travas de montar (sem pranchas nesta sessão, sem capa/LD).
    const remontar = {
      tipo: "remontar" as const,
      ...travado(!e.temMontador ? "Gere a capa e a LD primeiro." : e.bloqueio ? frasePronta(e.bloqueio) : null),
    };
    if (m.url === null) {
      return {
        estado: "fora-da-maquina",
        frase: "montado em outra máquina",
        preenchimento: 1,
        acao: remontar,
        baixar: { habilitado: false, motivo: "O PDF não está neste navegador. Monte de novo.", url: null, nome: m.nome },
      };
    }
    if (m.acimaDoTeto) {
      return {
        estado: "acima-do-teto",
        frase: `${mb(m.bytes ?? 0)} · passa do teto de 20 MB`,
        preenchimento: 1,
        acao: remontar,
        baixar: { habilitado: false, motivo: "Passa do teto de 20 MB.", url: m.url, nome: m.nome },
      };
    }
    const conferencia = m.veredito === "ok" ? "conferido" : m.veredito === "sem-conferencia" ? "sem conferência" : `${m.pontos} ${m.pontos === 1 ? "ponto" : "pontos"} para olhar`;
    return {
      estado: "montado",
      frase: m.bytes !== null ? `${mb(m.bytes)} · ${conferencia}` : conferencia,
      preenchimento: 1,
      acao: remontar,
      baixar: { habilitado: e.liberacao.liberado, motivo: e.liberacao.liberado ? null : e.liberacao.motivo, url: m.url, nome: m.nome },
    };
  }

  if (!e.temMontador && e.gerador) {
    // SEM CAPA E LD, MAS COM PLANO: a ação do tomo é gerar (06/10/2026) — um
    // "Montar" cinza aqui deixava a pessoa sem saída.
    if (e.gerador.gerando) {
      return {
        estado: "incompleto",
        frase: "gerando capa, LD e separatriz…",
        preenchimento: 0,
        acao: { tipo: "gerar", habilitada: false, motivo: null },
        baixar: null,
      };
    }
    // A pendência do plano, curta: só até o travessão, que é onde a explicação começa.
    const pendencia = e.gerador.bloqueio
      ? e.gerador.bloqueio.split(" — ")[0].replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase())
      : null;
    return {
      estado: "incompleto",
      frase: `${folhas(e.folhas)} · ${pendencia ?? "falta gerar a capa e a LD"}`,
      preenchimento: 0,
      acao: { tipo: "gerar", ...travado(e.gerador.bloqueio) },
      baixar: null,
    };
  }
  if (!e.temMontador) {
    return {
      estado: "incompleto",
      frase: `${folhas(e.folhas)} · falta a capa e a LD`,
      preenchimento: 0,
      acao: { tipo: "montar", habilitada: false, motivo: "Gere a capa e a LD primeiro." },
      baixar: null,
    };
  }
  if (e.bloqueio) {
    return {
      estado: "incompleto",
      frase: `${folhas(e.folhas)} · ${e.bloqueio}`,
      preenchimento: 0,
      acao: { tipo: "montar", habilitada: false, motivo: frasePronta(e.bloqueio) },
      baixar: null,
    };
  }
  return {
    estado: "pronto-para-montar",
    frase: `${folhas(e.folhas)} · pronto para montar`,
    preenchimento: 0,
    acao: { tipo: "montar", ...travado(null) },
    baixar: null,
  };
}
