"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useAdminToken } from "@/components/admin/admin-token";
import { Botao, Girando } from "@/components/ds/basicos";
import { cotacaoDeclarada, normalizarCotacao, procedenciaDaCotacao, validarCotacao, type CotacaoDeclarada } from "@/lib/cambio";
import { classificarFalha, faseDaCarga, type FalhaDaCarga } from "@/lib/estado-da-carga";

import { AvisoDaCarga } from "./pecas";

type Cambio = { cotacao: CotacaoDeclarada; origem: string; databaseConfigured: boolean };

/*
 * A COTAÇÃO DO DÓLAR no sistema novo. A lógica é a de
 * `components/admin/conteudo/cotacao.tsx` (o /api/admin/config, ação "cambio"):
 * declarada, nunca buscada, e todo real convertido sai com "≈" e a data desta
 * declaração. Campo vazio apaga a cotação — e a tela volta a ser só dólar.
 */
export function BlocoDaCotacao({ onMudou }: { onMudou?: () => void }) {
  const { token, restaurado, recarga, registrarResposta } = useAdminToken();
  const [cambio, setCambio] = useState<Cambio | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");
  const [erroDaCarga, setErroDaCarga] = useState<{ tipo: FalhaDaCarga; detalhe: string | null } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const fase = faseDaCarga({ restaurado, token, carregando, erro: erroDaCarga?.tipo ?? null, temDados: Boolean(cambio) });
  const erros = rascunho ? validarCotacao(normalizarCotacao({ valor: rascunho })) : [];

  const carregar = useCallback(
    async (tokenAtual: string) => {
      setCarregando(true);
      setErroDaCarga(null);
      let resposta: Response;
      try {
        resposta = await fetch("/api/admin/config", { cache: "no-store", headers: { Authorization: `Bearer ${tokenAtual.trim()}` } });
      } catch {
        setErroDaCarga({ tipo: "rede", detalhe: null });
        setCarregando(false);
        return;
      }
      const corpo = (await resposta.json().catch(() => null)) as { cambio?: Cambio; error?: string } | null;
      setCarregando(false);
      if (!resposta.ok || !corpo?.cambio) {
        const tipo = classificarFalha(resposta);
        if (tipo === "negado") registrarResposta(false);
        setErroDaCarga({ tipo, detalhe: corpo?.error ?? `HTTP ${resposta.status}` });
        return;
      }
      registrarResposta(true);
      setCambio(corpo.cambio);
      setErro("");
    },
    [registrarResposta],
  );

  useEffect(() => {
    if (!restaurado || !token.trim()) return;
    queueMicrotask(() => void carregar(token));
  }, [restaurado, token, recarga, carregar]);

  async function declarar() {
    setSalvando(true);
    setSalvo(false);
    setErro("");
    try {
      const resposta = await fetch("/api/admin/config", {
        method: "PATCH",
        cache: "no-store",
        headers: { Authorization: `Bearer ${token.trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cambio", cambio: rascunho }),
      });
      const corpo = (await resposta.json().catch(() => null)) as { config?: { cambio?: Cambio }; error?: string } | null;
      if (!resposta.ok) throw new Error(corpo?.error ?? "Não foi possível salvar a cotação.");
      if (corpo?.config?.cambio) setCambio(corpo.config.cambio);
      setSalvo(true);
      setRascunho("");
      onMudou?.();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar a cotação.");
    } finally {
      setSalvando(false);
    }
  }

  const declarada = cambio && cotacaoDeclarada(cambio.cotacao);
  return (
    <section className="adm-bloco din-cotacao" aria-labelledby="din-cot">
      <header>
        <h2 id="din-cot">Cotação do dólar</h2>
      </header>
      <div className="din-cotacao-corpo">
        <AvisoDaCarga fase={fase} erro={erroDaCarga?.tipo} detalhe={erroDaCarga?.detalhe} oque="a cotação" onTentar={() => void carregar(token)} />
        {cambio && (
          <>
            <p className="din-cotacao-valor">
              {declarada ? (
                <>
                  <span className="din-moeda">R$</span>
                  <b className="ds-num">{cambio.cotacao.valor.toFixed(2).replace(".", ",")}</b>
                  <span className="din-moeda">por US$ 1</span>
                </>
              ) : (
                <span className="din-nao">não declarada</span>
              )}
            </p>
            <p className="din-origem">
              <span className={`din-origem-ponto din-origem-ponto--${declarada ? "banco" : "padrao"}`} aria-hidden />
              {procedenciaDaCotacao(cambio.cotacao, new Date())}
            </p>
          </>
        )}
        <p className="din-desc">A fatura do provedor é em dólar; a decisão de rodar é em real. A cotação é declarada, não buscada — e todo valor convertido sai com “≈” e com a data desta declaração.</p>
        <form
          className="din-campo"
          onSubmit={(e) => {
            e.preventDefault();
            void declarar();
          }}
        >
          <span className="din-prefixo">R$</span>
          <input
            value={rascunho}
            onChange={(e) => {
              setSalvo(false);
              setRascunho(e.target.value);
            }}
            inputMode="decimal"
            placeholder="ex.: 5,42 · vazio apaga"
            aria-label="Reais por US$ 1"
            disabled={!cambio || salvando || !cambio.databaseConfigured}
          />
          <Botao variante="ghost" tamanho="sm" type="submit" disabled={!cambio || !cambio.databaseConfigured || salvando || erros.length > 0}>
            {salvando && <Girando tamanho={12} />}
            Declarar
          </Botao>
          {salvo && (
            <span className="din-salvo">
              <Check size={13} aria-hidden /> declarada agora
            </span>
          )}
        </form>
        {cambio && !cambio.databaseConfigured && <p className="din-aviso-linha">sem DATABASE_URL — só leitura do que veio do ambiente</p>}
        {erros.map((m) => (
          <p key={m} className="din-aviso-linha">
            {m}
          </p>
        ))}
        {erro && <p className="din-erro-linha">{erro}</p>}
      </div>
    </section>
  );
}
