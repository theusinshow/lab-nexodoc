"use client";

import { AnimatePresence, motion } from "motion/react";
import { Activity, CircleAlert, Info } from "lucide-react";
import { Fragment, useState } from "react";

import { Botao, Girando } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";
import { BarraEmbutida, LinhaDeTendencia } from "@/components/ds/medidas";
import { SerieComMeta } from "@/components/ds/serie-com-meta";

import { RITMO, SUAVE } from "../conversa/turnos";
import { num } from "./dados-dinheiro";
import {
  CHAVES,
  FLUXOS_DE_IA,
  LIMITES,
  METAS,
  MODELOS_DISPONIVEIS,
  POR_MODELO,
  POR_NIVEL,
  RUNTIME,
  SAUDE,
  SEMANAS,
  TESTE_FALHA,
  TESTE_OK,
  VISAO,
  VISAO_AMOSTRA,
  type ControleMotor,
  type Fluxo,
  type Grupo,
} from "./dados-motor";
import "./motor.css";

/*
 * MOTOR: o que a auditoria está achando, e a configuração que produz isso.
 * A medida em cima, a régua embaixo (a ordem do app). As duas tabelas de
 * fluxo do app (editor de modelos e painel de provedores) eram os MESMOS 20
 * fluxos em duas listas; aqui viram uma só, sem perder coluna nem ação.
 */

export type VarianteMotor = "normal" | "amostra" | "teste-falhou";

const ROTULO_DA_ORIGEM = { banco: "declarado aqui", ambiente: "vem do ambiente", padrao: "não declarado" } as const;

function Num({ rotulo, valor, detalhe, serie, alerta }: { rotulo: string; valor: string; detalhe: string; serie?: number[]; alerta?: boolean }) {
  return (
    <div className="adm-num adm-num--fixo din-num">
      <span className="adm-num-rotulo">{rotulo}</span>
      <b className="ds-num">{valor}</b>
      <span className="adm-num-detalhe">{detalhe}</span>
      {serie && (
        <span className="din-num-linha" title="Semana a semana">
          <LinhaDeTendencia valores={serie} alerta={alerta} />
        </span>
      )}
    </div>
  );
}

function Comparacao({ titulo, sub, grupos }: { titulo: string; sub: string; grupos: Grupo[] }) {
  return (
    <section className="adm-bloco" aria-label={titulo}>
      <header>
        <h2>{titulo}</h2>
      </header>
      <p className="din-lede">{sub}</p>
      <div className="adm-tabela mot-tabela--grupos">
        <div className="adm-linha din-cab">
          <span>Grupo</span>
          <span className="din-direita">Análises</span>
          <span className="din-direita">Rotuladas</span>
          <span className="din-direita">Achados</span>
          <span>Confirmação</span>
          <span>Falso positivo</span>
          <span className="din-direita">Gravidade</span>
          <span className="din-direita">Perdidos</span>
          <span className="din-direita">Tempo médio</span>
        </div>
        {grupos.map((g) => (
          <div key={g.grupo} className="adm-linha">
            <span className="mp-mono">{g.grupo}</span>
            <span className="ds-num din-direita">{g.analises}</span>
            <span className="ds-num din-direita adm-fraco">{g.rotuladas}</span>
            <span className="ds-num din-direita adm-fraco">{num(g.achados)}</span>
            <span className="mot-taxa">
              <BarraEmbutida valor={g.confirmacao} maximo={100} />
              <b className="ds-num">{g.confirmacao}%</b>
            </span>
            <span className="mot-taxa">
              <BarraEmbutida valor={g.fp} maximo={100} />
              <b className={`ds-num${g.fp > METAS.falsoPositivoMax ? " mot-fora" : ""}`}>{g.fp}%</b>
            </span>
            <span className="ds-num din-direita adm-fraco">{g.gravidade}</span>
            <span className="ds-num din-direita adm-fraco">{g.perdidos}</span>
            <span className="ds-num din-direita adm-fraco">{g.tempo}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Limite({ c }: { c: ControleMotor }) {
  const [valor, setValor] = useState(c.valor === null ? "" : String(c.valor));
  return (
    <div className="din-controle mot-controle">
      <div className="din-controle-cabeca">
        <p className="din-controle-rotulo">
          {c.rotulo}
          {c.versao && <span className="mot-versao">entra na versão do auditor</span>}
        </p>
        <b className="ds-num">
          {c.valor === null ? "padrão do motor" : num(c.valor)} {c.valor !== null && <small>{c.unidade}</small>}
        </b>
      </div>
      <p className="din-origem">
        <span className={`din-origem-ponto din-origem-ponto--${c.origem}`} aria-hidden />
        {ROTULO_DA_ORIGEM[c.origem]} · <span className="mp-mono">{c.variavel}</span>
      </p>
      <p className="din-desc">{c.descricao}</p>
      <form className="din-campo" onSubmit={(e) => e.preventDefault()}>
        <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="numeric" placeholder={`vazio = não declarado · aceita ${num(c.minimo)} a ${num(c.maximo)}`} aria-label={c.rotulo} />
        <Botao variante="ghost" tamanho="sm" type="submit">
          Salvar
        </Botao>
        {c.origem === "banco" && (
          <Botao variante="quiet" tamanho="sm" title="Apaga a declaração e volta a valer o ambiente (ou o padrão do motor)">
            voltar ao ambiente
          </Botao>
        )}
      </form>
    </div>
  );
}

function LinhaDoFluxo({ f }: { f: Fluxo }) {
  const { k } = useTempo();
  const [editando, setEditando] = useState(false);
  const [modelo, setModelo] = useState(f.override ?? f.efetivo);
  const estado = !f.chave ? "sem-chave" : f.reservado ? "reservado" : "pronto";
  return (
    <div className={`mot-fluxo${editando ? " mot-fluxo--aberto" : ""}`}>
      <div className="adm-linha mot-fluxo-linha">
        <span className="adm-tit">
          <b>{f.rotulo}</b>
          <small>{f.override ? `override salvo${f.salvoEm ? ` em ${f.salvoEm}` : ""}` : "padrão do ambiente"}</small>
        </span>
        <span className="mp-mono adm-fraco">openai</span>
        <span className="mp-mono">{f.efetivo}</span>
        <span className={`mot-estado mot-estado--${estado}`}>
          <i aria-hidden />
          {estado === "pronto" ? "pronto" : estado === "reservado" ? "modelo de espaço reservado" : "sem chave"}
        </span>
        <span className="adm-tit mot-falha">
          {f.falha ? (
            <>
              <b className="mot-falha-cat">
                {f.falha.categoria} <span className="ds-num adm-fraco">{f.falha.quando}</span>
              </b>
              <small title={f.falha.mensagem}>{f.falha.mensagem}</small>
            </>
          ) : (
            <small className="mp-mono">sem falhas registradas</small>
          )}
        </span>
        <Botao variante="quiet" tamanho="sm" className="mot-trocar" onClick={() => setEditando((v) => !v)} aria-expanded={editando}>
          {editando ? "Fechar" : "Trocar modelo"}
        </Botao>
      </div>
      <AnimatePresence initial={false}>
        {editando && (
          <motion.form
            className="mot-fluxo-edicao"
            onSubmit={(e) => (e.preventDefault(), setEditando(false))}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: RITMO.troca * k, ease: SUAVE }}
          >
            <label>
              <span>Modelo para {f.rotulo}</span>
              <input list="mot-modelos" value={modelo} onChange={(e) => setModelo(e.target.value)} aria-label={`Modelo para ${f.rotulo}`} />
            </label>
            <Botao variante="ghost" tamanho="sm" type="submit" title="Salvar modelo">
              Salvar modelo
            </Botao>
            {f.override && (
              <Botao variante="quiet" tamanho="sm" title="Voltar ao padrão/env">
                Voltar ao padrão
              </Botao>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Motor({ variante }: { variante: VarianteMotor }) {
  const amostra = variante === "amostra";
  const v = amostra ? VISAO_AMOSTRA : VISAO;
  const semanas = amostra ? SEMANAS.slice(-2) : SEMANAS;
  const meta = amostra ? null : METAS;
  const [testando, setTestando] = useState(false);
  const [teste, setTeste] = useState<typeof TESTE_OK | null>(variante === "teste-falhou" ? TESTE_FALHA : null);
  const ultimas = semanas.slice(-2);
  const tendencia = ultimas.length === 2 ? ultimas[1].fp - ultimas[0].fp : null;
  const grupos = [...new Set(FLUXOS_DE_IA.map((f) => f.grupo))];

  const testar = () => {
    setTestando(true);
    setTeste(null);
    setTimeout(() => {
      setTestando(false);
      setTeste(variante === "teste-falhou" ? TESTE_FALHA : TESTE_OK);
    }, 1100);
  };

  return (
    <>
      <section className="adm-bloco" aria-labelledby="mot-qual">
        <header>
          <h2 id="mot-qual">Qualidade do motor</h2>
        </header>
        <p className="din-lede">Compare níveis e modelos a partir dos achados revisados manualmente. Quanto mais auditorias rotuladas, mais confiável será a decisão de produto.</p>
        <div className="adm-numeros din-numeros mot-numeros">
          <Num rotulo="Auditorias concluídas" valor={num(v.concluidas)} detalhe={`${v.revisadas} já têm revisão humana`} serie={semanas.map((s) => s.auditorias)} />
          <Num rotulo="Confirmação" valor={`${v.taxaConfirmacao}%`} detalhe={`${num(v.confirmados)} achados confirmados`} />
          <Num rotulo="Falsos positivos" valor={`${v.falsoPositivo}%`} detalhe={`${v.falsoPositivo}% dos achados avaliados`} serie={semanas.map((s) => s.fp)} alerta={meta !== null && v.falsoPositivo > meta.falsoPositivoMax} />
          <Num rotulo="Erros perdidos" valor={num(v.perdidos)} detalhe={`${v.cobertura}% das auditorias foram rotuladas`} />
        </div>
        {amostra && (
          <p className="din-ressalva mot-ressalva">
            <Info size={14} aria-hidden />
            <span>Amostra inicial: revise pelo menos 10 auditorias de cada nível antes de decidir qual configuração vender como padrão.</span>
          </p>
        )}
      </section>

      <section className="adm-bloco" aria-labelledby="mot-semana">
        <header>
          <h2 id="mot-semana">Semana a semana</h2>
          <span className="mot-metas">
            {meta ? `meta: falso positivo ≤ ${meta.falsoPositivoMax}% · cobertura ≥ ${meta.coberturaMin}%` : "meta não declarada"}
            <a href="#mot-metas-form">declarar</a>
          </span>
        </header>
        <p className="din-lede">
          A taxa divide pelos achados <b>julgados</b>, não pelos gerados: dividir pelo total faria a taxa cair sempre que alguém deixasse de revisar — melhora aparente por preguiça. Semana sem auditoria não vira linha.
        </p>
        <div className="mot-series">
          <div>
            <p className="din-sub">Falso positivo</p>
            <SerieComMeta
              pontos={semanas.map((s) => ({
                eixo: s.semana,
                valor: s.fp,
                rotulo: (
                  <>
                    <b className="ds-num">{s.fp}%</b> na semana de {s.semana} · {s.auditorias} auditorias, {s.achados} achados
                    {meta ? (s.fp <= meta.falsoPositivoMax ? " · dentro da meta" : " · fora da meta") : ""}
                  </>
                ),
              }))}
              meta={meta?.falsoPositivoMax ?? null}
              sentido="max"
              teto={30}
              padrao={
                tendencia === null
                  ? "Passe o mouse numa semana."
                  : tendencia === 0
                    ? "falso positivo estável entre as duas últimas semanas julgadas"
                    : `falso positivo ${tendencia < 0 ? "caiu" : "subiu"} ${Math.abs(tendencia)} ${Math.abs(tendencia) === 1 ? "ponto" : "pontos"} na última semana julgada`
              }
            />
          </div>
          <div>
            <p className="din-sub">Cobertura de revisão</p>
            <SerieComMeta
              pontos={semanas.map((s) => ({
                eixo: s.semana,
                valor: s.cobertura,
                rotulo: (
                  <>
                    <b className="ds-num">{s.cobertura}%</b> das auditorias da semana de {s.semana} revisadas
                    {meta ? (s.cobertura >= meta.coberturaMin ? " · dentro da meta" : " · fora da meta") : ""}
                  </>
                ),
              }))}
              meta={meta?.coberturaMin ?? null}
              sentido="min"
              teto={60}
              padrao="Passe o mouse numa semana."
            />
          </div>
        </div>
        {amostra && <p className="din-lede">Sem meta declarada, o painel não julga: os pontos ficam sem cor.</p>}
      </section>

      <Comparacao titulo="Comparação por nível" sub="Padrão deve ser rápido e confiável; Profundo precisa justificar maior custo com melhor cobertura." grupos={POR_NIVEL} />
      <Comparacao titulo="Comparação por modelo" sub="O modelo só vence quando reduz falhas reais em auditorias revisadas, não apenas quando produz mais achados." grupos={POR_MODELO} />

      <section className="adm-bloco" aria-labelledby="mot-vazao">
        <header>
          <h2 id="mot-vazao">Vazão e limites de leitura</h2>
        </header>
        <p className="din-lede">O que a máquina aguenta e quanto ela lê. Dois destes mudam o que a auditoria acha — e por isso entram na versão do auditor.</p>
        <div className="mot-limites">
          {LIMITES.map((c) => (
            <Limite key={c.chave} c={c} />
          ))}
        </div>
      </section>

      <section className="adm-bloco" aria-labelledby="mot-fluxos">
        <header>
          <h2 id="mot-fluxos">Modelos e provedores por fluxo</h2>
          <span className="adm-fraco">{FLUXOS_DE_IA.length} fluxos</span>
        </header>
        <p className="din-lede">
          Provedor ativo, modelo, chave e última falha conhecida por fluxo. Não executa chamadas externas ao carregar. Salva somente nomes de modelos no banco. Chaves continuam protegidas no ambiente do backend.
        </p>
        <p className="mot-procedencia">
          {SAUDE.nota} {SAUDE.guarda}
        </p>
        <datalist id="mot-modelos">
          {MODELOS_DISPONIVEIS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
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
              {FLUXOS_DE_IA.filter((f) => f.grupo === g).map((f) => (
                <LinhaDoFluxo key={f.id} f={f} />
              ))}
            </Fragment>
          ))}
        </div>
      </section>

      <div className="mot-duas">
        <section className="adm-bloco" aria-labelledby="mot-metas" id="mot-metas-form">
          <header>
            <h2 id="mot-metas">Metas de qualidade</h2>
            <span className={`mot-estado ${meta ? "mot-estado--pronto" : "mot-estado--nada"}`}>
              <i aria-hidden />
              {meta ? "metas declaradas" : "meta não declarada — o painel não julga"}
            </span>
          </header>
          <p className="din-lede">
            O painel de Quality mostra as taxas; sem meta declarada ele não as julga — e não inventa uma. Declarada aqui, ela vira a régua da série semanal: dentro fica verde, fora fica âmbar, e o que não tem meta continua sem cor.
          </p>
          <form className="mot-metas-form" onSubmit={(e) => e.preventDefault()}>
            <label>
              <span>Falso positivo, no máximo (%)</span>
              <input defaultValue={meta ? meta.falsoPositivoMax : ""} placeholder="ex.: 10" inputMode="numeric" />
            </label>
            <label>
              <span>Cobertura de revisão, no mínimo (%)</span>
              <input defaultValue={meta ? meta.coberturaMin : ""} placeholder="ex.: 40" inputMode="numeric" />
            </label>
            <Botao variante="ghost" tamanho="sm" type="submit">
              Salvar metas
            </Botao>
          </form>
          {meta && (
            <p className="mot-declarada">
              <span className="din-origem-ponto din-origem-ponto--banco" aria-hidden />
              declaradas em {meta.declaradaEm} por <span className="mp-mono">{meta.declaradaPor}</span>
            </p>
          )}
        </section>

        <section className="adm-bloco" aria-labelledby="mot-teste">
          <header>
            <h2 id="mot-teste">Teste de conectividade do provider ativo</h2>
          </header>
          <p className="din-lede">Executa uma chamada mínima real apenas quando você clicar.</p>
          <div className="mot-teste">
            <Botao variante="ghost" tamanho="sm" onClick={testar} disabled={testando}>
              {testando ? <Girando tamanho={12} /> : <Activity size={13} />}
              {testando ? "Testando" : "Testar provider"}
            </Botao>
            {teste && (
              <div className={`mot-resultado${teste.ok ? "" : " mot-resultado--falha"}`} role={teste.ok ? "status" : "alert"}>
                <p>
                  {teste.ok ? <i className="mot-ok" aria-hidden /> : <CircleAlert size={14} aria-hidden />}
                  {teste.mensagem}
                </p>
                <p className="mp-mono mot-resultado-campos">
                  <span>key: {teste.digital}</span>
                  <span>status: {teste.status}</span>
                  <span>code: {teste.code}</span>
                  <span>type: {teste.tipo}</span>
                  <span>raw: {teste.raw}</span>
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mot-duas">
        <section className="adm-bloco" aria-labelledby="mot-runtime">
          <header>
            <h2 id="mot-runtime">Runtime</h2>
          </header>
          <dl className="mot-pares">
            {RUNTIME.map(([r, v]) => (
              <Fragment key={r}>
                <dt>{r}</dt>
                <dd className="mp-mono">{v}</dd>
              </Fragment>
            ))}
          </dl>
        </section>
        <section className="adm-bloco" aria-labelledby="mot-chaves">
          <header>
            <h2 id="mot-chaves">Chaves</h2>
            <span className="adm-fraco">Leitura operacional, sem expor credenciais.</span>
          </header>
          <dl className="mot-pares">
            {CHAVES.map((c) => (
              <Fragment key={c.nome}>
                <dt className="mp-mono">{c.nome}</dt>
                <dd>
                  <span className={`mot-estado ${c.presente ? "mot-estado--pronto" : "mot-estado--sem-chave"}`}>
                    <i aria-hidden />
                    {c.presente ? "presente" : "ausente"}
                  </span>
                  {c.digital && <span className="mp-mono adm-fraco"> · {c.digital}</span>}
                </dd>
              </Fragment>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
