"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, Search, TriangleAlert, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

import { Botao } from "@/components/ds/basicos";
import { BarraEmbutida } from "@/components/ds/medidas";
import { useTempo } from "@/lib/ds/tempo";

import { RITMO, SUAVE } from "../conversa/turnos";
import { CONFIRMA, EXPLICACAO_DA_PORTA, PESSOAS, plural, PORTAS, rotuloDoVinculo, type Pessoa, type Porta } from "./dados-pessoas-banco";
import "./pessoas-banco.css";

/*
 * PESSOAS: quem entra, com que alçada, e o que acontece com quem chega sem
 * convite. A ordem do app (a porta de entrada, a régua, adicionar, filtrar, a
 * tabela). Toda ação que tira ou dá poder confirma NA TELA, numa faixa com a
 * frase do app; nunca um diálogo do navegador.
 */

export type VariantePessoas = "normal" | "lote" | "convite";

type Confirmacao = { texto: string; perigo: boolean } | null;

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

export function Pessoas({ variante }: { variante: VariantePessoas }) {
  const [porta, setPorta] = useState<Porta>(variante === "convite" ? "convite" : "prosul");
  const [escritorio, setEscritorio] = useState("");
  const [busca, setBusca] = useState("");
  const [papel, setPapel] = useState("all");
  const [situacao, setSituacao] = useState("all");
  const [marcados, setMarcados] = useState<Set<string>>(new Set(variante === "lote" ? ["p5", "p6"] : []));
  const [confirma, setConfirma] = useState<Confirmacao>(variante === "lote" ? { texto: CONFIRMA.desativar(2), perigo: true } : null);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return PESSOAS.filter(
      (p) =>
        (!q || p.nome.toLowerCase().includes(q) || p.email.includes(q)) &&
        (papel === "all" || p.papel === papel) &&
        (situacao === "all" || (situacao === "active" ? p.ativo : !p.ativo)),
    );
  }, [busca, papel, situacao]);
  const totais = { usuarios: PESSOAS.length, ativos: PESSOAS.filter((p) => p.ativo).length, admins: PESSOAS.filter((p) => p.papel === "ADMIN").length, lds: PESSOAS.reduce((a, p) => a + p.lds, 0) };
  const maxAud = Math.max(...PESSOAS.map((p) => p.auditorias));
  const todos = visiveis.length > 0 && visiveis.every((p) => marcados.has(p.id));
  const marcar = (id: string) => setMarcados((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const quem = (p: Pessoa) => p.nome || p.email;

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
            <span>Papel</span>
            <span>Status</span>
            <span>Escritório</span>
            <span>Auditorias</span>
            <span className="din-direita">LDs</span>
            <span className="din-direita">Geradas</span>
            <span>Atualizado</span>
            <span />
          </div>
          {visiveis.map((p) => {
            const v = rotuloDoVinculo(p.vinculo);
            return (
              <div key={p.id} className={`adm-linha pb-pessoa${marcados.has(p.id) ? " pb-pessoa--marcada" : ""}${p.ativo ? "" : " pb-pessoa--fora"}`}>
                <span>
                  <input type="checkbox" className="pb-check" checked={marcados.has(p.id)} onChange={() => marcar(p.id)} aria-label={`Selecionar ${p.nome}`} />
                </span>
                <span className="adm-tit">
                  <b>{p.nome}</b>
                  <small className="mp-mono">{p.email}</small>
                </span>
                <span className={`pb-papel${p.papel === "ADMIN" ? " pb-papel--admin" : ""}`}>{p.papel === "ADMIN" ? "Admin" : "Usuário"}</span>
                <span className={`mot-estado ${p.ativo ? "mot-estado--pronto" : "mot-estado--sem-chave"}`}>
                  <i aria-hidden />
                  {p.ativo ? "Ativo" : "Desativado"}
                </span>
                <span className="pb-vinculo">
                  <span className={`pb-vinculo-rotulo pb-vinculo--${v.toLowerCase()}`}>{v}</span>
                  <button type="button" className="pb-acao" title={p.vinculo ? "Remover do escritório" : "Liberar na PROSUL (nasce como convidado)"}>
                    {p.vinculo ? "remover" : "liberar"}
                  </button>
                </span>
                <span className="pb-aud">
                  <BarraEmbutida valor={p.auditorias} maximo={maxAud} />
                  <b className="ds-num">{p.auditorias}</b>
                </span>
                <span className="ds-num din-direita adm-fraco">{p.lds}</span>
                <span className="ds-num din-direita adm-fraco">{p.geradas}</span>
                <span className="ds-num adm-fraco">{p.atualizado}</span>
                <span className="pb-acoes">
                  <Botao variante="quiet" tamanho="sm" onClick={() => setConfirma({ texto: p.papel === "ADMIN" ? CONFIRMA.tirarAdmin(quem(p)) : CONFIRMA.darAdmin(quem(p)), perigo: false })}>
                    {p.papel === "ADMIN" ? "Tornar usuário" : "Tornar admin"}
                  </Botao>
                  <Botao variante="quiet" tamanho="sm" onClick={() => p.ativo && setConfirma({ texto: CONFIRMA.desativarUm(quem(p)), perigo: true })}>
                    {p.ativo ? "Desativar" : "Ativar"}
                  </Botao>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
