"use client";

/**
 * QUEM SABE MONTAR CADA VOLUME — um mapa só, da conversa inteira.
 *
 * O registro existia dentro de `VolumesDoConjunto`, chaveado pelo sufixo do
 * tomo, e servia a um consumidor só: o botão "montar todos" do próprio card.
 * Fechado ali, ele não alcançava quem está FORA daquela mensagem — e é
 * justamente de fora que veio a necessidade: o card de volumes desatualizados
 * mora no fim da conversa e precisa remontar um volume montado lá atrás.
 *
 * A alternativa seria o card novo reconstruir a montagem (lista de tomos, selos
 * do tomo, peças de cada bloco) por conta própria. Isso é uma SEGUNDA VIA de
 * montagem, e duas vias divergem: a de fora não teria `motivoParaNaoMontar`,
 * nem a ordem de `entregarVolume`, nem a conferência que roda sozinha. O mapa
 * sobe; a montagem continua uma só.
 *
 * A chave é o `artifactId` do volume — o mesmo que o payload guarda e que
 * `volumesDesatualizados` devolve. Sufixo de tomo não serve de chave aqui: quem
 * está de fora conhece o artefato, não a posição dele no card.
 *
 * O mapa vive num `ref`: registrar é efeito de montagem de componente, e
 * guardar em `useState` dispararia render a cada card de volume que aparece.
 * Quem precisa saber QUAIS existem hoje chama `podeMontar` no momento do
 * clique, que é quando a resposta importa.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { FaseDaMontagem } from "../lib/progresso-da-montagem";

/**
 * Monta UM volume. Devolve o MOTIVO da falha, ou `null` quando deu certo — o
 * contrato que o card de volume já usava, para que um tomo que falha não
 * derrube o laço de quem chama.
 */
export type { MontarVolume } from "../lib/lote-de-volumes";
import type { MontarVolume } from "../lib/lote-de-volumes";

interface MontadoresDeVolume {
  registrar: (artifactId: string, montar: MontarVolume | null) => void;
  /** O montador deste volume, se o card dele estiver na tela. */
  montador: (artifactId: string) => MontarVolume | undefined;
}

const Ctx = createContext<MontadoresDeVolume | null>(null);

/** O mapa de quem está fora do provedor: identidade estável, sempre vazio. */
const VAZIO: MontadoresDeVolume = {
  registrar: () => {},
  montador: () => undefined,
};

export function MontadoresDeVolumeProvider({ children }: { children: ReactNode }) {
  const mapa = useRef(new Map<string, MontarVolume>());

  const registrar = useCallback((artifactId: string, montar: MontarVolume | null) => {
    if (montar) mapa.current.set(artifactId, montar);
    else mapa.current.delete(artifactId);
  }, []);

  const montador = useCallback(
    (artifactId: string) => mapa.current.get(artifactId),
    [],
  );

  const valor = useMemo(() => ({ registrar, montador }), [registrar, montador]);

  /*
   * AS FASES, em estado (e não no ref do mapa): quem as lê é a tela — o cartão
   * do tomo e o painel do "montar todos" —, e ela precisa redesenhar quando a
   * fase muda. Ficam num contexto à parte para que mudar de fase não redesenhe
   * quem só registra montador.
   */
  const [fases, setFases] = useState<Readonly<Record<string, FaseDaMontagem>>>({});
  const marcarFase = useCallback((artifactId: string, fase: FaseDaMontagem | null) => {
    setFases((atual) => {
      if ((atual[artifactId] ?? null) === fase) return atual;
      const proximo = { ...atual };
      if (fase) proximo[artifactId] = fase;
      else delete proximo[artifactId];
      return proximo;
    });
  }, []);
  /*
   * A SITUAÇÃO de cada montador (bloqueio e erro), publicada pelo cartão sem
   * tela. O canvas não tem como perguntar a um componente invisível "por que
   * você não monta?" — ele lê daqui.
   */
  const [situacoes, setSituacoes] = useState<Readonly<Record<string, SituacaoDoMontador>>>({});
  const publicarSituacao = useCallback((artifactId: string, s: SituacaoDoMontador | null) => {
    setSituacoes((atual) => {
      const antes = atual[artifactId];
      if (s && antes && antes.bloqueio === s.bloqueio && antes.erro === s.erro) return atual;
      if (!s && !antes) return atual;
      const proximo = { ...atual };
      if (s) proximo[artifactId] = s;
      else delete proximo[artifactId];
      return proximo;
    });
  }, []);
  const valorDasFases = useMemo(
    () => ({ fases, marcarFase, situacoes, publicarSituacao }),
    [fases, marcarFase, situacoes, publicarSituacao],
  );

  /*
   * O GERAR DO PLANO (06/10/2026): o canvas e o cartão curto oferecem "Gerar
   * capa e LD" quando elas ainda não existem, chamando o MESMO gerar do plano
   * de geração mais recente da conversa — uma via de geração, com as mesmas
   * travas (título, prefeitura, número do volume, aba travada).
   */
  const gerarRef = useRef<(() => Promise<void>) | null>(null);
  const donoRef = useRef<string | null>(null);
  const [gerador, setGerador] = useState<SituacaoDoGerador | null>(null);
  const publicarGerador = useCallback((dono: string, s: SituacaoDoGerador | null, gerar?: () => Promise<void>) => {
    if (!s) {
      if (donoRef.current !== dono) return;
      donoRef.current = null;
      gerarRef.current = null;
      setGerador(null);
      return;
    }
    donoRef.current = dono;
    if (gerar) gerarRef.current = gerar;
    setGerador((atual) => (atual && atual.bloqueio === s.bloqueio && atual.gerando === s.gerando ? atual : s));
  }, []);
  const gerar = useCallback(async () => {
    await gerarRef.current?.();
  }, []);
  const valorDoGerador = useMemo(() => ({ gerador, publicarGerador, gerar }), [gerador, publicarGerador, gerar]);

  return (
    <Ctx.Provider value={valor}>
      <CtxDasFases.Provider value={valorDasFases}>
        <CtxDoGerador.Provider value={valorDoGerador}>{children}</CtxDoGerador.Provider>
      </CtxDasFases.Provider>
    </Ctx.Provider>
  );
}

export interface SituacaoDoMontador {
  bloqueio: string | null;
  erro: string | null;
}

interface FasesDaMontagem {
  /** Fase de cada volume (por `artifactId`) nesta sessão; ausente = nunca montou aqui. */
  fases: Readonly<Record<string, FaseDaMontagem>>;
  marcarFase: (artifactId: string, fase: FaseDaMontagem | null) => void;
  /** Bloqueio e erro de cada montador sem tela (por `artifactId`). */
  situacoes: Readonly<Record<string, SituacaoDoMontador>>;
  publicarSituacao: (artifactId: string, s: SituacaoDoMontador | null) => void;
}

const CtxDasFases = createContext<FasesDaMontagem | null>(null);
const SEM_FASES: FasesDaMontagem = { fases: {}, marcarFase: () => {}, situacoes: {}, publicarSituacao: () => {} };

/** Fora do provedor: sem fases e marcar não faz nada (mesma razão do `VAZIO`). */
export function useFasesDaMontagem(): FasesDaMontagem {
  return useContext(CtxDasFases) ?? SEM_FASES;
}

/**
 * Fora do provedor devolve um mapa VAZIO em vez de lançar.
 *
 * O card de volume se registra de dentro de um `useEffect`, e ele é renderizado
 * em contextos que não têm por que montar volume nenhum (a prévia de um
 * resultado, por exemplo). Lançar ali derrubaria a tela por causa de um
 * registro que ninguém ia consultar.
 */
export function useMontadoresDeVolume(): MontadoresDeVolume {
  return useContext(Ctx) ?? VAZIO;
}

export interface SituacaoDoGerador {
  /** Por que o plano não gera agora (título, prefeitura, volume, aba), ou `null`. */
  bloqueio: string | null;
  gerando: boolean;
}

interface GeradorDoPlano {
  /** `null` = nenhum plano de geração na conversa. */
  gerador: SituacaoDoGerador | null;
  publicarGerador: (dono: string, s: SituacaoDoGerador | null, gerar?: () => Promise<void>) => void;
  gerar: () => Promise<void>;
}

const CtxDoGerador = createContext<GeradorDoPlano | null>(null);
const SEM_GERADOR: GeradorDoPlano = { gerador: null, publicarGerador: () => {}, gerar: async () => {} };

export function useGeradorDoPlano(): GeradorDoPlano {
  return useContext(CtxDoGerador) ?? SEM_GERADOR;
}
