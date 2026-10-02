"use client";

import { Check, Copy, MonitorSmartphone, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";

import { Botao, Orbe } from "@/components/ds/basicos";

import "./aviso-de-tela.css";

/*
 * AVISO DE TELA PEQUENA. Abaixo de 1024 px o Nexo não cabe lado a lado
 * (conversas | palco | chat; tabelas densas). Em vez de encolher até encavalar,
 * ele avisa: primeiro uma TELA de aviso, com o fundo líquido; quem decide
 * continuar segue com uma FAIXA fina em cima, que se fecha. A decisão vale
 * para a sessão do navegador.
 */

const LARGURA_MINIMA = 1024;
const CHAVE_CONTINUOU = "nexo.aviso-de-tela.continuou";
const CHAVE_FAIXA = "nexo.aviso-de-tela.faixa-fechada";

// three só baixa quando o aviso aparece de fato
const FundoLiquido = dynamic(() => import("@/components/ds/fundo-liquido").then((m) => m.FundoLiquido), { ssr: false });

// as cores do orbe: violeta do aro, alma profunda, coral da alma clara
const CORES = ["#9a6cf0", "#c3a3ff", "#ffa293"];

function lerSessao(chave: string) {
  try {
    return sessionStorage.getItem(chave) === "1";
  } catch {
    return false;
  }
}
function gravarSessao(chave: string) {
  try {
    sessionStorage.setItem(chave, "1");
  } catch {
    // sem armazenamento (aba privada): a decisão vale só até recarregar
  }
}

function assinarLargura(avisar: () => void) {
  window.addEventListener("resize", avisar);
  return () => window.removeEventListener("resize", avisar);
}

/** A largura da janela; no servidor, larga (o aviso só nasce no navegador). */
export function useLarguraDaJanela() {
  return useSyncExternalStore(assinarLargura, () => window.innerWidth, () => 1440);
}

/** `?aviso=tela` no endereço força o aviso em qualquer largura, para revisar o desenho. */
function forcado() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("aviso") === "tela";
}

/** Movimento reduzido lido direto do sistema (o hook do motion falhou na Entrada). */
const MQ_REDUZIR = "(prefers-reduced-motion: reduce)";
function assinarReduzir(avisar: () => void) {
  const mq = matchMedia(MQ_REDUZIR);
  mq.addEventListener("change", avisar);
  return () => mq.removeEventListener("change", avisar);
}
function useMovimentoReduzido() {
  return useSyncExternalStore(assinarReduzir, () => matchMedia(MQ_REDUZIR).matches, () => false);
}

// o que fica guardado na sessão não muda sozinho: ninguém a assinar
const semAssinatura = () => () => {};

export function useAvisoDeTela() {
  const largura = useLarguraDaJanela();
  // `?aviso=tela` força, e aí a sessão é ignorada (para revisar o desenho de novo)
  const forcar = useSyncExternalStore(semAssinatura, forcado, () => false);
  const continuouAntes = useSyncExternalStore(semAssinatura, () => !forcado() && lerSessao(CHAVE_CONTINUOU), () => false);
  const faixaFechadaAntes = useSyncExternalStore(semAssinatura, () => !forcado() && lerSessao(CHAVE_FAIXA), () => false);
  const [continuouAgora, setContinuou] = useState(false);
  const [faixaFechadaAgora, setFaixaFechada] = useState(false);
  const continuou = continuouAntes || continuouAgora;
  const faixaFechada = faixaFechadaAntes || faixaFechadaAgora;
  const pequena = forcar || largura < LARGURA_MINIMA;
  return {
    largura,
    mostrarTela: pequena && !continuou,
    mostrarFaixa: pequena && continuou && !faixaFechada,
    continuar: () => (setContinuou(true), gravarSessao(CHAVE_CONTINUOU)),
    fecharFaixa: () => (setFaixaFechada(true), gravarSessao(CHAVE_FAIXA)),
  };
}

export function TelaDeAviso({ largura, onContinuar }: { largura: number; onContinuar: () => void }) {
  const reduzir = useMovimentoReduzido();
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2400);
    } catch {
      // sem permissão de área de transferência: o endereço continua na barra do navegador
    }
  };
  return (
    <section className="at" aria-labelledby="at-titulo">
      <div className="at-fundo" aria-hidden>
        {reduzir ? (
          <div className="at-fundo-parado" />
        ) : (
          <FundoLiquido style={{ position: "absolute", inset: 0 }} colors={CORES} resolution={0.45} autoSpeed={0.35} autoIntensity={1.8} mouseForce={18} cursorSize={110} />
        )}
        <div className="at-veu" />
      </div>

      <div className="at-conteudo">
        <p className="at-marca">
          <Orbe tamanho={22} />
          <span>Nexo</span>
        </p>
        <h1 id="at-titulo">O Nexo funciona melhor numa tela grande</h1>
        <p className="at-texto">
          A auditoria, o mapa do volume e o chat ficam lado a lado a partir de <b className="ds-num">{LARGURA_MINIMA} px</b> de largura. Numa tela menor eles se apertam até a leitura ficar ruim.
        </p>
        <p className="at-texto at-texto--fraco">Nada se perde: as conversas e os pareceres continuam aqui quando você abrir num computador.</p>
        <div className="at-acoes">
          <Botao variante="primary" onClick={onContinuar}>
            Continuar assim mesmo
          </Botao>
          <Botao variante="ghost" onClick={copiar}>
            {copiado ? <Check size={15} /> : <Copy size={15} />}
            {copiado ? "Link copiado" : "Copiar o link"}
          </Botao>
        </div>
        <p className="at-medida mp-mono">
          <MonitorSmartphone size={13} aria-hidden />
          esta tela <span className="ds-num">{largura} px</span> · o Nexo pede <span className="ds-num">{LARGURA_MINIMA} px</span>
        </p>
      </div>
    </section>
  );
}

export function FaixaDeAviso({ largura, onFechar }: { largura: number; onFechar: () => void }) {
  return (
    <div className="at-faixa" role="note">
      <i aria-hidden />
      <p>
        Tela de <span className="ds-num">{largura} px</span>: o Nexo funciona melhor a partir de <span className="ds-num">{LARGURA_MINIMA} px</span>.
      </p>
      <button type="button" aria-label="Fechar o aviso" title="Fechar o aviso" onClick={onFechar}>
        <X size={14} />
      </button>
    </div>
  );
}
