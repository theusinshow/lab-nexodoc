"use client";

/**
 * O ESTADO VIVO DA MESA — a ponte entre as operações puras (`lib/volume/mesa.ts`),
 * o histórico de desfazer e o rascunho guardado neste dispositivo
 * (`lib/volume/mesa-persistencia.ts`). Auditoria UX/UI, V02/V05/V06/V10.
 *
 * Toda mudança passa por `executar`: registra o estado anterior no histórico,
 * troca o estado e publica a frase do que aconteceu (a tela mostra com
 * "Desfazer"). O autosave observa o estado e grava com compare-and-set; a
 * gravação só vira "salvo" quando o banco confirma.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  HISTORICO_VAZIO,
  MONTAGEM_VAZIA,
  arquivosReferenciados,
  assinaturaDaMontagem,
  desfazer as desfazerNoHistorico,
  refazer as refazerNoHistorico,
  registrar,
  type Conferencia,
  type EstadoDaMontagem,
  type Historico,
  type Resultado,
} from "@/modules/volume-builder/lib/volume/mesa";
import {
  CANAL_DA_MESA,
  chaveDoEscopo,
  descartarRascunho,
  lerArquivos,
  lerRascunho,
  moverRascunho,
  salvarRascunho,
  type AvisoDaMesa,
  type Escopo,
  type RascunhoGuardado,
} from "@/modules/volume-builder/lib/volume/mesa-persistencia";
import type { BatchAnalysisResult, VolumeMetadata } from "@/modules/volume-builder/lib/volume/volume-types";

export type ConferenciaDaMesa = Conferencia<BatchAnalysisResult>;

export type Gravacao =
  | { fase: "carregando" }
  | { fase: "vazia" }
  | { fase: "pendente" }
  | { fase: "salvando" }
  | { fase: "salvo"; em: number }
  | { fase: "falha"; motivo: "quota" | "bloqueado" | "erro"; mensagem: string }
  | { fase: "conflito"; remotoEm: number };

export type Aviso = { id: number; frase: string; podeDesfazer: boolean };

export type Recuperacao = { em: number; faltando: string[] } | null;

const ATRASO_DO_AUTOSAVE_MS = 700;

function novaAba() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `aba-${Math.random().toString(36).slice(2)}`;
}

export function useMesa({
  email,
  projetoInicial,
  metadadosIniciais,
}: {
  email: string;
  projetoInicial: string | null;
  metadadosIniciais: VolumeMetadata;
}) {
  const [projetoId, setProjetoId] = useState<string | null>(projetoInicial);
  const escopo: Escopo = useMemo(() => ({ email, projetoId }), [email, projetoId]);
  const chave = chaveDoEscopo(escopo);

  const [estado, setEstado] = useState<EstadoDaMontagem>({ ...MONTAGEM_VAZIA, metadata: metadadosIniciais });
  const [hist, setHist] = useState<Historico>(HISTORICO_VAZIO);
  const [bytes, setBytes] = useState<Map<string, File>>(new Map());
  const [conferencia, setConferencia] = useState<ConferenciaDaMesa | null>(null);
  const [gravacao, setGravacao] = useState<Gravacao>({ fase: "carregando" });
  const [recuperacao, setRecuperacao] = useState<Recuperacao>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const [abaId] = useState(novaAba);
  const revisaoBase = useRef(0);
  /** Sobe a cada mudança do usuário; o autosave compara para saber se há o que gravar. */
  const [versaoLocal, setVersaoLocal] = useState(0);
  const versaoGravada = useRef(0);
  const carregado = useRef(false);
  const contadorDeAviso = useRef(0);
  /*
   * O ESTADO MAIS RECENTE, fora do ciclo de render. Duas operações no mesmo
   * gesto (importar e já inserir) leriam o estado velho pelo fecho; `executar`
   * calcula sempre sobre este `ref`.
   */
  const estadoRef = useRef(estado);
  const histRef = useRef(hist);
  const pularProximaCarga = useRef(false);
  /*
   * A GRAVAÇÃO LÊ TUDO DE `refs`, e por isso é estável e chamável a qualquer
   * momento (inclusive logo depois de vincular o projeto, sem esperar o
   * temporizador do autosave — ver `vincularProjeto`).
   */
  const bytesRef = useRef(bytes);
  const conferenciaRef = useRef(conferencia);
  const escopoRef = useRef(escopo);
  const versaoLocalRef = useRef(0);
  const mudou = useCallback(() => {
    versaoLocalRef.current += 1;
    setVersaoLocal(versaoLocalRef.current);
  }, []);

  const avisar = useCallback((frase: string, podeDesfazer: boolean) => {
    contadorDeAviso.current += 1;
    setAviso({ id: contadorDeAviso.current, frase, podeDesfazer });
  }, []);

  // ---------------------------------------------------------------- carga

  const carregar = useCallback(
    async (chaveAtual: string) => {
      carregado.current = false;
      setGravacao({ fase: "carregando" });
      try {
        const r = await lerRascunho<ConferenciaDaMesa>(chaveAtual);
        if (!r) {
          revisaoBase.current = 0;
          setGravacao({ fase: "vazia" });
          carregado.current = true;
          return;
        }
        const guardados = await lerArquivos(r.estado.importedFiles.map((f) => f.id));
        revisaoBase.current = r.revisao;
        estadoRef.current = r.estado;
        setEstado(r.estado);
        conferenciaRef.current = r.conferencia;
        setConferencia(r.conferencia);
        bytesRef.current = guardados;
        setBytes(guardados);
        histRef.current = HISTORICO_VAZIO;
        setHist(HISTORICO_VAZIO);
        const faltando = r.estado.importedFiles.filter((f) => !guardados.has(f.id)).map((f) => f.name);
        setRecuperacao({ em: r.salvoEm, faltando });
        versaoGravada.current = 0;
        versaoLocalRef.current = 0;
        setVersaoLocal(0);
        setGravacao({ fase: "salvo", em: r.salvoEm });
        carregado.current = true;
      } catch (err) {
        const nome = (err as { name?: string } | null)?.name ?? "";
        setGravacao({
          fase: "falha",
          motivo: nome === "NotAllowedError" || nome === "SecurityError" ? "bloqueado" : "erro",
          mensagem:
            "Não foi possível ler os rascunhos deste dispositivo. A mesa funciona, mas nada será guardado até o armazenamento voltar.",
        });
        carregado.current = true;
      }
    },
    [],
  );

  useEffect(() => {
    // Vincular projeto MOVE o rascunho de escopo com o estado já em memória:
    // recarregar do banco aqui só arriscaria trocar o estado por uma cópia.
    if (pularProximaCarga.current) {
      pularProximaCarga.current = false;
      carregado.current = true;
      return;
    }
    // Adiado: a carga faz vários `setState`, e o React Compiler barra isso
    // síncrono dentro de efeito.
    queueMicrotask(() => void carregar(chave));
  }, [carregar, chave]);

  // ---------------------------------------------------------------- operações

  /**
   * Executa uma operação pura sobre o estado MAIS RECENTE e a registra.
   * Devolve o resultado, para quem precisa do estado novo (ids criados etc.).
   */
  const executar = useCallback(
    (
      operacao: (atual: EstadoDaMontagem) => Resultado,
      opcoes: { chave?: string; silencioso?: boolean } = {},
    ): Resultado => {
      const anterior = estadoRef.current;
      const resultado = operacao(anterior);
      if (resultado.nada) {
        if (!opcoes.silencioso) avisar(resultado.frase, false);
        return resultado;
      }
      histRef.current = registrar(histRef.current, anterior, resultado.frase, { chave: opcoes.chave });
      estadoRef.current = resultado.estado;
      setHist(histRef.current);
      setEstado(resultado.estado);
      mudou();
      if (!opcoes.silencioso) avisar(resultado.frase, true);
      return resultado;
    },
    [avisar, mudou],
  );

  /**
   * Ajuste SEM histórico: dados que a própria tela calcula (resumo e
   * classificação lidos do PDF). Funde por id — nunca ressuscita página de
   * arquivo que a pessoa removeu enquanto a leitura corria.
   */
  const ajustarPaginas = useCallback((lidas: EstadoDaMontagem["pageAssets"]) => {
    const porId = new Map(lidas.map((a) => [a.id, a]));
    const atual = estadoRef.current;
    let alterou = false;
    const pageAssets = atual.pageAssets.map((a) => {
      const l = porId.get(a.id);
      if (!l || (l.summary === a.summary && l.role === a.role)) return a;
      alterou = true;
      // O papel escolhido à mão (reclassificação) vence o palpite da leitura.
      return a.classification?.source === "manual" ? { ...a, summary: l.summary } : { ...a, ...l };
    });
    if (!alterou) return;
    estadoRef.current = { ...atual, pageAssets };
    setEstado(estadoRef.current);
    mudou();
  }, [mudou]);

  const desfazer = useCallback(() => {
    const d = desfazerNoHistorico(histRef.current, estadoRef.current);
    if (!d) return;
    histRef.current = d.hist;
    estadoRef.current = d.estado;
    setHist(d.hist);
    setEstado(d.estado);
    mudou();
    avisar(`Desfeito: ${d.rotulo}`, false);
  }, [avisar, mudou]);

  const refazer = useCallback(() => {
    const r = refazerNoHistorico(histRef.current, estadoRef.current);
    if (!r) return;
    histRef.current = r.hist;
    estadoRef.current = r.estado;
    setHist(r.hist);
    setEstado(r.estado);
    mudou();
    avisar(`Refeito: ${r.rotulo}`, false);
  }, [avisar, mudou]);

  const guardarBytes = useCallback((novos: Map<string, File>) => {
    const m = new Map(bytesRef.current);
    for (const [k, v] of novos) m.set(k, v);
    bytesRef.current = m;
    setBytes(m);
  }, []);

  // ---------------------------------------------------------------- conferência (V06)

  const assinatura = useMemo(() => assinaturaDaMontagem(estado), [estado]);

  const registrarConferencia = useCallback((c: ConferenciaDaMesa) => {
    // A conferência guarda a assinatura DO PEDIDO — resposta atrasada de uma
    // versão antiga fica "desatualizada" por construção.
    conferenciaRef.current = c;
    setConferencia(c);
    mudou();
  }, [mudou]);

  // ---------------------------------------------------------------- autosave (V02)

  /** A versão cuja gravação falhou: não se tenta de novo sozinho (sem laço). */
  const versaoQueFalhou = useRef<number | null>(null);
  const faseRef = useRef<Gravacao["fase"]>("carregando");
  useEffect(() => {
    faseRef.current = gravacao.fase;
  }, [gravacao.fase]);

  const salvar = useCallback(async () => {
    if (!carregado.current) return;
    const alvo = versaoLocalRef.current;
    const escopoAtual = escopoRef.current;
    const estadoAtual = estadoRef.current;
    versaoQueFalhou.current = null;
    setGravacao({ fase: "salvando" });
    let r: Awaited<ReturnType<typeof salvarRascunho<ConferenciaDaMesa>>>;
    try {
      r = await salvarRascunho<ConferenciaDaMesa>({
        escopo: escopoAtual,
        estado: estadoAtual,
        conferencia: conferenciaRef.current,
        revisaoBase: revisaoBase.current,
        abaId,
        bytes: bytesRef.current,
        referenciados: arquivosReferenciados(estadoAtual, histRef.current),
      });
    } catch (err) {
      // Nunca deixar "salvando" pendurado: exceção inesperada é falha dita.
      versaoQueFalhou.current = alvo;
      setGravacao({
        fase: "falha",
        motivo: "erro",
        mensagem: `Não foi possível salvar neste dispositivo (${err instanceof Error ? err.name : "erro"}).`,
      });
      return;
    }
    if (r.ok) {
      revisaoBase.current = r.revisao;
      versaoGravada.current = Math.max(versaoGravada.current, alvo);
      // Mudou algo enquanto gravava? Continua "pendente", e o autosave grava de novo.
      setGravacao(
        versaoLocalRef.current === alvo ? { fase: "salvo", em: r.salvoEm } : { fase: "pendente" },
      );
      try {
        const canal = new BroadcastChannel(CANAL_DA_MESA);
        canal.postMessage({ chave: chaveDoEscopo(escopoAtual), revisao: r.revisao, abaId } satisfies AvisoDaMesa);
        canal.close();
      } catch {
        /* sem BroadcastChannel: o compare-and-set continua protegendo */
      }
      return;
    }
    if (r.motivo === "conflito") {
      setGravacao({ fase: "conflito", remotoEm: r.remoto.salvoEm });
      return;
    }
    versaoQueFalhou.current = alvo;
    setGravacao({ fase: "falha", motivo: r.motivo, mensagem: r.mensagem });
  }, [abaId]);

  /*
   * O AUTOSAVE roda quando a versão local muda — não quando a FASE muda.
   * Depender da fase fazia falha → nova tentativa → falha num laço de 700ms,
   * e o botão "Tentar de novo" nem ficava parado para ser clicado. Depois de
   * uma falha, só uma edição nova ou o botão tentam de novo.
   */
  useEffect(() => {
    if (!carregado.current) return;
    if (versaoLocal === versaoGravada.current) return;
    if (faseRef.current === "conflito") return; // não sobrescreve a outra aba
    if (versaoQueFalhou.current === versaoLocal) return;
    const t = setTimeout(() => void salvar(), ATRASO_DO_AUTOSAVE_MS);
    queueMicrotask(() =>
      setGravacao((g) => (g.fase === "salvando" || g.fase === "falha" ? g : { fase: "pendente" })),
    );
    return () => clearTimeout(t);
  }, [versaoLocal, salvar]);

  // Outra aba gravou a MESMA mesa: esta passa a conflito antes de tentar gravar.
  useEffect(() => {
    let canal: BroadcastChannel | null = null;
    try {
      canal = new BroadcastChannel(CANAL_DA_MESA);
      canal.onmessage = (ev: MessageEvent<AvisoDaMesa>) => {
        const m = ev.data;
        if (m?.chave !== chave || m.abaId === abaId || m.revisao <= revisaoBase.current) return;
        setGravacao({ fase: "conflito", remotoEm: Date.now() });
      };
    } catch {
      canal = null;
    }
    return () => canal?.close();
  }, [chave, abaId]);

  // Sair com algo não gravado pede confirmação do navegador.
  useEffect(() => {
    const naoGravado =
      gravacao.fase === "pendente" ||
      gravacao.fase === "salvando" ||
      gravacao.fase === "falha" ||
      gravacao.fase === "conflito";
    if (!naoGravado || estado.importedFiles.length + estado.rows.length === 0) return;
    const aoSair = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [gravacao.fase, estado.importedFiles.length, estado.rows.length]);

  // ---------------------------------------------------------------- ações de rascunho

  const carregarVersaoMaisNova = useCallback(() => void carregar(chave), [carregar, chave]);

  const descartar = useCallback(async () => {
    try {
      await descartarRascunho(escopo);
    } catch {
      /* se não havia banco, não havia rascunho */
    }
    revisaoBase.current = 0;
    versaoGravada.current = 0;
    versaoLocalRef.current = 0;
    setVersaoLocal(0);
    bytesRef.current = new Map();
    conferenciaRef.current = null;
    estadoRef.current = { ...MONTAGEM_VAZIA, metadata: metadadosIniciais };
    histRef.current = HISTORICO_VAZIO;
    setEstado(estadoRef.current);
    setHist(HISTORICO_VAZIO);
    setBytes(new Map());
    setConferencia(null);
    setRecuperacao(null);
    setGravacao({ fase: "vazia" });
    avisar("Rascunho descartado. A mesa começou vazia.", false);
  }, [escopo, metadadosIniciais, avisar]);

  /**
   * V10: vincular (ou desvincular) o projeto SEM perder a montagem. Grava
   * primeiro, move o rascunho de escopo, e só então troca o projeto da tela.
   */
  const vincularProjeto = useCallback(
    async (novo: { id: string; codigo: string; nome: string } | null) => {
      const para: Escopo = { email, projetoId: novo?.id ?? null };
      if (chaveDoEscopo(para) === chave) return true;
      if (versaoLocal !== versaoGravada.current) await salvar();
      try {
        const moveu = await moverRascunho(escopo, para);
        if (!moveu) {
          avisar(
            "Esse projeto já tem uma montagem guardada neste dispositivo. Descarte-a lá antes, ou continue neste escopo.",
            false,
          );
          return false;
        }
      } catch {
        avisar("Não foi possível mover o rascunho neste dispositivo; a montagem continua aberta sem vínculo.", false);
        return false;
      }
      // O rascunho mudou de chave com a MESMA revisão: a próxima gravação vale.
      pularProximaCarga.current = true;
      escopoRef.current = para;
      setProjetoId(para.projetoId);
      if (novo) {
        const e = estadoRef.current;
        estadoRef.current = {
          ...e,
          metadata: {
            ...e.metadata,
            projectCode: e.metadata.projectCode || novo.codigo,
            projectName: e.metadata.projectName || novo.nome,
          },
        };
        setEstado(estadoRef.current);
        mudou();
        // Vincular é gesto explícito: grava JÁ no escopo novo, sem esperar o
        // temporizador do autosave.
        await salvar();
      }
      avisar(
        novo
          ? `Montagem vinculada a ${novo.codigo} · ${novo.nome}. Continua salva só neste dispositivo; ao exportar, os PDFs entram no projeto.`
          : "Montagem desvinculada: modo independente. Exportar não registra nada em projeto.",
        false,
      );
      return true;
    },
    [email, chave, escopo, versaoLocal, salvar, avisar, mudou],
  );

  return {
    escopo,
    projetoId,
    estado,
    bytes,
    hist,
    podeDesfazer: hist.passado.length > 0,
    podeRefazer: hist.futuro.length > 0,
    rotuloDesfazer: hist.passado[hist.passado.length - 1]?.rotulo ?? null,
    rotuloRefazer: hist.futuro[0]?.rotulo ?? null,
    executar,
    ajustarPaginas,
    desfazer,
    refazer,
    guardarBytes,
    gravacao,
    salvarAgora: salvar,
    recuperacao,
    fecharRecuperacao: () => setRecuperacao(null),
    carregarVersaoMaisNova,
    descartar,
    vincularProjeto,
    assinatura,
    conferencia,
    registrarConferencia,
    aviso,
    fecharAviso: () => setAviso(null),
    avisar,
  };
}

export type Mesa = ReturnType<typeof useMesa>;
export type { RascunhoGuardado };
