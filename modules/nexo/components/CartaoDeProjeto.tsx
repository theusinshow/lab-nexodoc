"use client";

/**
 * UMA PASTA DA COLUNA DE CONVERSAS (desenho do lab: `.nw-pasta`). Fechada, é
 * uma linha: a marca da prefeitura, o código e a cidade, quando mexeu. Aberta,
 * lista as conversas da obra; a aberta no palco leva `aria-current`.
 *
 * O cabeçalho continua sendo o alvo do clique quando aberta: fechar é o mesmo
 * gesto de abrir. A marca não se repete nas conversas — todas são da mesma obra.
 */

import { formatarDiaMes, formatarEmBrasilia, formatarHora, mesmoDiaEmBrasilia } from "@/lib/fuso-de-brasilia";
import { ChevronRight, Loader2 } from "lucide-react";

import { cidadeDoCliente } from "@/lib/cliente-do-projeto";
import { ehDocumentoFinal, type CartaoDeProjeto as Cartao } from "../lib/cartoes-de-projeto";
import { MarcaDaPrefeitura } from "./MarcaDaPrefeitura";

export function quando(ms: number, agora = Date.now()): string {
  const min = Math.round((agora - ms) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  if (mesmoDiaEmBrasilia(ms, agora)) return formatarHora(ms);
  const dias = Math.floor((agora - ms) / 86_400_000);
  if (dias <= 1) return "ontem";
  if (dias < 7) return formatarEmBrasilia(ms, { weekday: "short" }).replace(".", "");
  return formatarDiaMes(ms);
}

/**
 * "CRICIÚMA" → "Criciúma". O cliente costuma vir do carimbo, em caixa-alta; na
 * coluna o nome se lê em caixa normal. Só na exibição: o dado fica como veio.
 */
const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e"]);
export function nomeProprio(texto: string) {
  if (texto !== texto.toUpperCase()) return texto;
  return texto
    .toLowerCase()
    .split(" ")
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

export function CartaoDeProjeto({
  cartao,
  aberto,
  conversaAtiva,
  onAlternar,
  onAbrirConversa,
  onVerTudo,
  estendido = false,
}: {
  cartao: Cartao;
  aberto: boolean;
  conversaAtiva?: string;
  onAlternar: () => void;
  onAbrirConversa: (id: string) => void;
  onVerTudo?: (chave: string) => void;
  estendido?: boolean;
}) {
  const semCodigo = cartao.aEnderecar;
  const cidade = cartao.cliente ? nomeProprio(cidadeDoCliente(cartao.cliente)) : "";
  const total = cartao.conversas.length + cartao.restantes;

  return (
    <li className={`nw-pasta nx-pasta${aberto ? " nw-pasta--aberta" : ""}`}>
      <button type="button" className="nw-pasta-cabeca nx-pasta-cabeca" onClick={onAlternar} aria-expanded={aberto}>
        <ChevronRight size={12} className="nx-pasta-seta" aria-hidden />
        <MarcaDaPrefeitura prefeitura={semCodigo ? null : cartao.cliente} forma="sinal" />
        {semCodigo ? (
          <span className="nw-pasta-nome">A endereçar</span>
        ) : (
          <>
            <span className="mp-mono">{cartao.codigo}</span>
            {cidade && <span className="nw-pasta-nome">{cidade}</span>}
          </>
        )}
        <span className="ds-num nx-pasta-quando">{cartao.rodando ? <Loader2 size={12} className="animate-spin" aria-label="análise rodando" /> : quando(cartao.atualizadoEm)}</span>
      </button>

      {/* O que a obra já tem (LD, CAPA, SEP, VOL) e quantas folhas: o ritmo que faz uma pasta diferir da vizinha. */}
      {!semCodigo && (cartao.artefatos.length > 0 || cartao.folhas > 0) && (
        <p className="nx-pasta-tem">
          {cartao.artefatos.slice(0, 4).map((a) => (
            <span key={a} className={ehDocumentoFinal(a) ? "nx-pasta-peca nx-pasta-peca--final" : "nx-pasta-peca"}>
              {a}
            </span>
          ))}
          {cartao.folhas > 0 && <span className="ds-num nx-pasta-folhas">{cartao.folhas} fl</span>}
        </p>
      )}
      {semCodigo && !aberto && <p className="nx-pasta-tem">{total === 1 ? "1 conversa sem projeto" : `${total} conversas sem projeto`}</p>}

      {aberto && (
        <ul>
          {(estendido ? [...cartao.conversas, ...cartao.ocultas] : cartao.conversas).map((c) => {
            const ativa = c.id === conversaAtiva;
            return (
              <li key={c.id} className={ativa ? "nw-ativa" : undefined}>
                <button type="button" className="nx-conversa" onClick={() => onAbrirConversa(c.id)} aria-current={ativa ? "true" : undefined}>
                  <span className="nw-conversa-titulo">{c.titulo}</span>
                  <span className="nw-conversa-meta">
                    <span>{c.desfecho}</span>
                    <span className="ds-num">{c.rodando ? "rodando" : quando(c.updatedAt)}</span>
                  </span>
                </button>
              </li>
            );
          })}

          {/* As antigas não são rolagem: uma linha estende a pasta, e depois recolhe. */}
          {cartao.restantes > 0 && (
            <li>
              <button type="button" className="nx-conversa nx-conversa--mais" onClick={() => onVerTudo?.(cartao.chave)} aria-expanded={estendido}>
                <span className="nw-conversa-meta">
                  <span>{estendido ? "recolher as antigas" : cartao.restantes === 1 ? "a outra conversa" : `as outras ${cartao.restantes} conversas`}</span>
                  {!estendido && <span className="ds-num">desde {quando(cartao.restantesDesde)}</span>}
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
