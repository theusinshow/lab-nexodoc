"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useAdminToken } from "@/components/admin/admin-token";
import { Botao, Girando } from "@/components/ds/basicos";
import { classificarFalha, faseDaCarga, type FalhaDaCarga } from "@/lib/estado-da-carga";

/*
 * OS CONTROLES DO PAINEL (tetos, concorrência, a porta de entrada), no sistema
 * novo. A lógica veio de `components/admin/conteudo/controles.tsx`: o mesmo
 * /api/admin/controles, a mesma origem dita em voz alta (declarado aqui, vem do
 * ambiente, não declarado). Muda a pele, e a carga vira um hook para que cada
 * destino desenhe o controle onde ele faz sentido.
 */

export type OrigemDoControle = "banco" | "ambiente" | "padrao";

export type Controle = {
  chave: string;
  rotulo: string;
  descricao: string;
  variavel: string;
  minimo: number;
  maximo: number;
  unidade: string;
  padrao: number | null;
  valor: number | null;
  origem: OrigemDoControle;
};

export type Freio = { estado: "prosul" | "convite" | "outra"; organizationId: string | null; origem: OrigemDoControle };
type Retrato = { databaseConfigured: boolean; controles: Controle[]; freio: Freio };

export const ROTULO_DA_ORIGEM: Record<OrigemDoControle, string> = {
  banco: "declarado aqui",
  ambiente: "vem do ambiente",
  padrao: "não declarado",
};

function formatar(valor: number | null, unidade: string) {
  if (valor === null) return "";
  if (unidade === "ms") return String(valor);
  return String(valor).replace(".", ",");
}

const numero = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

export function useControles() {
  const { token, restaurado, recarga, registrarResposta } = useAdminToken();
  const [retrato, setRetrato] = useState<Retrato | null>(null);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState("");
  const [erro, setErro] = useState("");
  const [erroDaCarga, setErroDaCarga] = useState<{ tipo: FalhaDaCarga; detalhe: string | null } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [carregadoEm, setCarregadoEm] = useState<string | null>(null);
  const fase = faseDaCarga({ restaurado, token, carregando, erro: erroDaCarga?.tipo ?? null, temDados: Boolean(retrato) });

  const carregar = useCallback(
    async (tokenAtual: string) => {
      setCarregando(true);
      setErroDaCarga(null);
      let resposta: Response;
      try {
        resposta = await fetch("/api/admin/controles", { cache: "no-store", headers: { Authorization: `Bearer ${tokenAtual.trim()}` } });
      } catch {
        setErroDaCarga({ tipo: "rede", detalhe: null });
        setCarregando(false);
        return;
      }
      try {
        const corpo = (await resposta.json().catch(() => null)) as (Retrato & { error?: string }) | null;
        if (!resposta.ok || !corpo || !Array.isArray(corpo.controles)) {
          const tipo = classificarFalha(resposta);
          if (tipo === "negado") registrarResposta(false);
          setErroDaCarga({ tipo, detalhe: corpo?.error ?? `HTTP ${resposta.status}` });
          return;
        }
        registrarResposta(true);
        setRetrato(corpo);
        setCarregadoEm(new Date().toISOString());
        setRascunho(Object.fromEntries(corpo.controles.map((c) => [c.chave, formatar(c.valor, c.unidade)])));
        setErro("");
      } finally {
        setCarregando(false);
      }
    },
    [registrarResposta],
  );

  useEffect(() => {
    if (!restaurado || !token.trim()) return;
    // a carga chama setState: fora do corpo síncrono do efeito
    queueMicrotask(() => void carregar(token));
  }, [restaurado, token, recarga, carregar]);

  /** Grava (PATCH) e volta com o retrato novo. `marca` diz qual botão gira. */
  const mandar = useCallback(
    async (corpo: Record<string, unknown>, marca: string) => {
      setSalvando(marca);
      setErro("");
      try {
        const resposta = await fetch("/api/admin/controles", {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token.trim()}`, "Content-Type": "application/json" },
          body: JSON.stringify(corpo),
        });
        const dados = (await resposta.json().catch(() => null)) as (Retrato & { error?: string }) | null;
        if (!resposta.ok || !dados) throw new Error(dados?.error ?? "Não foi possível salvar.");
        setRetrato(dados);
        setRascunho(Object.fromEntries(dados.controles.map((c) => [c.chave, formatar(c.valor, c.unidade)])));
      } catch (falha) {
        setErro(falha instanceof Error ? falha.message : "Não foi possível salvar.");
      } finally {
        setSalvando("");
      }
    },
    [token],
  );

  return { retrato, rascunho, setRascunho, salvando, erro, fase, erroDaCarga, carregadoEm, carregar: () => void carregar(token), mandar };
}

/**
 * UM CONTROLE: rótulo, valor, de onde ele vem (com a variável de ambiente), o
 * que ele faz, e o campo para declarar. "voltar ao ambiente" só existe quando
 * o valor foi declarado aqui.
 */
export function CampoDeControle({
  controle,
  rascunho,
  onMudar,
  onSalvar,
  onEsquecer,
  salvando,
  prefixo,
  valorMostrado,
  medidor,
  semBanco,
  marca,
  classe = "",
}: {
  controle: Controle;
  rascunho: string;
  onMudar: (v: string) => void;
  onSalvar: () => void;
  onEsquecer: () => void;
  salvando: string;
  prefixo?: string;
  /** O valor grande do cabeçalho ("US$ 300,00", "sem teto"). */
  valorMostrado: ReactNode;
  medidor?: ReactNode;
  semBanco?: boolean;
  /** Um selo ao lado do rótulo ("entra na versão do auditor"). */
  marca?: ReactNode;
  classe?: string;
}) {
  const ocupado = Boolean(salvando);
  return (
    <div className={`din-controle ${classe}`}>
      <div className="din-controle-cabeca">
        <p className="din-controle-rotulo">
          {controle.rotulo}
          {marca}
        </p>
        <b className="ds-num">{valorMostrado}</b>
      </div>
      <p className="din-origem">
        <span className={`din-origem-ponto din-origem-ponto--${controle.origem}`} aria-hidden />
        {ROTULO_DA_ORIGEM[controle.origem]} · <span className="mp-mono">{controle.variavel}</span>
      </p>
      {medidor}
      <p className="din-desc">{controle.descricao}</p>
      <form
        className="din-campo"
        onSubmit={(e) => {
          e.preventDefault();
          onSalvar();
        }}
      >
        {prefixo && <span className="din-prefixo">{prefixo}</span>}
        <input
          value={rascunho}
          onChange={(e) => onMudar(e.target.value)}
          inputMode="decimal"
          placeholder={`vazio = não declarado · ${numero(controle.minimo)} a ${numero(controle.maximo)}`}
          aria-label={controle.rotulo}
          disabled={semBanco}
        />
        <Botao variante="ghost" tamanho="sm" type="submit" disabled={ocupado || semBanco} aria-busy={salvando === controle.chave}>
          {salvando === controle.chave && <Girando tamanho={12} />}
          Salvar
        </Botao>
        {controle.origem === "banco" && (
          <Botao variante="quiet" tamanho="sm" disabled={ocupado} onClick={onEsquecer} title="Apaga a declaração e volta a valer o ambiente (ou o padrão do motor)">
            voltar ao ambiente
          </Botao>
        )}
      </form>
    </div>
  );
}
