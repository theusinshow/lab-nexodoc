"use client";

import { Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useAdminToken } from "@/components/admin/admin-token";
import { Segmento } from "@/components/ds/basicos";
import { BarraDividida, BarraEmbutida, OndaDeGasto } from "@/components/ds/medidas";
import { useCabecaDoAdmin } from "@/components/telas/admin/casca";
import { BlocoDaCotacao } from "@/components/telas/admin/cotacao";
import { AvisoDaCarga, Bloco, NumeroDoPeriodo } from "@/components/telas/admin/pecas";
import { TetosDeGasto } from "@/components/telas/admin/tetos";
import { COTACAO_NAO_DECLARADA, formatarReais, type CotacaoDeclarada } from "@/lib/cambio";
import type { CustoDaObra } from "@/lib/custo-por-obra";
import { classificarFalha, faseDaCarga, type FalhaDaCarga } from "@/lib/estado-da-carga";
import { formatarDiaDeCalendario } from "@/lib/fuso-de-brasilia";
import { plural } from "@/lib/plural";

/** De onde vem a linha de uma obra — dito por extenso, nunca em cor de status. */
const ORIGEM_DA_OBRA: Record<string, string> = {
  pasta: "pasta",
  conversa: "conversa avulsa",
  "conversa-removida": "a conversa não existe mais",
  auditoria: "auditoria fora de conversa",
  "pasta-e-auditoria": "pasta e auditorias fora de conversa",
  "sem-vinculo": "consumo sem conversa e sem auditoria (manutenção, teste de provedor)",
};

type AdminUsageResponse = {
  range: {
    days: number;
    startTime: number;
    endTime: number;
  };
  usage: {
    totals: {
      inputTokens: number;
      outputTokens: number;
      cachedTokens: number;
      requests: number;
    };
    daily: Array<{
      date: string;
      inputTokens: number;
      outputTokens: number;
      cachedTokens: number;
      requests: number;
    }>;
    models: Array<{
      model: string;
      inputTokens: number;
      outputTokens: number;
      cachedTokens: number;
      requests: number;
    }>;
  };
  costs: {
    total: {
      amount: number;
      currency: string;
    };
    daily: Array<{
      date: string;
      amount: number;
      currency: string;
    }>;
    lineItems: Array<{
      lineItem: string;
      amount: number;
      currency: string;
    }>;
  };
  /** A cotação declarada em `/admin/config`; ausente = tela em dólar. */
  cotacao?: CotacaoDeclarada;
  /** O gasto registrado no mês de Brasília (null sem banco), contra o teto do sistema. */
  gastoDoMesUsd?: number | null;
  /**
   * Preenchido quando falta `OPENAI_ADMIN_KEY`: a fatura do provedor não vem,
   * mas o consumo interno e o custo por obra (que saem do banco) vêm.
   */
  semChaveDaOpenAi?: string;
  internalUsage?: {
    enabled: boolean;
    /** Consumo agrupado por obra (pasta da conversa). Ver `lib/custo-por-obra.ts`. */
    obras?: CustoDaObra[];
    /** O mesmo consumo por quem gastou (03/10/2026). */
    pessoas?: { email: string; estimatedCostUsd: number; totalTokens: number; requests: number }[];
    /** O teto de eventos lidos, dito em voz alta quando bate. */
    amostra?: { eventos: number; limite: number; truncado: boolean };
    totals: {
      inputTokens: number;
      outputTokens: number;
      cachedTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      requests: number;
      unpricedRequests: number;
      unpricedTokens: number;
    };
    unpricedModels: string[];
    flows: Array<{
      flow: string;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      requests: number;
      unpricedRequests: number;
    }>;
    tasks: Array<{
      taskId: string;
      taskLabel: string;
      flow: string;
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      requests: number;
      unpricedRequests: number;
    }>;
    recentEvents: Array<{
      id: string;
      createdAt: string;
      flow: string;
      taskLabel: string | null;
      provider: string;
      model: string;
      operation: string;
      status: string;
      inputTokens: number;
      outputTokens: number;
      cachedTokens: number;
      totalTokens: number;
      estimatedCostUsd: number | null;
      durationMs: number | null;
      userEmail: string | null;
    }>;
  };
  generatedAt: string;
};

function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(value);
}

function formatDate(value: string) {
  // Chave de dia vinda dos baldes da OpenAI: calendário, não instante.
  return formatarDiaDeCalendario(value, { day: "2-digit", month: "2-digit" });
}

function formatUsd(value: number | null | undefined) {
  return formatCurrency(value ?? 0, "usd");
}

function isErrorPayload(
  payload: AdminUsageResponse | { error?: string },
): payload is { error?: string } {
  return "error" in payload;
}


export default function AdminUsagePage() {
  /*
   * O token vem do trilho, nao desta tela -- ver [[components/admin/admin-token.tsx]].
   * Antes, cada uma das sete telas tinha o seu, e o campo de senha era a
   * primeira coisa que se via em todas elas.
   */
  const { token, restaurado, recarga, registrarResposta } = useAdminToken();
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AdminUsageResponse | null>(null);
  // P02: falha com tipo; os dados de antes ficam, com o horário deles.
  const [erro, setErro] = useState<{ tipo: FalhaDaCarga; detalhe: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fase = faseDaCarga({
    restaurado,
    token,
    carregando: isLoading,
    erro: erro?.tipo ?? null,
    temDados: Boolean(data),
  });
  /** O que uma seção diz sem resposta do servidor — nunca "nenhum" nem "sem banco". */
  const semResposta =
    fase === "sem-token"
      ? "Aguardando o token de administração."
      : fase === "erro"
        ? "Não carregado — veja o aviso no topo."
        : "Carregando…";
  const apiUrl = getApiUrl();
  const cotacao = data?.cotacao ?? COTACAO_NAO_DECLARADA;
  const obras = data?.internalUsage?.obras ?? [];
  const totalTokens = useMemo(() => {
    if (!data) {
      return 0;
    }

    return data.usage.totals.inputTokens + data.usage.totals.outputTokens;
  }, [data]);

  async function loadUsage(nextToken = token, nextDays = days) {
    const trimmedToken = nextToken.trim();

    if (!trimmedToken) return;

    setIsLoading(true);
    setErro(null);

    let response: Response;
    try {
      response = await fetch(`${apiUrl}/api/admin/usage?days=${nextDays}`, {
        headers: {
          Authorization: `Bearer ${trimmedToken}`,
        },
        cache: "no-store",
      });
    } catch {
      setErro({ tipo: "rede", detalhe: null });
      setIsLoading(false);
      return;
    }
    const payload = (await response.json().catch(() => null)) as
      | AdminUsageResponse
      | { error?: string }
      | null;

    if (!response.ok || !payload || isErrorPayload(payload)) {
      const tipo = classificarFalha(response);
      if (tipo === "negado") registrarResposta(false);
      setErro({
        tipo,
        detalhe: payload && isErrorPayload(payload) ? (payload.error ?? null) : `HTTP ${response.status}`,
      });
      setIsLoading(false);
      return;
    }

    registrarResposta(true);
    setData(payload);
    setIsLoading(false);
  }

  useEffect(() => {
    if (!restaurado || !token.trim()) return;
    /*
     * `queueMicrotask` porque a carga chama `setState` no corpo dela, e o
     * React Compiler barra `setState` sincrono dentro de efeito. E o mesmo
     * contorno que este arquivo ja usava na restauracao do token.
     */
    queueMicrotask(() => void loadUsage(token, days));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, restaurado, recarga, days]);

  const comChave = Boolean(data && !data.semChaveDaOpenAi);
  const brl = (usd: number) => formatarReais(usd, cotacao);
  const usd = (v: number) => formatUsd(v);
  const custoDoDia = new Map((data?.costs.daily ?? []).map((d) => [d.date, d.amount]));
  const diasDoUso = data?.usage.daily ?? [];
  const interno = data?.internalUsage;
  const maxObra = Math.max(0, ...obras.map((o) => o.estimatedCostUsd));
  const pessoasDoCusto = interno?.pessoas ?? [];
  const maxPessoa = Math.max(0, ...pessoasDoCusto.map((p) => p.estimatedCostUsd));
  const maxFluxo = Math.max(0, ...(interno?.flows ?? []).map((x) => x.estimatedCostUsd));
  const maxTarefa = Math.max(0, ...(interno?.tasks ?? []).map((x) => x.estimatedCostUsd));
  const itens = [...(data?.costs.lineItems ?? [])].sort((a, b) => b.amount - a.amount);
  const tokensDoModelo = (m: AdminUsageResponse["usage"]["models"][number]) => m.inputTokens + m.outputTokens;
  const totais = data?.usage.totals;

  useCabecaDoAdmin({
    atualizadoEm: data?.generatedAt,
    carregando: isLoading,
    extra: <Segmento rotulo="Período" valor={String(days)} onTroca={(v) => setDays(Number(v))} opcoes={[7, 14, 30].map((p) => ({ valor: String(p), rotulo: `${p} dias` }))} />,
  });

  return (
    <>
      <AvisoDaCarga fase={fase} erro={erro?.tipo} detalhe={erro?.detalhe} oque="o consumo e os custos" atualizadoEm={data?.generatedAt} onTentar={() => void loadUsage()} />

      {/*
        O TETO ABRE A TELA, e não fecha: o gasto do mês sem mostrar contra o quê
        não responde "posso rodar mais uma auditoria profunda hoje?". A cotação
        mora ao lado do consumo que ela converte.
      */}
      <div className="din-topo">
        <TetosDeGasto gastoDoMesUsd={data?.gastoDoMesUsd ?? null} cotacao={cotacao} />
        <BlocoDaCotacao onMudou={() => void loadUsage()} />
      </div>

      {/* A falta da chave da OpenAI é aviso, não erro: o que vem do banco continua na tela. */}
      {data?.semChaveDaOpenAi && (
        <div className="adm-aviso adm-aviso--info" role="status">
          <Info size={15} aria-hidden />
          <p>{data.semChaveDaOpenAi}</p>
        </div>
      )}

      {/* O real vem colado no dólar, nunca no lugar dele; sem cotação, só dólar. */}
      <section className="adm-numeros din-numeros" aria-label="Fatura do provedor no período">
        <NumeroDoPeriodo
          rotulo="Gasto"
          valor={comChave && data ? formatCurrency(data.costs.total.amount, data.costs.total.currency) : "—"}
          detalhe={comChave && data ? [brl(data.costs.total.amount), `últimos ${days} dias`].filter(Boolean).join(" · ") : data ? "sem a chave da OpenAI" : semResposta}
          serie={comChave ? diasDoUso.map((d) => custoDoDia.get(d.date) ?? 0) : undefined}
        />
        <NumeroDoPeriodo
          rotulo="Tokens"
          valor={comChave ? formatNumber(totalTokens) : "—"}
          detalhe={comChave && totais ? `${formatNumber(totais.inputTokens)} entrada / ${formatNumber(totais.outputTokens)} saída` : data ? "sem a chave da OpenAI" : semResposta}
          serie={comChave ? diasDoUso.map((d) => d.inputTokens + d.outputTokens) : undefined}
        />
        <NumeroDoPeriodo
          rotulo="Chamadas"
          valor={comChave && totais ? formatNumber(totais.requests) : "—"}
          detalhe="Chamadas de modelo registradas pela OpenAI"
          serie={comChave ? diasDoUso.map((d) => d.requests) : undefined}
        />
        <NumeroDoPeriodo
          rotulo="Cache"
          valor={comChave && totais ? formatNumber(totais.cachedTokens) : "—"}
          detalhe="Tokens de entrada com cache"
          serie={comChave ? diasDoUso.map((d) => d.cachedTokens) : undefined}
        />
      </section>

      <div className="adm-duas din-duas">
        <Bloco id="din-dia" titulo="Uso diário" acoes={<span className="adm-fraco">cada coluna é um dia; a altura é o custo</span>}>
          {comChave && data && totais && diasDoUso.length ? (
            <div className="din-onda">
              <OndaDeGasto
                key={days}
                dias={diasDoUso.map((d) => ({
                  eixo: formatDate(d.date),
                  valor: custoDoDia.get(d.date) ?? 0,
                  rotulo: (
                    <>
                      <b className="ds-num">{usd(custoDoDia.get(d.date) ?? 0)}</b> em {formatDate(d.date)} · {formatNumber(d.inputTokens + d.outputTokens)} tokens · {formatNumber(d.requests)} chamadas
                    </>
                  ),
                }))}
                padrao={
                  <>
                    <b className="ds-num">{usd(data.costs.total.amount)}</b> em {days} dias · média de {usd(data.costs.total.amount / days)} por dia
                  </>
                }
              />
              <div className="din-tokens">
                <p className="din-sub">Do que são feitos os tokens</p>
                <BarraDividida
                  key={days}
                  partes={[
                    { id: "entrada", rotulo: "Entrada, sem cache", valor: totais.inputTokens - totais.cachedTokens, texto: formatNumber(totais.inputTokens - totais.cachedTokens) },
                    { id: "cache", rotulo: "Entrada com cache", valor: totais.cachedTokens, texto: formatNumber(totais.cachedTokens) },
                    { id: "saida", rotulo: "Saída", valor: totais.outputTokens, texto: formatNumber(totais.outputTokens) },
                  ]}
                />
              </div>
            </div>
          ) : (
            <p className="adm-vazio">{!data ? semResposta : !comChave ? "Sem a chave da OpenAI, o uso diário do provedor não vem." : "Nenhum uso no período."}</p>
          )}
        </Bloco>

        <Bloco id="din-mod" titulo="Modelos" acoes={<span className="adm-fraco">tokens no período</span>}>
          {comChave && data && data.usage.models.length ? (
            <div className="din-modelos">
              {data.usage.models.length <= 3 && (
                <BarraDividida key={days} partes={data.usage.models.map((m) => ({ id: m.model, rotulo: m.model, valor: tokensDoModelo(m), texto: formatNumber(tokensDoModelo(m)) }))} />
              )}
              <div className="adm-tabela din-tabela--modelos">
                {data.usage.models.map((m) => (
                  <div key={m.model} className="adm-linha">
                    <span className="mp-mono">{m.model}</span>
                    <span className="adm-fraco ds-num din-direita">
                      {formatNumber(tokensDoModelo(m))} tokens · {plural(m.requests, "chamada", "chamadas")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="adm-vazio">{!data ? semResposta : !comChave ? "Sem a chave da OpenAI." : "Nenhum modelo retornado no período."}</p>
          )}
        </Bloco>
      </div>

      <Bloco id="din-itens" titulo="Itens de custo">
        {comChave && itens.length ? (
          <div className="adm-tabela din-tabela--itens">
            {itens.map((i) => (
              <div key={i.lineItem} className="adm-linha">
                <span>{i.lineItem}</span>
                <BarraEmbutida key={days} valor={i.amount} maximo={itens[0].amount} />
                <span className="ds-num din-direita">{formatCurrency(i.amount, i.currency)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="adm-vazio">{!data ? semResposta : !comChave ? "Sem a chave da OpenAI." : "Nenhum custo retornado no período."}</p>
        )}
      </Bloco>

      <Bloco id="din-obra" titulo="Custo por obra" acoes={interno?.amostra?.truncado ? <span className="din-selo">amostra: os {interno.amostra.limite} eventos mais recentes</span> : undefined}>
        <p className="din-lede">O mesmo consumo, cortado pela pergunta que o escritório faz: quanto custou entregar este projeto. A obra é a pasta da conversa, ou a obra da auditoria quando ela correu fora de uma conversa; conversa fora de pasta conta como obra de uma conversa só.</p>
        {!data ? (
          <p className="adm-vazio">{semResposta}</p>
        ) : !interno?.enabled ? (
          <p className="adm-vazio">Sem DATABASE_URL: o consumo por obra vem dos eventos gravados no banco.</p>
        ) : obras.length === 0 ? (
          <p className="adm-vazio">Nenhum consumo registrado no período.</p>
        ) : (
          <div className="adm-tabela din-tabela--obras">
            <div className="adm-linha din-cab">
              <span>Obra</span>
              <span />
              <span className="din-direita">Conversas</span>
              <span className="din-direita">Tokens</span>
              <span className="din-direita">Custo</span>
            </div>
            {obras.map((o) => {
              const semObra = o.origem === "sem-vinculo" || o.origem === "conversa-removida";
              return (
                <div key={o.chave} className="adm-linha">
                  <span className="adm-tit">
                    <b className={semObra ? "adm-fraco" : undefined}>{o.obra}</b>
                    <small>
                      {ORIGEM_DA_OBRA[o.origem] ?? o.origem} · {plural(o.requests, "chamada", "chamadas")}
                    </small>
                  </span>
                  <BarraEmbutida key={days} valor={o.estimatedCostUsd} maximo={maxObra} />
                  <span className="adm-fraco ds-num din-direita">{o.conversas || "—"}</span>
                  <span className="adm-fraco ds-num din-direita">{formatNumber(o.totalTokens)}</span>
                  <span className="ds-num din-direita din-custo">
                    {usd(o.estimatedCostUsd)}
                    {brl(o.estimatedCostUsd) && <small>{brl(o.estimatedCostUsd)}</small>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Bloco>

      <Bloco id="din-pessoa" titulo="Custo por pessoa" acoes={interno?.amostra?.truncado ? <span className="din-selo">amostra: os {interno.amostra.limite} eventos mais recentes</span> : undefined}>
        <p className="din-lede">Quem gastou no período. A ficha da pessoa, em Pessoas, mostra o gasto dia a dia e o que ela fez.</p>
        {!data ? (
          <p className="adm-vazio">{semResposta}</p>
        ) : !interno?.enabled ? (
          <p className="adm-vazio">Sem DATABASE_URL: o consumo por pessoa vem dos eventos gravados no banco.</p>
        ) : pessoasDoCusto.length === 0 ? (
          <p className="adm-vazio">Nenhum consumo registrado no período.</p>
        ) : (
          <div className="adm-tabela din-tabela--obras">
            <div className="adm-linha din-cab">
              <span>Pessoa</span>
              <span />
              <span className="din-direita">Chamadas</span>
              <span className="din-direita">Tokens</span>
              <span className="din-direita">Custo</span>
            </div>
            {pessoasDoCusto.map((p) => (
              <div key={p.email} className="adm-linha">
                <span className="adm-tit">
                  <b className={p.email === "sem dono" ? "adm-fraco" : undefined}>{p.email}</b>
                  {p.email === "sem dono" && <small>chamadas sem pessoa identificada (rotinas do sistema)</small>}
                </span>
                <BarraEmbutida key={days} valor={p.estimatedCostUsd} maximo={maxPessoa} />
                <span className="adm-fraco ds-num din-direita">{formatNumber(p.requests)}</span>
                <span className="adm-fraco ds-num din-direita">{formatNumber(p.totalTokens)}</span>
                <span className="ds-num din-direita din-custo">
                  {usd(p.estimatedCostUsd)}
                  {brl(p.estimatedCostUsd) && <small>{brl(p.estimatedCostUsd)}</small>}
                </span>
              </div>
            ))}
          </div>
        )}
      </Bloco>

      <Bloco
        id="din-int"
        titulo="Uso interno por tarefa"
        acoes={
          interno?.enabled ? (
            <span className="ds-num din-interno-total">
              {formatNumber(interno.totals.requests)} eventos · {interno.totals.unpricedRequests > 0 ? "≥ " : ""}
              {usd(interno.totals.estimatedCostUsd)}
              {brl(interno.totals.estimatedCostUsd) ? ` · ${brl(interno.totals.estimatedCostUsd)}` : ""}
            </span>
          ) : undefined
        }
      >
        <p className="din-lede">Eventos gravados pelo Nexo por fluxo, tarefa e chamada de IA.</p>
        {/* O total só se anuncia fechado quando todo evento tem preço: sem preço não é de graça. */}
        {interno?.enabled && interno.totals.unpricedRequests > 0 && (
          <p className="din-ressalva">
            <Info size={14} aria-hidden />
            <span>
              {formatNumber(interno.totals.unpricedRequests)} de {formatNumber(interno.totals.requests)} chamadas não têm preço na tabela e entram como zero ({formatNumber(interno.totals.unpricedTokens)} tokens fora da conta). Sem preço não é de graça — some o modelo em <span className="mp-mono">lib/ai-precos.ts</span>:{" "}
              <span className="mp-mono">{interno.unpricedModels.join(", ")}</span>.
            </span>
          </p>
        )}
        {!data ? (
          <p className="adm-vazio">{semResposta}</p>
        ) : !interno?.enabled ? (
          <p className="adm-vazio">Registro interno indisponível. Configure DATABASE_URL e aplique o schema do Prisma.</p>
        ) : (
          <div className="din-colunas">
            <div className="adm-tabela din-tabela--fluxos">
              <div className="adm-linha din-cab">
                <span>Fluxo</span>
                <span />
                <span className="din-direita">Custo est.</span>
              </div>
              {interno.flows.map((x) => (
                <div key={x.flow} className="adm-linha">
                  <span className="adm-tit">
                    <b className="mp-mono">{x.flow}</b>
                    <small className="ds-num">
                      {formatNumber(x.totalTokens)} tokens · {formatNumber(x.requests)} chamadas
                      {x.unpricedRequests > 0 ? ` · ${formatNumber(x.unpricedRequests)} sem preço` : ""}
                    </small>
                  </span>
                  <BarraEmbutida key={days} valor={x.estimatedCostUsd} maximo={maxFluxo} />
                  <span className="ds-num din-direita">
                    {x.unpricedRequests > 0 ? "≥ " : ""}
                    {usd(x.estimatedCostUsd)}
                  </span>
                </div>
              ))}
            </div>
            <div className="adm-tabela din-tabela--tarefas">
              <div className="adm-linha din-cab">
                <span>Tarefa</span>
                <span />
                <span className="din-direita">Custo est.</span>
              </div>
              {interno.tasks.length ? (
                interno.tasks.map((x) => (
                  <div key={`${x.flow}-${x.taskId || x.taskLabel}`} className="adm-linha">
                    <span className="adm-tit">
                      <b>{x.taskLabel || x.taskId || "—"}</b>
                      <small>
                        <span className="mp-mono">{x.flow}</span> · {formatNumber(x.totalTokens)} tokens
                      </small>
                    </span>
                    <BarraEmbutida key={days} valor={x.estimatedCostUsd} maximo={maxTarefa} />
                    <span className="ds-num din-direita">{usd(x.estimatedCostUsd)}</span>
                  </div>
                ))
              ) : (
                <p className="adm-vazio">Nenhum evento interno no período.</p>
              )}
            </div>
          </div>
        )}
      </Bloco>
    </>
  );
}
