"use client";

import { CircleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { useAdminToken } from "@/components/admin/admin-token";
import { useCabecaDoAdmin } from "@/components/telas/admin/casca";
import { AvisoDaCarga, Bloco, Numero, quandoCurto, Situacao } from "@/components/telas/admin/pecas";
import { TUDO_EM_ORDEM } from "@/lib/atencao-do-admin";
import { classificarFalha, faseDaCarga, type FalhaDaCarga } from "@/lib/estado-da-carga";
import { plural } from "@/lib/plural";

type OverviewResponse = {
  /** O veredito derivado do estado do sistema (A.4). */
  status?: {
    veredito: "operacional" | "degradado" | "parado";
    linha: string;
    motivo: string;
  };
  atencao?: Array<{ chave: string; texto: string; gravidade: "critico" | "aviso" }>;
  /** O uso de verdade (03/10/2026): quem entrou, e quanto do convite virou uso. Ver [[lib/uso-do-escritorio.ts]]. */
  uso?: { ativos7: number; ativos30: number; serieAtivos: { dias: string[]; ativos: number[] }; funil: { convidados: number; entraram: number; auditaram: number } };
  /** Uma contagem por dia de Brasília, os últimos 14 dias. */
  series?: { dias: string[]; auditorias: number[]; falhas: number[]; lds: number[]; eventosLd: number[] };
  acoes?: Array<{
    id: string;
    quando: string;
    quem: string;
    acao: string;
    alcance: string;
  }>;
  totals: {
    users: number;
    activeUsers: number;
    admins: number;
    audits: number;
    failedAudits: number;
    recentAudits: number;
    ldDrafts: number;
    generatedLds: number;
    recentLds: number;
    ldEvents: number;
    recentLdEvents: number;
  };
  latestAudits: Array<{
    id: string;
    title: string;
    projectName: string;
    status: string;
    auditMode: string;
    analysisLevel: string;
    createdAt: string;
    totalFindings: number;
  }>;
  latestLds: Array<{
    id: string;
    title: string;
    projectCode: string;
    workName: string;
    status: string;
    userEmail: string;
    uploadedFileCount: number;
    updatedAt: string;
  }>;
  generatedAt: string;
};

function isErrorPayload(payload: OverviewResponse | { error?: string }): payload is { error?: string } {
  return "error" in payload;
}

export default function AdminHomePage() {
  /** O detalhe do cartão quando ainda não houve consulta — nunca um número. */
  const semDados = "Sem resposta do servidor ainda";
  /*
   * O token vem do trilho, nao desta tela -- ver [[components/admin/admin-token.tsx]].
   * Antes, cada uma das sete telas tinha o seu, e o campo de senha era a
   * primeira coisa que se via em todas elas.
   */
  const { token, restaurado, recarga, registrarResposta } = useAdminToken();
  const [data, setData] = useState<OverviewResponse | null>(null);
  /*
   * A FALHA TEM TIPO, e os dados de antes FICAM (P02). Era `setData(null)` a
   * cada erro: uma queda de rede apagava a tela e ela voltava a "Aguardando
   * consulta", como se nada tivesse sido pedido.
   */
  const [erro, setErro] = useState<{ tipo: FalhaDaCarga; detalhe: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const fase = faseDaCarga({
    restaurado,
    token,
    carregando: loading,
    erro: erro?.tipo ?? null,
    temDados: Boolean(data),
  });
  /** O que as listas dizem enquanto não há resposta — nunca "nenhum". */
  const semResposta =
    fase === "sem-token" ? "Aguardando o token." : fase === "erro" ? "Não carregado." : "Carregando…";
  /*
   * Só o que NÃO tem métrica em cima.
   *
   * Usuários, LDs e Auditorias saíram daqui: viraram destino dos próprios
   * cartões de número, e antes apareciam três vezes na mesma tela — na barra de
   * navegação, na faixa de métricas e nesta fileira. Repetir o mesmo caminho
   * três vezes não é redundância útil, é ruído que faz a tela parecer maior do
   * que é.
   */
  async function loadOverview(nextToken = token) {
    const trimmedToken = nextToken.trim();

    if (!trimmedToken) return;

    setLoading(true);
    setErro(null);

    let response: Response;
    try {
      response = await fetch("/api/admin/overview", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${trimmedToken}` },
      });
    } catch {
      setErro({ tipo: "rede", detalhe: null });
      setLoading(false);
      return;
    }
    const payload = (await response.json().catch(() => null)) as OverviewResponse | { error?: string } | null;
    if (!response.ok || !payload || isErrorPayload(payload)) {
      const tipo = classificarFalha(response);
      if (tipo === "negado") registrarResposta(false);
      setErro({
        tipo,
        detalhe: payload && isErrorPayload(payload) ? (payload.error ?? null) : `HTTP ${response.status}`,
      });
      setLoading(false);
      return;
    }
    registrarResposta(true);
    setData(payload);
    setLoading(false);
  }

  useEffect(() => {
    if (!restaurado || !token.trim()) return;
    /*
     * `queueMicrotask` porque a carga chama `setState` no corpo dela, e o
     * React Compiler barra `setState` sincrono dentro de efeito. E o mesmo
     * contorno que este arquivo ja usava na restauracao do token.
     */
    queueMicrotask(() => void loadOverview(token));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, restaurado, recarga]);

  useCabecaDoAdmin({ atualizadoEm: data?.generatedAt, carregando: loading });
  const t = data?.totals;
  const sr = data?.series;

  return (
    <>
      <AvisoDaCarga
        fase={fase}
        erro={erro?.tipo}
        detalhe={erro?.detalhe}
        oque="os números do painel"
        atualizadoEm={data?.generatedAt}
        onTentar={() => void loadOverview()}
      />

      {/*
        O QUE EXIGE AÇÃO abre o cockpit. Só entra o que impede o produto de
        funcionar agora (`lib/atencao-do-admin.ts`): faixa que lista pendência
        que ninguém precisa resolver é faixa que se aprende a ignorar. O
        veredito não se repete aqui: ele mora no trilho.
      */}
      {data ? (
        <section className={`adm-atencao${(data.atencao ?? []).length ? " adm-atencao--aviso" : ""}`} aria-label="O que exige ação">
          {(data.atencao ?? []).length === 0 ? (
            <p className="adm-atencao-ok">
              <i aria-hidden />
              {TUDO_EM_ORDEM}
            </p>
          ) : (
            <ul>
              {(data.atencao ?? []).map((item) => (
                <li key={item.chave} className={`adm-atencao-item adm-atencao-item--${item.gravidade}`}>
                  <CircleAlert size={14} aria-hidden />
                  {item.texto}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* ZERO NÃO É "NÃO SEI": sem resposta do servidor, o número é "—". */}
      <section className="adm-numeros" aria-label="Números">
        {/* "Ativos" é quem ENTROU, não conta habilitada (03/10/2026): o acesso é registrado desde essa data. */}
        <Numero
          rotulo="Ativos em 7 dias"
          valor={data?.uso ? data.uso.ativos7 : "—"}
          detalhe={data?.uso && t ? `${data.uso.ativos30} em 30 dias · ${plural(t.activeUsers, "conta", "contas")}` : semDados}
          para="Pessoas"
          href="/admin/pessoas"
          serie={data?.uso?.serieAtivos.ativos}
        />
        <Numero rotulo="Auditorias" valor={t ? t.audits : "—"} detalhe={t ? `${t.recentAudits} nos últimos 7 dias` : semDados} para="Dados" href="/admin/dados" serie={sr?.auditorias} />
        <Numero rotulo="Falhas" valor={t ? t.failedAudits : "—"} detalhe={t ? "auditorias com erro" : semDados} alerta={Boolean(t && t.failedAudits > 0)} para="as auditorias que falharam" href="/admin/dados?status=FAILED" serie={sr?.falhas} />
        <Numero rotulo="LDs" valor={t ? t.ldDrafts : "—"} detalhe={t ? `${plural(t.generatedLds, "gerada", "geradas")} · ${t.recentLds} nos últimos 7 dias` : semDados} para="Dados" href="/admin/dados" serie={sr?.lds} />
        <Numero rotulo="Eventos LD" valor={t ? t.ldEvents : "—"} detalhe={t ? `${t.recentLdEvents} nos últimos 7 dias` : semDados} para="Dados" href="/admin/dados" serie={sr?.eventosLd} />
      </section>

      {data?.uso && (
        <section className="adm-funil" aria-label="Adoção do escritório">
          <span className="adm-funil-titulo">Adoção</span>
          {(
            [
              ["no escritório", data.uso.funil.convidados, data.uso.funil.convidados],
              ["já usaram", data.uso.funil.entraram, data.uso.funil.convidados],
              ["já auditaram", data.uso.funil.auditaram, data.uso.funil.convidados],
            ] as const
          ).map(([rotulo, n, de], i) => (
            <span key={rotulo} className="adm-funil-passo">
              {i > 0 && <i aria-hidden>→</i>}
              <b className="ds-num">{n}</b> {rotulo}
              {i > 0 && de > 0 && <small className="ds-num">{Math.round((n / de) * 100)}%</small>}
            </span>
          ))}
        </section>
      )}

      <div className="adm-duas">
        <Bloco id="adm-aud" titulo="Auditorias recentes">
          {data ? (
            data.latestAudits.length ? (
              <div className="adm-tabela adm-tabela--aud">
                {data.latestAudits.map((audit) => (
                  <div key={audit.id} className="adm-linha">
                    {/* o projeto só aparece quando acrescenta: derivados da mesma obra, título e projeto são a mesma frase */}
                    <span className="adm-tit">
                      <b>{audit.title}</b>
                      {audit.projectName !== audit.title && <small>{audit.projectName}</small>}
                    </span>
                    <span className="adm-fraco">{audit.auditMode}</span>
                    <span className={`adm-fraco ds-num${audit.status === "FAILED" ? " adm-nada" : ""}`}>{audit.status === "FAILED" ? "—" : plural(audit.totalFindings, "achado", "achados")}</span>
                    <span className="adm-fraco ds-num">{quandoCurto(audit.createdAt)}</span>
                    <Situacao status={audit.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="adm-vazio">Nenhuma auditoria registrada.</p>
            )
          ) : (
            <p className="adm-vazio">{semResposta}</p>
          )}
        </Bloco>

        <Bloco id="adm-ld" titulo="LDs recentes">
          {data ? (
            data.latestLds.length ? (
              <div className="adm-tabela adm-tabela--ld">
                {data.latestLds.map((ld) => (
                  <div key={ld.id} className="adm-linha">
                    <span className="adm-tit">
                      <b className="mp-mono">{ld.projectCode || ld.title || "sem código"}</b>
                      <small>{ld.workName || "Obra não preenchida"}</small>
                    </span>
                    <span className="adm-fraco ds-num">{plural(ld.uploadedFileCount, "PDF não armazenado", "PDFs não armazenados")}</span>
                    <span className="adm-fraco ds-num">{quandoCurto(ld.updatedAt)}</span>
                    <Situacao status={ld.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="adm-vazio">Nenhuma LD registrada.</p>
            )
          ) : (
            <p className="adm-vazio">{semResposta}</p>
          )}
        </Bloco>
      </div>

      {/* QUEM FEZ O QUÊ: com o expurgo, não registrar deixou de ser desconforto e virou risco */}
      <Bloco id="adm-acoes" titulo="Últimas ações administrativas">
        {data ? (
          (data.acoes ?? []).length ? (
            <div className="adm-tabela adm-tabela--acoes">
              {(data.acoes ?? []).map((acao) => (
                <div key={acao.id} className="adm-linha">
                  <span>
                    {acao.acao}
                    {acao.alcance && <span className="mp-mono adm-fraco"> · {acao.alcance}</span>}
                  </span>
                  <span className="mp-mono adm-fraco">{acao.quem}</span>
                  <span className="adm-fraco ds-num">{quandoCurto(acao.quando)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="adm-vazio">Nenhuma ação registrada ainda.</p>
          )
        ) : (
          <p className="adm-vazio">{semResposta}</p>
        )}
      </Bloco>
    </>
  );
}
