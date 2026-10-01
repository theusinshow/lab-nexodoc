"use client";

import { motion } from "motion/react";
import { ArrowRight, BarChart3, CircleAlert, Database, Gauge, Info, KeyRound, LoaderCircle, RefreshCcw, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Botao, Segmento, Tecla } from "@/components/ds/basicos";
import { useTempo } from "@/lib/ds/tempo";

import { Topo } from "../_comum/topo";
import { RITMO, SUAVE } from "../conversa/turnos";
import { LinhaDeTendencia } from "@/components/ds/medidas";

import { ACOES, ATENCAO_DEGRADADO, AUDITORIAS, DESTINOS, FALHAS, LDS, SERIES, STATUS, TOTAIS, TUDO_EM_ORDEM, type Destino } from "./dados";
import { Dinheiro, type VarianteDinheiro } from "./dinheiro";
import { Motor, type VarianteMotor } from "./motor";
import { Pessoas, type VariantePessoas } from "./pessoas";
import { Banco, type VarianteBanco } from "./banco";
import { PERIODOS } from "./dados-dinheiro";
import "../mapa/mapa.css";
import "./admin.css";

/*
 * O CENTRO DE CONTROLE. Cinco destinos agrupados pela pergunta que se faz
 * (está de pé? quanto custou? melhora? quem entra? o que o banco guarda?),
 * o veredito sempre à vista no trilho e o token pedido uma vez, no pé dele.
 * Esta rodada: o trilho e o Cockpit; os outros quatro destinos vêm depois.
 */

export type SituacaoAdmin = "sem-token" | "cockpit" | "atencao" | "erro" | "dinheiro" | "dinheiro-sem-cotacao" | "dinheiro-sem-preco" | "motor" | "motor-amostra" | "motor-teste-falhou" | "pessoas" | "pessoas-lote" | "pessoas-convite" | "pessoas-ficha" | "dados" | "dados-expurgo" | "dados-excluir";
const comDados = (s: SituacaoAdmin) => s !== "sem-token" && s !== "erro";
const ICONES: Record<Destino, typeof Gauge> = { cockpit: Gauge, dinheiro: BarChart3, motor: ShieldCheck, pessoas: UsersRound, dados: Database };
const PRONTOS: Destino[] = ["cockpit", "dinheiro", "motor", "pessoas", "dados"];

function Trilho({ situacao, atual, onIr }: { situacao: SituacaoAdmin; atual: Destino; onIr: (d: Destino) => void }) {
  const { k } = useTempo();
  const status = situacao === "atencao" ? STATUS.degradado : comDados(situacao) ? STATUS.ok : null;
  const [editando, setEditando] = useState(!comDados(situacao));
  return (
    <nav className="adm-trilho" aria-label="Navegação administrativa">
      <p className={`adm-veredito${status ? ` adm-veredito--${status.veredito}` : ""}`}>
        {status ? (
          <>
            <i aria-hidden />
            <span>
              <b>{status.linha.split(" · ")[0]}</b>
              {status.linha.split(" · ").slice(1).join(" · ")}
            </span>
          </>
        ) : (
          <span>{situacao === "erro" ? "veredito indisponível" : "aguardando token"}</span>
        )}
      </p>
      {status?.motivo && <p className="adm-motivo">{status.motivo}</p>}

      <div className="adm-destinos">
        {DESTINOS.map((d, i) => {
          const Icone = ICONES[d.id];
          const pronto = PRONTOS.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              aria-current={atual === d.id ? "page" : undefined}
              disabled={!pronto}
              title={pronto ? undefined : "Na próxima rodada do lab"}
              className="adm-destino"
              onClick={() => onIr(d.id)}
            >
              {atual === d.id && <motion.i layoutId="adm-destino" className="adm-destino-fundo" transition={{ duration: RITMO.troca * k, ease: SUAVE }} />}
              <Icone size={15} aria-hidden />
              <span className="adm-destino-texto">
                <b>{d.nome}</b>
                <small>{d.pergunta}</small>
              </span>
              <Tecla>{i + 1}</Tecla>
            </button>
          );
        })}
      </div>

      <div className="adm-token">
        {!editando ? (
          <>
            <p className="adm-token-rotulo">
              <KeyRound size={13} aria-hidden /> sessão admin
            </p>
            <p className="adm-token-acoes">
              <button type="button">atualizar</button>
              <span aria-hidden>·</span>
              <button type="button" onClick={() => setEditando(true)}>
                trocar
              </button>
              <span aria-hidden>·</span>
              <button type="button">sair</button>
            </p>
          </>
        ) : (
          <form className="adm-token-form" onSubmit={(e) => (e.preventDefault(), setEditando(false))}>
            <label htmlFor="adm-token">Token de administração</label>
            <input
              id="adm-token"
              type="password"
              autoComplete="off"
              defaultValue={situacao === "erro" ? "nexo-admin-2026" : ""}
              aria-invalid={situacao === "erro"}
              autoFocus={situacao === "sem-token"}
              placeholder="NEXODOC_ADMIN_TOKEN"
            />
            {situacao === "erro" && <p className="adm-token-erro">O servidor recusou este token.</p>}
            <Botao variante="ghost" tamanho="sm" type="submit">
              Entrar
            </Botao>
            <p className="adm-token-nota">Fica só nesta aba do navegador.</p>
          </form>
        )}
      </div>
    </nav>
  );
}

function Aviso({ tom, children, acao }: { tom: "info" | "erro"; children: ReactNode; acao?: ReactNode }) {
  const Icone = tom === "info" ? Info : CircleAlert;
  return (
    <div className={`adm-aviso adm-aviso--${tom}`} role={tom === "erro" ? "alert" : "status"}>
      <Icone size={15} aria-hidden />
      <div>{children}</div>
      {acao}
    </div>
  );
}

function Numero({ rotulo, valor, detalhe, alerta, para, serie }: { rotulo: string; valor: ReactNode; detalhe: string; alerta?: boolean; para?: string; serie?: number[] }) {
  return (
    <button type="button" className={`adm-num${alerta ? " adm-num--alerta" : ""}`} title={para ? `Abrir ${para}` : undefined}>
      <span className="adm-num-rotulo">
        {alerta && <i aria-hidden />}
        {rotulo}
      </span>
      <b className="ds-num">{valor}</b>
      <span className="adm-num-detalhe">{detalhe}</span>
      {serie && (
        <span className="adm-num-linha" title="Últimos 14 dias">
          <LinhaDeTendencia valores={serie} alerta={alerta} altura={28} />
        </span>
      )}
      {para && <ArrowRight size={13} className="adm-num-seta" aria-hidden />}
    </button>
  );
}

function Cockpit({ situacao }: { situacao: SituacaoAdmin }) {
  const tem = situacao === "cockpit" || situacao === "atencao";
  const vazio = situacao === "sem-token" ? "Aguardando o token." : "Não carregado.";
  const t = TOTAIS;
  return (
    <>
      {situacao === "sem-token" && <Aviso tom="info">Nada foi consultado ainda. Informe o token de administração no rodapé do trilho, à esquerda.</Aviso>}
      {situacao === "erro" && (
        <Aviso
          tom="erro"
          acao={
            <Botao variante="ghost" tamanho="sm">
              <RefreshCcw size={13} /> Tentar de novo
            </Botao>
          }
        >
          <p>{FALHAS.negado}</p>
          <p className="adm-aviso-sub">Nenhum dado foi carregado — o que aparece abaixo não é resposta do servidor.</p>
        </Aviso>
      )}

      {tem && (
        <section className={`adm-atencao${situacao === "atencao" ? " adm-atencao--aviso" : ""}`} aria-label="O que exige ação">
          {situacao === "atencao" ? (
            <ul>
              {ATENCAO_DEGRADADO.map((a) => (
                <li key={a.chave} className={`adm-atencao-item adm-atencao-item--${a.gravidade}`}>
                  <CircleAlert size={14} aria-hidden />
                  {a.texto}
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-atencao-ok">
              <i aria-hidden />
              {TUDO_EM_ORDEM}
            </p>
          )}
        </section>
      )}

      <section className="adm-numeros" aria-label="Números">
        <Numero rotulo="Usuários ativos" valor={tem ? t.ativos : "—"} detalhe={tem ? `${t.admins} admins` : vazio} para="Pessoas" />
        <Numero rotulo="Auditorias" valor={tem ? t.auditorias : "—"} detalhe={tem ? `${t.auditorias7d} nos últimos 7 dias` : vazio} para="Dados" serie={tem ? SERIES.auditorias : undefined} />
        <Numero rotulo="Falhas" valor={tem ? t.falhas : "—"} detalhe={tem ? "auditorias com erro" : vazio} alerta={tem && t.falhas > 0} para="as auditorias que falharam" serie={tem ? SERIES.falhas : undefined} />
        <Numero rotulo="LDs" valor={tem ? t.lds : "—"} detalhe={tem ? `${t.ldsGeradas} geradas · ${t.lds7d} nos últimos 7 dias` : vazio} para="Dados" serie={tem ? SERIES.lds : undefined} />
        <Numero rotulo="Eventos LD" valor={tem ? t.eventosLd : "—"} detalhe={tem ? `${t.eventosLd7d} nos últimos 7 dias` : vazio} para="Dados" serie={tem ? SERIES.eventosLd : undefined} />
      </section>

      <div className="adm-duas">
        <section className="adm-bloco" aria-labelledby="adm-aud">
          <header>
            <h2 id="adm-aud">Auditorias recentes</h2>
          </header>
          {tem ? (
            <div className="adm-tabela adm-tabela--aud">
              {AUDITORIAS.map((a) => (
                <div key={a.id} className="adm-linha">
                  <span className="adm-tit">
                    <b>{a.titulo}</b>
                    <small>
                      <span className="mp-mono">{a.codigo}</span> {a.obra}
                    </small>
                  </span>
                  <span className="adm-fraco">{a.modo}</span>
                  <span className={`adm-fraco ds-num${a.status === "falhou" ? " adm-nada" : ""}`}>{a.status === "falhou" ? "—" : `${a.achados} achados`}</span>
                  <span className="adm-fraco ds-num">{a.quando}</span>
                  <span className={`adm-status adm-status--${a.status}`}>
                    {a.status === "rodando" ? <LoaderCircle size={12} className="adm-gira" /> : <i aria-hidden />}
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="adm-vazio">{vazio}</p>
          )}
        </section>

        <section className="adm-bloco" aria-labelledby="adm-ld">
          <header>
            <h2 id="adm-ld">LDs recentes</h2>
          </header>
          {tem ? (
            <div className="adm-tabela adm-tabela--ld">
              {LDS.map((l) => (
                <div key={l.id} className="adm-linha">
                  <span className="adm-tit">
                    <b className="mp-mono">{l.codigo || "sem código"}</b>
                    <small>{l.obra || "Obra não preenchida"}</small>
                  </span>
                  <span className="adm-fraco ds-num">{l.pdfs} PDFs não armazenados</span>
                  <span className="adm-fraco ds-num">{l.quando}</span>
                  <span className={`adm-status adm-status--${l.status}`}>
                    <i aria-hidden />
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="adm-vazio">{vazio}</p>
          )}
        </section>
      </div>

      <section className="adm-bloco" aria-labelledby="adm-acoes">
        <header>
          <h2 id="adm-acoes">Últimas ações administrativas</h2>
        </header>
        {tem ? (
          <div className="adm-tabela adm-tabela--acoes">
            {ACOES.map((a) => (
              <div key={a.id} className="adm-linha">
                <span>
                  {a.acao}
                  <span className="mp-mono adm-fraco"> · {a.alcance}</span>
                </span>
                <span className="mp-mono adm-fraco">{a.quem}</span>
                <span className="adm-fraco ds-num">{a.quando}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="adm-vazio">{vazio}</p>
        )}
      </section>
    </>
  );
}

export function TelaAdmin({ situacao }: { situacao: SituacaoAdmin }) {
  const [destino, setDestino] = useState<Destino>(situacao.startsWith("dinheiro") ? "dinheiro" : situacao.startsWith("motor") ? "motor" : situacao.startsWith("pessoas") ? "pessoas" : situacao.startsWith("dados") ? "dados" : "cockpit");
  const [periodo, setPeriodo] = useState<string>("7");
  const tem = comDados(situacao);
  const varPessoas: VariantePessoas = situacao === "pessoas-lote" ? "lote" : situacao === "pessoas-convite" ? "convite" : situacao === "pessoas-ficha" ? "ficha" : "normal";
  const varBanco: VarianteBanco = situacao === "dados-expurgo" ? "expurgo" : situacao === "dados-excluir" ? "excluir" : "normal";
  const varMotor: VarianteMotor = situacao === "motor-amostra" ? "amostra" : situacao === "motor-teste-falhou" ? "teste-falhou" : "normal";
  const variante: VarianteDinheiro = situacao === "dinheiro-sem-cotacao" ? "sem-cotacao" : situacao === "dinheiro-sem-preco" ? "sem-preco" : "normal";

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < DESTINOS.length && PRONTOS.includes(DESTINOS[i].id)) (e.preventDefault(), setDestino(DESTINOS[i].id));
    };
    document.addEventListener("keydown", tecla, true);
    return () => document.removeEventListener("keydown", tecla, true);
  });

  return (
    <div className="mp adm">
      <Topo atual="Administração" />
      <header className="mp-cabeca">
        <div>
          <p className="mp-trilha">
            <span>Centro de controle</span>
          </p>
          <h1>{DESTINOS.find((d) => d.id === destino)!.nome}</h1>
        </div>
        {tem && (
          <div className="adm-atualizado">
            {destino === "dinheiro" && <Segmento rotulo="Período" valor={periodo} onTroca={setPeriodo} opcoes={PERIODOS.map((p) => ({ valor: String(p), rotulo: `${p} dias` }))} />}
            <span className="ds-num">dados de 21:14</span>
            <Botao variante="quiet" tamanho="sm">
              <RefreshCcw size={13} /> Atualizar <Tecla>R</Tecla>
            </Botao>
          </div>
        )}
      </header>
      <div className="adm-corpo">
        <Trilho situacao={situacao} atual={destino} onIr={setDestino} />
        <main className="adm-conteudo">
          {destino === "pessoas" ? <Pessoas variante={varPessoas} /> : destino === "dados" ? <Banco variante={varBanco} /> : destino === "motor" ? <Motor variante={varMotor} /> : destino === "dinheiro" ? <Dinheiro variante={variante} periodo={Number(periodo)} /> : <Cockpit situacao={comDados(situacao) && situacao !== "atencao" ? "cockpit" : situacao} />}
        </main>
      </div>
    </div>
  );
}
