"use client";

import { AnimatePresence, motion } from "motion/react";
import { Activity, Check, CircleAlert } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { useAdminToken } from "@/components/admin/admin-token";
import { Botao, Girando } from "@/components/ds/basicos";
import { classificarFalha, faseDaCarga, type FalhaDaCarga } from "@/lib/estado-da-carga";
import { formatarDataHora, formatarDiaMes } from "@/lib/fuso-de-brasilia";
import { normalizarMetas, validarMetas, type MetasDeQualidade } from "@/lib/meta-de-qualidade";
import { useTempo } from "@/lib/ds/tempo";

import { RITMO, SUAVE } from "../comum/ritmo";
import "./motor.css";

/*
 * A CONFIGURAÇÃO DO MOTOR no sistema novo. A lógica é a de
 * `components/admin/conteudo/configuracao.tsx` (/api/admin/config: GET lê,
 * PATCH save/reset/metas grava, POST testa o provedor). As duas tabelas de
 * fluxo de antes — o editor de modelos e o painel de provedores — eram os
 * MESMOS fluxos em duas listas; aqui viram uma só, sem perder coluna nem ação.
 */

type Impressao = { configured: boolean; length: number; prefix: string; suffix: string };
type Config = {
  runtime: { nodeEnv: string; mockMode: boolean; clientDemoAllowed: boolean; primaryProvider?: string; model: string; allowedOrigins: string };
  aiFlows: Array<{ id: string; label: string; provider: string; model: string; keyConfigured: boolean; enabled?: boolean; placeholderOnly?: boolean; note?: string }>;
  modelSettings: {
    databaseConfigured: boolean;
    options: string[];
    flows: Array<{ flowId: string; label: string; provider: string; effectiveModel: string; overrideModel: string; hasOverride: boolean; updatedAt?: string; updatedBy?: string | null; notes: string }>;
  };
  aiHealth: { externalConnectivityChecked: boolean; note: string; lastFailures: Array<{ provider: string; flow: string; model: string; category: string; message: string; occurredAt: string }>; statusStorage: string };
  metaQualidade: { metas: MetasDeQualidade; origem: "banco" | "ambiente" | "nenhuma"; databaseConfigured: boolean };
  secrets: Record<string, boolean>;
  secretFingerprints?: { openaiApiKey?: Impressao; openaiAdminKey?: Impressao };
  generatedAt: string;
};
type Teste = {
  ok: boolean;
  provider: string;
  model: string;
  durationMs?: number;
  category?: string;
  message?: string;
  rawStatus?: number;
  rawCode?: string;
  rawType?: string;
  rawMessage?: string;
  keyFingerprint?: Impressao;
  testedAt: string;
};

const impressao = (f?: Impressao) => (f?.configured ? `${f.prefix}...${f.suffix} (${f.length} chars)` : "ausente");

/** O fluxo do runtime que registra a falha de cada fluxo configurável. */
function fluxoDoRuntime(id: string) {
  if (id.startsWith("audit-") && id !== "audit-chat") return "audit";
  if (id === "ld-primary" || id === "ld-fallback") return "ld-extraction";
  return id;
}

/** Agrupa pelos próprios rótulos: "Auditoria padrão - …", "Auditoria profunda - …", o resto. */
function grupoDo(rotulo: string) {
  if (/^Auditoria padrão/i.test(rotulo)) return "Auditoria padrão";
  if (/^Auditoria profunda(?! de memorial)/i.test(rotulo)) return "Auditoria profunda";
  if (/^Auditoria/i.test(rotulo)) return "Auditoria";
  return "Conversa e volumes";
}

const quandoFoi = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(m)) return "";
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  if (m < 1440) return `há ${Math.floor(m / 60)} h`;
  return formatarDiaMes(iso);
};

export function useConfiguracao() {
  const { token, restaurado, recarga, registrarResposta } = useAdminToken();
  const [dados, setDados] = useState<Config | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroDaCarga, setErroDaCarga] = useState<{ tipo: FalhaDaCarga; detalhe: string | null } | null>(null);
  const [carregadoEm, setCarregadoEm] = useState<string | null>(null);
  const fase = faseDaCarga({ restaurado, token, carregando, erro: erroDaCarga?.tipo ?? null, temDados: Boolean(dados) });

  async function carregar(t = token) {
    if (!t.trim()) return;
    setCarregando(true);
    setErroDaCarga(null);
    try {
      let r: Response;
      try {
        r = await fetch("/api/admin/config", { cache: "no-store", headers: { Authorization: `Bearer ${t.trim()}` } });
      } catch {
        setErroDaCarga({ tipo: "rede", detalhe: null });
        return;
      }
      const corpo = (await r.json().catch(() => null)) as (Config & { error?: string }) | null;
      if (!r.ok || !corpo || "error" in corpo) {
        const tipo = classificarFalha(r);
        if (tipo === "negado") registrarResposta(false);
        setErroDaCarga({ tipo, detalhe: corpo?.error ?? `HTTP ${r.status}` });
        return;
      }
      registrarResposta(true);
      setDados(corpo);
      setCarregadoEm(new Date().toISOString());
    } catch {
      setErroDaCarga({ tipo: "formato", detalhe: null });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (!restaurado || !token.trim()) return;
    queueMicrotask(() => void carregar(token));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, restaurado, recarga]);

  /** PATCH no /api/admin/config; devolve a configuração nova ou lança a frase do servidor. */
  async function corrigir(corpo: Record<string, unknown>, falha: string) {
    const r = await fetch("/api/admin/config", {
      method: "PATCH",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const resposta = (await r.json().catch(() => null)) as { config?: Config; error?: string } | null;
    if (!r.ok || !resposta?.config) throw new Error(resposta?.error ?? falha);
    setDados(resposta.config);
    return resposta.config;
  }

  async function testar(): Promise<Teste> {
    const r = await fetch("/api/admin/config", { method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${token.trim()}` } });
    const corpo = (await r.json().catch(() => null)) as (Teste & { error?: string }) | null;
    if (!corpo || corpo.error) throw new Error(corpo?.error ?? "Não foi possível testar o provedor ativo.");
    void carregar(token);
    return corpo;
  }

  return { dados, fase, erroDaCarga, carregadoEm, carregando, carregar: () => void carregar(), corrigir, testar };
}

type Fluxo = Config["modelSettings"]["flows"][number];

function LinhaDoFluxo({ f, saude, falha, opcoes, comBanco, onCorrigir }: { f: Fluxo; saude?: Config["aiFlows"][number]; falha?: Config["aiHealth"]["lastFailures"][number]; opcoes: string; comBanco: boolean; onCorrigir: ReturnType<typeof useConfiguracao>["corrigir"] }) {
  const { k } = useTempo();
  const [editando, setEditando] = useState(false);
  const [modelo, setModelo] = useState(f.overrideModel || f.effectiveModel);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const estado = saude && !saude.keyConfigured ? "sem-chave" : saude?.placeholderOnly ? "reservado" : "pronto";
  const mudou = modelo.trim() !== (f.overrideModel || f.effectiveModel);

  async function mandar(corpo: Record<string, unknown>, frase: string) {
    setSalvando(true);
    setErro("");
    try {
      const nova = await onCorrigir(corpo, frase);
      const atual = nova.modelSettings.flows.find((x) => x.flowId === f.flowId);
      setModelo(atual ? atual.overrideModel || atual.effectiveModel : modelo);
      setEditando(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : frase);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={`mot-fluxo${editando ? " mot-fluxo--aberto" : ""}`}>
      <div className="adm-linha mot-fluxo-linha">
        <span className="adm-tit">
          <b>{f.label}</b>
          <small>{f.hasOverride ? `override salvo${f.updatedAt ? ` em ${formatarDataHora(f.updatedAt)}` : ""}` : "padrão do ambiente"}</small>
        </span>
        <span className="mp-mono adm-fraco">{f.provider}</span>
        <span className="mp-mono">{f.effectiveModel || "—"}</span>
        <span className={`mot-estado mot-estado--${estado}`}>
          <i aria-hidden />
          {estado === "pronto" ? "pronto" : estado === "reservado" ? "modelo de espaço reservado" : "sem chave"}
        </span>
        <span className="adm-tit mot-falha">
          {falha ? (
            <>
              <b className="mot-falha-cat">
                {falha.category} <span className="ds-num adm-fraco">{quandoFoi(falha.occurredAt)}</span>
              </b>
              <small title={falha.message}>{falha.message}</small>
            </>
          ) : (
            <small className="mp-mono">sem falhas registradas</small>
          )}
        </span>
        <Botao variante="quiet" tamanho="sm" className="mot-trocar" onClick={() => setEditando((v) => !v)} aria-expanded={editando} disabled={!comBanco} title={comBanco ? undefined : "Sem DATABASE_URL: o modelo vem só do ambiente"}>
          {editando ? "Fechar" : "Trocar modelo"}
        </Botao>
      </div>
      <AnimatePresence initial={false}>
        {editando && (
          <motion.form
            className="mot-fluxo-edicao"
            onSubmit={(e) => {
              e.preventDefault();
              if (!modelo.trim()) return setErro("Informe o modelo antes de salvar.");
              void mandar({ action: "save", flowId: f.flowId, model: modelo.trim() }, "Não foi possível salvar o modelo.");
            }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: RITMO.troca * k, ease: SUAVE }}
          >
            <label>
              <span>Modelo para {f.label}</span>
              <input list={opcoes} value={modelo} onChange={(e) => setModelo(e.target.value)} aria-label={`Modelo para ${f.label}`} disabled={salvando} />
            </label>
            <Botao variante="ghost" tamanho="sm" type="submit" disabled={salvando || (!mudou && f.hasOverride)} title="Salvar modelo">
              {salvando && <Girando tamanho={12} />}
              Salvar modelo
            </Botao>
            {f.hasOverride && (
              <Botao variante="quiet" tamanho="sm" disabled={salvando} onClick={() => void mandar({ action: "reset", flowId: f.flowId }, "Não foi possível restaurar o padrão.")} title="Voltar ao padrão/env">
                Voltar ao padrão
              </Botao>
            )}
            {erro && <p className="din-erro-linha">{erro}</p>}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FluxosDoMotor({ c }: { c: ReturnType<typeof useConfiguracao> }) {
  const d = c.dados;
  const fluxos = d?.modelSettings.flows ?? [];
  const grupos = [...new Set(fluxos.map((f) => grupoDo(f.label)))];
  return (
    <section className="adm-bloco" aria-labelledby="mot-fluxos">
      <header>
        <h2 id="mot-fluxos">Modelos e provedores por fluxo</h2>
        {d && <span className="adm-fraco">{fluxos.length} fluxos{d.modelSettings.databaseConfigured ? "" : " · sem DATABASE_URL"}</span>}
      </header>
      <p className="din-lede">Provedor ativo, modelo, chave e última falha conhecida por fluxo. Não executa chamadas externas ao carregar. Salva somente nomes de modelos no banco. Chaves continuam protegidas no ambiente do backend.</p>
      {d && (
        <p className="mot-procedencia">
          {d.aiHealth.note} {d.aiHealth.statusStorage}
        </p>
      )}
      <datalist id="mot-modelos">
        {d?.modelSettings.options.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      {!d ? (
        <p className="adm-vazio">{c.fase === "sem-token" ? "Aguardando o token de administração." : c.fase === "erro" ? "Não carregado." : "Carregando…"}</p>
      ) : (
        <div className="adm-tabela mot-tabela--fluxos">
          <div className="adm-linha din-cab mot-fluxo-linha">
            <span>Fluxo</span>
            <span>Provider</span>
            <span>Efetivo</span>
            <span>Status</span>
            <span>Última falha</span>
            <span />
          </div>
          {grupos.map((g) => (
            <Fragment key={g}>
              <p className="mot-grupo">{g}</p>
              {fluxos
                .filter((f) => grupoDo(f.label) === g)
                .map((f) => (
                  <LinhaDoFluxo
                    key={f.flowId}
                    f={f}
                    saude={d.aiFlows.find((x) => x.id === f.flowId)}
                    falha={d.aiHealth.lastFailures.find((x) => x.flow === fluxoDoRuntime(f.flowId) && x.provider === f.provider)}
                    opcoes="mot-modelos"
                    comBanco={d.modelSettings.databaseConfigured}
                    onCorrigir={c.corrigir}
                  />
                ))}
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}

export function MetasETeste({ c }: { c: ReturnType<typeof useConfiguracao> }) {
  const d = c.dados;
  const metas = d?.metaQualidade.metas;
  const temMeta = Boolean(metas && (metas.falsoPositivoMax > 0 || metas.coberturaMin > 0));
  const [fp, setFp] = useState<string | null>(null);
  const [cob, setCob] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvas, setSalvas] = useState(false);
  const [erro, setErro] = useState("");
  const [testando, setTestando] = useState(false);
  const [teste, setTeste] = useState<Teste | null>(null);
  const [erroDoTeste, setErroDoTeste] = useState("");
  // o rascunho nasce do que o servidor declarou, até alguém digitar
  const valorFp = fp ?? (metas?.falsoPositivoMax ? String(metas.falsoPositivoMax) : "");
  const valorCob = cob ?? (metas?.coberturaMin ? String(metas.coberturaMin) : "");
  const erros = validarMetas(normalizarMetas({ falsoPositivoMax: valorFp, coberturaMin: valorCob }));

  async function salvar() {
    setSalvando(true);
    setSalvas(false);
    setErro("");
    try {
      await c.corrigir({ action: "metas", metas: { falsoPositivoMax: valorFp, coberturaMin: valorCob } }, "Não foi possível salvar as metas.");
      setFp(null);
      setCob(null);
      setSalvas(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar as metas.");
    } finally {
      setSalvando(false);
    }
  }

  async function testar() {
    setTestando(true);
    setTeste(null);
    setErroDoTeste("");
    try {
      setTeste(await c.testar());
    } catch (e) {
      setErroDoTeste(e instanceof Error ? e.message : "Não foi possível testar o provedor ativo.");
    } finally {
      setTestando(false);
    }
  }

  return (
    <div className="mot-duas">
      <section className="adm-bloco" aria-labelledby="mot-metas" id="mot-metas-form">
        <header>
          <h2 id="mot-metas">Metas de qualidade</h2>
          {d && (
            <span className={`mot-estado ${temMeta ? "mot-estado--pronto" : "mot-estado--nada"}`}>
              <i aria-hidden />
              {temMeta ? "metas declaradas" : "meta não declarada — o painel não julga"}
            </span>
          )}
        </header>
        <p className="din-lede">O painel de qualidade mostra as taxas; sem meta declarada ele não as julga — e não inventa uma. Declarada aqui, ela vira a régua da série semanal: dentro fica verde, fora fica âmbar, e o que não tem meta continua sem cor.</p>
        <form
          className="mot-metas-form"
          onSubmit={(e) => {
            e.preventDefault();
            void salvar();
          }}
        >
          <label>
            <span>Falso positivo, no máximo (%)</span>
            <input value={valorFp} onChange={(e) => (setSalvas(false), setFp(e.target.value))} placeholder="ex.: 10" inputMode="decimal" disabled={!d || salvando} />
          </label>
          <label>
            <span>Cobertura de revisão, no mínimo (%)</span>
            <input value={valorCob} onChange={(e) => (setSalvas(false), setCob(e.target.value))} placeholder="ex.: 40" inputMode="decimal" disabled={!d || salvando} />
          </label>
          <Botao variante="ghost" tamanho="sm" type="submit" disabled={!d || !d.metaQualidade.databaseConfigured || salvando || erros.length > 0}>
            {salvando && <Girando tamanho={12} />}
            Salvar metas
          </Botao>
          {salvas && (
            <span className="din-salvo">
              <Check size={13} aria-hidden /> salvas agora
            </span>
          )}
        </form>
        {erros.map((m) => (
          <p key={m} className="din-aviso-linha">
            {m}
          </p>
        ))}
        {erro && <p className="din-erro-linha">{erro}</p>}
        {temMeta && metas?.declaradaEm && (
          <p className="mot-declarada">
            <span className="din-origem-ponto din-origem-ponto--banco" aria-hidden />
            declaradas em {formatarDataHora(metas.declaradaEm)}
            {metas.declaradaPor && (
              <>
                {" "}
                por <span className="mp-mono">{metas.declaradaPor}</span>
              </>
            )}
          </p>
        )}
      </section>

      <section className="adm-bloco" aria-labelledby="mot-teste">
        <header>
          <h2 id="mot-teste">Teste de conectividade do provider ativo</h2>
        </header>
        <p className="din-lede">Executa uma chamada mínima real apenas quando você clicar.</p>
        <div className="mot-teste">
          <Botao variante="ghost" tamanho="sm" onClick={() => void testar()} disabled={testando || !d}>
            {testando ? <Girando tamanho={12} /> : <Activity size={13} />}
            {testando ? "Testando" : "Testar provider"}
          </Botao>
          {teste && (
            <div className={`mot-resultado${teste.ok ? "" : " mot-resultado--falha"}`} role={teste.ok ? "status" : "alert"}>
              <p>
                {teste.ok ? <i className="mot-ok" aria-hidden /> : <CircleAlert size={14} aria-hidden />}
                {teste.ok ? `OK em ${teste.durationMs ?? "—"} ms` : (teste.message ?? "Falha no teste")}
              </p>
              <p className="mp-mono mot-resultado-campos">
                <span>
                  {teste.provider} · {teste.model} · {formatarDataHora(teste.testedAt)}
                </span>
                {!teste.ok && (
                  <>
                    <span>key: {impressao(teste.keyFingerprint)}</span>
                    <span>status: {teste.rawStatus ?? "—"}</span>
                    <span>code: {teste.rawCode ?? "—"}</span>
                    <span>type: {teste.rawType ?? "—"}</span>
                    <span>raw: {teste.rawMessage ?? "—"}</span>
                  </>
                )}
              </p>
            </div>
          )}
          {erroDoTeste && <p className="din-erro-linha">{erroDoTeste}</p>}
        </div>
      </section>
    </div>
  );
}

export function RuntimeEChaves({ c }: { c: ReturnType<typeof useConfiguracao> }) {
  const d = c.dados;
  const runtime: [string, string][] = d
    ? [
        ["Ambiente", d.runtime.nodeEnv || "—"],
        ["Provider principal", d.runtime.primaryProvider ?? "—"],
        ["Mock mode", d.runtime.mockMode ? "ativo" : "inativo"],
        ["Demo pelo cliente", d.runtime.clientDemoAllowed ? "permitida" : "bloqueada"],
        ["Modelo do chat", d.runtime.model || "—"],
        ["Origins", d.runtime.allowedOrigins || "—"],
      ]
    : [];
  // cada chave pelo nome da variável de ambiente, que é como se procura no painel da Render
  const NOMES: Record<string, string> = { primaryApiKeyConfigured: "chave do provider principal", openaiApiKeyConfigured: "OPENAI_API_KEY", openaiAdminKeyConfigured: "OPENAI_ADMIN_KEY", adminTokenConfigured: "NEXODOC_ADMIN_TOKEN" };
  const impressoes: Record<string, Impressao | undefined> = { openaiApiKeyConfigured: d?.secretFingerprints?.openaiApiKey, openaiAdminKeyConfigured: d?.secretFingerprints?.openaiAdminKey };
  const vazio = <p className="adm-vazio">{c.fase === "sem-token" ? "Aguardando o token de administração." : c.fase === "erro" ? "Não carregado." : "Carregando…"}</p>;
  return (
    <div className="mot-duas">
      <section className="adm-bloco" aria-labelledby="mot-runtime">
        <header>
          <h2 id="mot-runtime">Runtime</h2>
        </header>
        {d ? (
          <dl className="mot-pares">
            {runtime.map(([r, v]) => (
              <Fragment key={r}>
                <dt>{r}</dt>
                <dd className="mp-mono">{v}</dd>
              </Fragment>
            ))}
          </dl>
        ) : (
          vazio
        )}
      </section>
      <section className="adm-bloco" aria-labelledby="mot-chaves">
        <header>
          <h2 id="mot-chaves">Chaves</h2>
          <span className="adm-fraco">Leitura operacional, sem expor credenciais.</span>
        </header>
        {d ? (
          <dl className="mot-pares">
            {Object.entries(d.secrets).map(([nome, presente]) => (
              <Fragment key={nome}>
                <dt className="mp-mono">{NOMES[nome] ?? nome}</dt>
                <dd>
                  <span className={`mot-estado ${presente ? "mot-estado--pronto" : "mot-estado--sem-chave"}`}>
                    <i aria-hidden />
                    {presente ? "presente" : "ausente"}
                  </span>
                  {impressoes[nome]?.configured && <span className="mp-mono adm-fraco"> · {impressao(impressoes[nome])}</span>}
                </dd>
              </Fragment>
            ))}
          </dl>
        ) : (
          vazio
        )}
      </section>
    </div>
  );
}

