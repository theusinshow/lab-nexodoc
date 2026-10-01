"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, CircleAlert, Search, TriangleAlert, UserPlus } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import { Botao } from "@/components/ds/basicos";
import { BarraEmbutida } from "@/components/ds/medidas";
import { useTempo } from "@/lib/ds/tempo";

import { RITMO, SUAVE } from "../conversa/turnos";
import { CONFIRMA, EXPLICACAO_DA_PORTA, PESSOAS, plural, PORTAS, rotuloDoVinculo, type Pessoa, type Porta, type Vinculo } from "./dados-pessoas-banco";
import "./pessoas-banco.css";

/*
 * PESSOAS: quem entra, com que alçada, e o que acontece com quem chega sem
 * convite. O app mexe em TRÊS chaves independentes, e a tela mostra as três
 * separadas porque cada uma tem uma consequência diferente:
 *
 *   conta       (User.isActive)          entra no Nexo ou não;
 *   plataforma  (User.role)              abre o centro de controle ou não;
 *   escritório  (OrganizationMember)     vê os projetos da PROSUL ou não.
 *
 * Quem tem conta e não tem vínculo vai para a fila "Sem escritório", que é
 * onde se aprova alguém. O resto se ajusta na ficha da pessoa: as mudanças
 * ficam pendentes até "Aplicar", com a consequência escrita do lado.
 */

export type VariantePessoas = "normal" | "lote" | "convite" | "ficha";

type Confirmacao = { texto: string; perigo: boolean } | null;
type Escritorio = "fora" | "MEMBER" | "ADMIN" | "OWNER";
type Chaves = { ativo: boolean; admin: boolean; escritorio: Escritorio };

const ULTIMO_ADMIN = "Este é o último admin ativo. Promova outro usuário antes de rebaixar ou desativar este.";
const NOME_DO_ESCRITORIO: Record<Escritorio, string> = { fora: "fora", MEMBER: "membro", ADMIN: "admin do escritório", OWNER: "dono" };

const chavesDe = (p: Pessoa): Chaves => ({ ativo: p.ativo, admin: p.papel === "ADMIN", escritorio: p.vinculo ? p.vinculo.papel : "fora" });

function Confirma({ c, onCancelar }: { c: Confirmacao; onCancelar: () => void }) {
  const { k } = useTempo();
  return (
    <AnimatePresence initial={false}>
      {c && (
        <motion.div
          className={`pb-confirma${c.perigo ? " pb-confirma--perigo" : ""}`}
          role="alertdialog"
          aria-label="Confirmar"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: RITMO.troca * k, ease: SUAVE }}
        >
          <div className="pb-confirma-dentro">
            <CircleAlert size={15} aria-hidden />
            <p>{c.texto}</p>
            <Botao variante="ghost" tamanho="sm" onClick={onCancelar}>
              Cancelar
            </Botao>
            <Botao variante="primary" tamanho="sm" onClick={onCancelar}>
              Confirmar
            </Botao>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Um seletor de poucas opções, o mesmo da porta de entrada. */
function Chave<T extends string>({ rotulo, valor, opcoes, onTrocar, travada }: { rotulo: string; valor: T; opcoes: { id: T; rotulo: string }[]; onTrocar: (v: T) => void; travada?: boolean }) {
  return (
    <div className="pb-opcoes pb-opcoes--chave" role="radiogroup" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={valor === o.id} className="pb-opcao" disabled={travada && valor !== o.id} onClick={() => onTrocar(o.id)}>
          <i aria-hidden />
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

function Ficha({ p, porta, adminsAtivos, inicial, onFechar, onAplicar }: { p: Pessoa; porta: Porta; adminsAtivos: number; inicial?: Partial<Chaves>; onFechar: () => void; onAplicar: (c: Chaves) => void }) {
  const { k } = useTempo();
  const atual = chavesDe(p);
  const [nova, setNova] = useState<Chaves>({ ...atual, ...inicial });
  const dono = atual.escritorio === "OWNER";

  const mudancas: string[] = [];
  if (nova.ativo !== atual.ativo) mudancas.push(`conta → ${nova.ativo ? "ativa" : "desativada"}`);
  if (nova.admin !== atual.admin) mudancas.push(`centro de controle → ${nova.admin ? "admin" : "usuário"}`);
  if (nova.escritorio !== atual.escritorio) mudancas.push(`escritório → ${NOME_DO_ESCRITORIO[nova.escritorio]}`);

  const tiraAcesso = (atual.ativo && !nova.ativo) || (atual.escritorio !== "fora" && nova.escritorio === "fora");
  const perdeAdmin = atual.admin && atual.ativo && (!nova.admin || !nova.ativo);
  const travaDoUltimo = perdeAdmin && adminsAtivos <= 1;

  const textoDaConta = nova.ativo ? "Entra com o Google e usa o produto." : "Perde o acesso ao produto imediatamente — o histórico fica.";
  const textoDoAdmin = nova.admin ? "Vê custo, configuração de provedores, e pode promover outras pessoas." : "Usa o produto; não abre o centro de controle.";
  const textoDoEscritorio = dono
    ? "Dono do escritório. Esse papel não muda pelo painel."
    : nova.escritorio === "fora"
      ? porta === "prosul"
        ? "Remover não apaga a conta. Com a porta aberta, o próximo login recria o vínculo como MEMBER — para tirar de vez, desative a conta."
        : "Remover não apaga a conta: a pessoa continua entrando, e continua sem ver projeto do escritório."
      : atual.escritorio === "fora"
        ? "Liberar cria o vínculo como convidado; o próximo login da pessoa o ativa."
        : nova.escritorio === "ADMIN"
          ? "Vê os projetos e também cadastra projeto, o que define o centro de custo."
          : "Vê e audita os projetos do escritório.";

  return (
    <motion.div
      className="pb-ficha"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: RITMO.troca * k, ease: SUAVE }}
    >
      <div className="pb-ficha-dentro" role="group" aria-label={`Acesso de ${p.nome || p.email}`}>
        <div className="pb-chaves">
          <div className={`pb-chave${nova.ativo !== atual.ativo ? " pb-chave--mudou" : ""}`}>
            <h4>Entra no Nexo</h4>
            <Chave rotulo="Conta" valor={nova.ativo ? "sim" : "nao"} opcoes={[{ id: "sim", rotulo: "Conta ativa" }, { id: "nao", rotulo: "Desativada" }]} onTrocar={(v) => setNova((n) => ({ ...n, ativo: v === "sim" }))} />
            <p>{textoDaConta}</p>
          </div>
          <div className={`pb-chave${nova.admin !== atual.admin ? " pb-chave--mudou" : ""}`}>
            <h4>Centro de controle</h4>
            <Chave rotulo="Papel na plataforma" valor={nova.admin ? "ADMIN" : "USER"} opcoes={[{ id: "USER", rotulo: "Usuário" }, { id: "ADMIN", rotulo: "Admin" }]} onTrocar={(v) => setNova((n) => ({ ...n, admin: v === "ADMIN" }))} />
            <p>{textoDoAdmin}</p>
          </div>
          <div className={`pb-chave${nova.escritorio !== atual.escritorio ? " pb-chave--mudou" : ""}`}>
            <h4>
              Escritório PROSUL
              {p.vinculo?.situacao === "INVITED" && <span className="pb-vinculo-rotulo pb-vinculo--convidado">CONVIDADO</span>}
            </h4>
            {dono ? (
              <Chave rotulo="Vínculo com o escritório" valor="OWNER" opcoes={[{ id: "OWNER", rotulo: "Dono" }]} onTrocar={() => {}} travada />
            ) : (
              <Chave
                rotulo="Vínculo com o escritório"
                valor={nova.escritorio}
                opcoes={[
                  { id: "fora", rotulo: "Fora" },
                  { id: "MEMBER", rotulo: "Membro" },
                  { id: "ADMIN", rotulo: "Admin" },
                ]}
                onTrocar={(v) => setNova((n) => ({ ...n, escritorio: v }))}
              />
            )}
            <p>{textoDoEscritorio}</p>
          </div>
        </div>
        <footer className="pb-ficha-pe">
          {travaDoUltimo ? (
            <p className="pb-ficha-trava">
              <CircleAlert size={14} aria-hidden /> {ULTIMO_ADMIN}
            </p>
          ) : (
            <p className="pb-ficha-resumo">{mudancas.length ? <><b className="ds-num">{plural(mudancas.length, "mudança", "mudanças")}:</b> {mudancas.join(" · ")}</> : <span className="adm-fraco">Conta criada em {p.criada}. Nada mudou ainda.</span>}</p>
          )}
          <Botao variante="ghost" tamanho="sm" onClick={onFechar}>
            {mudancas.length ? "Descartar" : "Fechar"}
          </Botao>
          <Botao variante="primary" tamanho="sm" className={tiraAcesso ? "pb-perigo" : undefined} disabled={!mudancas.length || travaDoUltimo} onClick={() => onAplicar(nova)}>
            Aplicar
          </Botao>
        </footer>
      </div>
    </motion.div>
  );
}

export function Pessoas({ variante }: { variante: VariantePessoas }) {
  const { k } = useTempo();
  const [porta, setPorta] = useState<Porta>(variante === "convite" ? "convite" : "prosul");
  const [escritorio, setEscritorio] = useState("");
  const [busca, setBusca] = useState("");
  const [papel, setPapel] = useState("all");
  const [situacao, setSituacao] = useState("all");
  const [pessoas, setPessoas] = useState<Pessoa[]>(PESSOAS);
  const [aberta, setAberta] = useState<string | null>(variante === "ficha" ? "p4" : null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set(variante === "lote" ? ["p5", "p6"] : []));
  const [confirma, setConfirma] = useState<Confirmacao>(variante === "lote" ? { texto: CONFIRMA.desativar(2), perigo: true } : null);

  const semEscritorio = pessoas.filter((p) => !p.vinculo && p.ativo);
  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pessoas.filter(
      (p) =>
        (!q || p.nome.toLowerCase().includes(q) || p.email.includes(q)) &&
        (papel === "all" || p.papel === papel) &&
        (situacao === "all" || (situacao === "active" ? p.ativo : !p.ativo)),
    );
  }, [pessoas, busca, papel, situacao]);
  const totais = { usuarios: pessoas.length, ativos: pessoas.filter((p) => p.ativo).length, admins: pessoas.filter((p) => p.papel === "ADMIN").length, lds: pessoas.reduce((a, p) => a + p.lds, 0) };
  const adminsAtivos = pessoas.filter((p) => p.papel === "ADMIN" && p.ativo).length;
  const maxAud = Math.max(...pessoas.map((p) => p.auditorias));
  const todos = visiveis.length > 0 && visiveis.every((p) => marcados.has(p.id));
  const marcar = (id: string) => setMarcados((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const mudar = (id: string, f: (p: Pessoa) => Pessoa) => setPessoas((ps) => ps.map((p) => (p.id === id ? f(p) : p)));
  const liberar = (id: string, papelNoEscritorio: "MEMBER" | "ADMIN") => mudar(id, (p) => ({ ...p, vinculo: { papel: papelNoEscritorio, situacao: "INVITED" } }));
  const aplicar = (id: string, c: Chaves) => {
    mudar(id, (p) => {
      const antes = chavesDe(p);
      let vinculo: Vinculo = p.vinculo;
      if (c.escritorio === "fora") vinculo = null;
      else if (antes.escritorio === "fora") vinculo = { papel: c.escritorio === "ADMIN" ? "ADMIN" : "MEMBER", situacao: "INVITED" };
      else if (c.escritorio !== antes.escritorio && p.vinculo) vinculo = { ...p.vinculo, papel: c.escritorio === "ADMIN" ? "ADMIN" : "MEMBER" };
      return { ...p, ativo: c.ativo, papel: c.admin ? "ADMIN" : "USER", vinculo };
    });
    setAberta(null);
  };

  const textoDaFila =
    porta === "convite"
      ? "Entraram com o Google e levaram 403: a conta existe, mas sem convite não vê nada. Liberar cria o vínculo como convidado, e o próximo login o ativa."
      : porta === "prosul"
        ? "Contas que existem e não têm vínculo. Com a porta aberta, o próximo login delas cria o vínculo sozinho, como MEMBER; liberar agora só adianta."
        : "Contas que existem e não têm vínculo com a PROSUL. Com a porta apontando para outro escritório, o próximo login as leva para lá.";

  return (
    <>
      <section className="adm-bloco" aria-labelledby="pb-porta">
        <header>
          <h2 id="pb-porta">A porta de entrada</h2>
        </header>
        <p className="din-lede">O que acontece com quem faz login e não tem convite.</p>
        <div className="pb-porta">
          <div className="pb-opcoes" role="radiogroup" aria-label="Quem entra sem convite">
            {PORTAS.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={porta === o.id} className="pb-opcao" onClick={() => setPorta(o.id)}>
                <i aria-hidden />
                {o.rotulo}
              </button>
            ))}
          </div>
          {porta === "outra" && <input className="pb-campo pb-campo--mono" value={escritorio} onChange={(e) => setEscritorio(e.target.value)} placeholder="id do escritório" aria-label="Id do escritório de destino" />}
          <p className="pb-porta-texto">
            {porta === "prosul" && <TriangleAlert size={14} aria-label="Atenção" />}
            <span>{EXPLICACAO_DA_PORTA[porta]}</span>
          </p>
          <Botao variante="ghost" tamanho="sm">
            Salvar
          </Botao>
        </div>
      </section>

      <section className="adm-bloco" aria-labelledby="pb-fila">
        <header>
          <h2 id="pb-fila">Sem escritório</h2>
          <span className="adm-fraco">{semEscritorio.length ? plural(semEscritorio.length, "conta esperando", "contas esperando") : "ninguém esperando"}</span>
        </header>
        <p className="din-lede">{textoDaFila}</p>
        <div className="pb-fila">
          <AnimatePresence initial={false}>
            {semEscritorio.map((p) => (
              <motion.div key={p.id} className="pb-pedido" layout exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
                <span className="adm-tit">
                  <b>{p.nome}</b>
                  <small className="mp-mono">{p.email}</small>
                </span>
                <span className="pb-pedido-meta">
                  conta criada em <span className="ds-num">{p.criada}</span>
                  {!p.email.endsWith("@prosul.com.br") && <em className="pb-fora-do-dominio">e-mail fora da PROSUL</em>}
                </span>
                <span className="pb-pedido-acoes">
                  <Botao variante="quiet" tamanho="sm" onClick={() => mudar(p.id, (x) => ({ ...x, ativo: false }))}>
                    Desativar conta
                  </Botao>
                  <Botao variante="ghost" tamanho="sm" onClick={() => liberar(p.id, "ADMIN")}>
                    Liberar como admin
                  </Botao>
                  <Botao variante="primary" tamanho="sm" onClick={() => liberar(p.id, "MEMBER")}>
                    Liberar como membro
                  </Botao>
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {!semEscritorio.length && <p className="pb-fila-vazia">Toda conta ativa tem vínculo com o escritório.</p>}
        </div>
      </section>

      <section className="adm-numeros pb-numeros" aria-label="Pessoas em números">
        {(
          [
            ["Usuários", totais.usuarios],
            ["Ativos", totais.ativos],
            ["Admins", totais.admins],
            ["LDs", totais.lds],
          ] as const
        ).map(([r, v]) => (
          <div key={r} className="adm-num adm-num--fixo">
            <span className="adm-num-rotulo">{r}</span>
            <b className="ds-num">{v}</b>
          </div>
        ))}
      </section>

      <section className="adm-bloco" aria-labelledby="pb-pessoas">
        <header>
          <h2 id="pb-pessoas">Pessoas</h2>
          <span className="adm-fraco">{plural(visiveis.length, "pessoa", "pessoas")}</span>
        </header>
        <form className="pb-linha-form" onSubmit={(e) => e.preventDefault()} aria-label="Adicionar pessoa">
          <input className="pb-campo" placeholder="email@prosul.com.br" aria-label="E-mail da pessoa a adicionar" />
          <input className="pb-campo" placeholder="Nome" aria-label="Nome da pessoa a adicionar" />
          <select className="pb-campo pb-select" aria-label="Papel da pessoa a adicionar" defaultValue="USER">
            <option value="USER">Usuário</option>
            <option value="ADMIN">Admin</option>
          </select>
          <Botao variante="ghost" tamanho="sm" type="submit">
            <UserPlus size={14} /> Adicionar
          </Botao>
        </form>
        <form className="pb-linha-form pb-filtros" onSubmit={(e) => e.preventDefault()} aria-label="Filtrar pessoas">
          <label className="pb-busca">
            <Search size={14} aria-hidden />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou e-mail" aria-label="Buscar pessoa por nome ou e-mail" />
          </label>
          <select className="pb-campo pb-select" value={papel} onChange={(e) => setPapel(e.target.value)} aria-label="Filtrar por papel">
            <option value="all">Todos papéis</option>
            <option value="ADMIN">Admins</option>
            <option value="USER">Usuários</option>
          </select>
          <select className="pb-campo pb-select" value={situacao} onChange={(e) => setSituacao(e.target.value)} aria-label="Filtrar por situação">
            <option value="all">Todos status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Desativados</option>
          </select>
        </form>

        <AnimatePresence initial={false}>
          {marcados.size > 0 && (
            <motion.div className="pb-lote" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <b className="ds-num">{plural(marcados.size, "selecionado", "selecionados")}</b>
              <Botao variante="quiet" tamanho="sm" onClick={() => setConfirma({ texto: CONFIRMA.admins(marcados.size), perigo: false })}>
                Tornar admins
              </Botao>
              <Botao variante="quiet" tamanho="sm" onClick={() => setConfirma({ texto: CONFIRMA.desativar(marcados.size), perigo: true })}>
                Desativar
              </Botao>
              <Botao variante="quiet" tamanho="sm">
                Ativar
              </Botao>
              <Botao variante="quiet" tamanho="sm" onClick={() => (setMarcados(new Set()), setConfirma(null))}>
                Limpar
              </Botao>
            </motion.div>
          )}
        </AnimatePresence>
        <Confirma c={confirma} onCancelar={() => setConfirma(null)} />

        <div className="adm-tabela pb-tabela">
          <div className="adm-linha din-cab">
            <span>
              <input type="checkbox" className="pb-check" checked={todos} onChange={() => setMarcados(todos ? new Set() : new Set(visiveis.map((p) => p.id)))} aria-label="Selecionar todos" />
            </span>
            <span>Usuário</span>
            <span>Conta</span>
            <span>Centro de controle</span>
            <span>Escritório</span>
            <span>Auditorias</span>
            <span className="din-direita">LDs</span>
            <span className="pb-col-data">Atualizado</span>
            <span />
          </div>
          {visiveis.map((p) => {
            const v = rotuloDoVinculo(p.vinculo);
            const estaAberta = aberta === p.id;
            return (
              <Fragment key={p.id}>
                <div
                  className={`adm-linha pb-pessoa${marcados.has(p.id) ? " pb-pessoa--marcada" : ""}${p.ativo ? "" : " pb-pessoa--fora"}${estaAberta ? " pb-pessoa--aberta" : ""}`}
                  onClick={() => setAberta(estaAberta ? null : p.id)}
                >
                  <span onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="pb-check" checked={marcados.has(p.id)} onChange={() => marcar(p.id)} aria-label={`Selecionar ${p.nome}`} />
                  </span>
                  <span className="adm-tit">
                    <b>{p.nome}</b>
                    <small className="mp-mono">{p.email}</small>
                  </span>
                  <span className={`mot-estado ${p.ativo ? "mot-estado--pronto" : "mot-estado--sem-chave"}`}>
                    <i aria-hidden />
                    {p.ativo ? "Ativa" : "Desativada"}
                  </span>
                  <span className={`pb-papel${p.papel === "ADMIN" ? " pb-papel--admin" : ""}`}>{p.papel === "ADMIN" ? "Admin" : "Usuário"}</span>
                  <span className={`pb-vinculo-rotulo pb-vinculo--${v.toLowerCase()}`}>{v === "—" ? "fora" : v}</span>
                  <span className="pb-aud">
                    <BarraEmbutida valor={p.auditorias} maximo={maxAud} />
                    <b className="ds-num">{p.auditorias}</b>
                  </span>
                  <span className="ds-num din-direita adm-fraco">{p.lds}</span>
                  <span className="ds-num adm-fraco pb-col-data">{p.atualizado}</span>
                  <button type="button" className="pb-abrir" aria-expanded={estaAberta} aria-label={`Acesso de ${p.nome}`} onClick={(e) => (e.stopPropagation(), setAberta(estaAberta ? null : p.id))}>
                    <ChevronDown size={15} aria-hidden />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {estaAberta && (
                    <Ficha
                      key={`f-${p.id}`}
                      p={p}
                      porta={porta}
                      adminsAtivos={adminsAtivos}
                      inicial={variante === "ficha" && p.id === "p4" ? { admin: true, escritorio: "ADMIN" } : undefined}
                      onFechar={() => setAberta(null)}
                      onAplicar={(c) => aplicar(p.id, c)}
                    />
                  )}
                </AnimatePresence>
              </Fragment>
            );
          })}
        </div>
      </section>
    </>
  );
}
