"use client";

import { useAdminToken } from "@/components/admin/admin-token";
import { useCabecaDoAdmin } from "@/components/telas/admin/casca";
import { CampoDeControle, useControles } from "@/components/telas/admin/controles";
import { FluxosDoMotor, MetasETeste, RuntimeEChaves, useConfiguracao } from "@/components/telas/admin/motor-config";
import { QualidadeDoMotor, useQualidade } from "@/components/telas/admin/motor-qualidade";
import { AvisoDaCarga } from "@/components/telas/admin/pecas";

/*
 * MOTOR: o que a auditoria está achando, e a configuração que produz isso. A
 * medida em cima, a régua embaixo: qualidade, depois vazão e limites, depois
 * modelos por fluxo, metas e o teste do provedor, e por último a referência
 * (runtime e chaves).
 */

const LIMITES = ["vazao.usuario", "vazao.global", "limites.blocosPorArquivo", "limites.saidaProfundo", "limites.concorrencia", "limites.timeoutMs"];
// os dois que mudam o que a auditoria acha entram na versão do auditor (lib/configuracao-do-auditor.ts)
const NA_VERSAO = new Set(["limites.blocosPorArquivo", "limites.saidaProfundo"]);
const numero = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

export default function AdminMotorPage() {
  const { aceito } = useAdminToken();
  const q = useQualidade();
  const c = useConfiguracao();
  const ctrl = useControles();
  useCabecaDoAdmin({ atualizadoEm: q.carregadoEm, carregando: q.carregando || c.carregando });
  const limites = LIMITES.map((k) => ctrl.retrato?.controles.find((x) => x.chave === k)).filter((x) => x !== undefined);

  return (
    <>
      <AvisoDaCarga fase={q.fase} erro={q.erro?.tipo} detalhe={q.erro?.detalhe} oque="os indicadores de qualidade" atualizadoEm={q.carregadoEm} onTentar={q.carregar} />
      <QualidadeDoMotor q={q} />

      <section className="adm-bloco" aria-labelledby="mot-vazao">
        <header>
          <h2 id="mot-vazao">Vazão e limites de leitura</h2>
        </header>
        <p className="din-lede">O que a máquina aguenta e quanto ela lê. Dois destes mudam o que a auditoria acha — e por isso entram na versão do auditor.</p>
        {aceito && <AvisoDaCarga fase={ctrl.fase} erro={ctrl.erroDaCarga?.tipo} detalhe={ctrl.erroDaCarga?.detalhe} oque="os limites" atualizadoEm={ctrl.carregadoEm} onTentar={ctrl.carregar} />}
        {ctrl.retrato && !ctrl.retrato.databaseConfigured && <p className="din-aviso-linha mot-sem-banco">Sem DATABASE_URL: os limites valem pelo ambiente, e nada do que for declarado aqui é gravado.</p>}
        {ctrl.erro && <p className="din-erro-linha mot-sem-banco">{ctrl.erro}</p>}
        {limites.length > 0 ? (
          <div className="mot-limites">
            {limites.map((t) => (
              <CampoDeControle
                key={t.chave}
                classe="mot-controle"
                controle={t}
                marca={NA_VERSAO.has(t.chave) ? <span className="mot-versao">entra na versão do auditor</span> : undefined}
                valorMostrado={
                  t.valor === null ? (
                    "padrão do motor"
                  ) : (
                    <>
                      {numero(t.valor)} <small>{t.unidade}</small>
                    </>
                  )
                }
                rascunho={ctrl.rascunho[t.chave] ?? ""}
                onMudar={(v) => ctrl.setRascunho((r) => ({ ...r, [t.chave]: v }))}
                onSalvar={() => void ctrl.mandar({ chave: t.chave, valor: ctrl.rascunho[t.chave] ?? "" }, t.chave)}
                onEsquecer={() => void ctrl.mandar({ acao: "esquecer", chave: t.chave }, `${t.chave}:esquecer`)}
                salvando={ctrl.salvando}
                semBanco={!ctrl.retrato?.databaseConfigured}
              />
            ))}
          </div>
        ) : (
          <p className="adm-vazio">{ctrl.fase === "sem-token" ? "Aguardando o token de administração." : ctrl.fase === "erro" ? "Não carregado." : "Carregando…"}</p>
        )}
      </section>

      {aceito && <AvisoDaCarga fase={c.fase} erro={c.erroDaCarga?.tipo} detalhe={c.erroDaCarga?.detalhe} oque="a configuração do motor" atualizadoEm={c.carregadoEm} onTentar={c.carregar} />}
      <FluxosDoMotor c={c} />
      <MetasETeste c={c} />
      <RuntimeEChaves c={c} />
    </>
  );
}
