"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, CircleAlert, Search, TriangleAlert, UserPlus } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

import { useAdminToken } from "@/components/admin/admin-token";
import { Botao, Girando } from "@/components/ds/basicos";
import { BarraEmbutida } from "@/components/ds/medidas";
import { useCabecaDoAdmin } from "@/components/telas/admin/casca";
import { RITMO, SUAVE } from "@/components/telas/comum/ritmo";
import { useControles } from "@/components/telas/admin/controles";
import { AvisoDaCarga, quandoCurto } from "@/components/telas/admin/pecas";
import { classificarFalha, faseDaCarga, type FalhaDaCarga } from "@/lib/estado-da-carga";
import { formatarDiaMes } from "@/lib/fuso-de-brasilia";
import { useTempo } from "@/lib/ds/tempo";
import { palavra, plural } from "@/lib/plural";
import "@/components/telas/admin/pessoas-banco.css";

/*
 * PESSOAS: quem entra, com que alçada, e o que acontece com quem chega sem
 * convite. O app mexe em TRÊS chaves independentes, e a tela as mostra
 * separadas porque cada uma tem uma consequência diferente:
 *
 *   conta       (User.isActive)          entra no Nexo ou não;
 *   plataforma  (User.role)              abre o centro de controle ou não;
 *   escritório  (OrganizationMember)     vê os projetos da PROSUL ou não.
 *
 * Os dados e as ações são os de antes (/api/admin/users e
 * /api/admin/users/escritorio). Duas mudanças de comportamento, as do PR #8:
 * ADICIONAR já libera no escritório (antes criava só a conta, e com a porta
 * fechada a pessoa adicionada levava 403), e toda ação que tira acesso
 * pergunta NA TELA antes de ir.
 */

type Vinculo = { role: "OWNER" | "ADMIN" | "MEMBER"; status: "ACTIVE" | "INVITED" | "DISABLED"; organizationId: string } | null;
type Pessoa = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  auditCount: number;
  sessionCount: number;
  ldDraftCount: number;
  ldGeneratedCount: number;
  escritorio: Vinculo;
  createdAt: string;
  updatedAt: string;
};
type Porta = "prosul" | "convite" | "outra";
type Escritorio = "fora" | "MEMBER" | "ADMIN" | "OWNER";
type Chaves = { ativo: boolean; admin: boolean; escritorio: Escritorio };

const PORTAS: { id: Porta; rotulo: string }[] = [
  { id: "prosul", rotulo: "Entra na PROSUL como MEMBER" },
  { id: "convite", rotulo: "Exige convite" },
  { id: "outra", rotulo: "Entra em outro escritório" },
];
const EXPLICACAO_DA_PORTA: Record<Porta, string> = {
  prosul: "O login é Google: qualquer pessoa com conta Google que abrir o site vira membro e passa a enxergar os projetos do escritório. Quem já foi desligado à mão não volta — essa trava é separada.",
  convite: "Conta nova sem convite leva 403 até alguém liberá-la em Pessoas.",
  outra: "Quem chega sem convite entra no escritório informado, como MEMBER.",
};
const NOME_DO_ESCRITORIO: Record<Escritorio, string> = { fora: "fora", MEMBER: "membro", ADMIN: "admin do escritório", OWNER: "dono" };
const ULTIMO_ADMIN = "Este é o último admin ativo. Promova outro usuário antes de rebaixar ou desativar este.";

const rotuloDoVinculo = (v: Vinculo) => (!v ? "fora" : v.status === "INVITED" ? "CONVIDADO" : v.status === "DISABLED" ? "DESLIGADO" : v.role);
const chavesDe = (p: Pessoa): Chaves => ({ ativo: p.isActive, admin: p.role === "ADMIN", escritorio: p.escritorio ? p.escritorio.role : "fora" });

type Confirmacao = { texto: string; perigo: boolean; aplicar: () => void } | null;

function Confirma({ c, onCancelar }: { c: Confirmacao; onCancelar: () => void }) {
  const { k } = useTempo();
  return (
    <AnimatePresence initial={false}>
      {c && (
        <motion.div
          className={`pb-confirma${c.perigo ? " pb-confirma--perigo" : ""}`}
          role="alertdialog"
          aria-label={c.texto}
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
            <Botao
              variante="primary"
              tamanho="sm"
              onClick={() => {
                c.aplicar();
                onCancelar();
              }}
            >
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

function Ficha({ p, porta, adminsAtivos, ocupado, onFechar, onAplicar }: { p: Pessoa; porta: Porta; adminsAtivos: number; ocupado: boolean; onFechar: () => void; onAplicar: (c: Chaves) => void }) {
  const { k } = useTempo();
  const atual = chavesDe(p);
  const [nova, setNova] = useState<Chaves>(atual);
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
    <motion.div className="pb-ficha" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
      <div className="pb-ficha-dentro" role="group" aria-label={`Acesso de ${p.name || p.email}`}>
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
              {p.escritorio?.status === "INVITED" && <span className="pb-vinculo-rotulo pb-vinculo--convidado">CONVIDADO</span>}
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
            <p className="pb-ficha-resumo">
              {mudancas.length ? (
                <>
                  <b className="ds-num">{plural(mudancas.length, "mudança", "mudanças")}:</b> {mudancas.join(" · ")}
                </>
              ) : (
                <span className="adm-fraco">Conta criada em {formatarDiaMes(p.createdAt)}. Nada mudou ainda.</span>
              )}
            </p>
          )}
          <Botao variante="ghost" tamanho="sm" onClick={onFechar}>
            {mudancas.length ? "Descartar" : "Fechar"}
          </Botao>
          <Botao variante="primary" tamanho="sm" className={tiraAcesso ? "pb-perigo" : undefined} disabled={!mudancas.length || travaDoUltimo || ocupado} onClick={() => onAplicar(nova)}>
            {ocupado && <Girando tamanho={12} />}
            Aplicar
          </Botao>
        </footer>
      </div>
    </motion.div>
  );
}

export default function AdminPessoasPage() {
  const { k } = useTempo();
  const { token, restaurado, recarga, registrarResposta } = useAdminToken();
  const controles = useControles();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [carregouEm, setCarregouEm] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroDaCarga, setErroDaCarga] = useState<{ tipo: FalhaDaCarga; detalhe: string | null } | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [busca, setBusca] = useState("");
  const [papel, setPapel] = useState("all");
  const [situacao, setSituacao] = useState("all");
  const [aberta, setAberta] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [confirma, setConfirma] = useState<Confirmacao>(null);
  const fase = faseDaCarga({ restaurado, token, carregando, erro: erroDaCarga?.tipo ?? null, temDados: Boolean(carregouEm) });
  useCabecaDoAdmin({ atualizadoEm: carregouEm, carregando });

  const autorizado = (corpo?: unknown) => ({ Authorization: `Bearer ${token.trim()}`, ...(corpo ? { "Content-Type": "application/json" } : {}) });

  async function carregar(t = token) {
    if (!t.trim()) return;
    setCarregando(true);
    setErroDaCarga(null);
    let r: Response;
    try {
      r = await fetch("/api/admin/users", { cache: "no-store", headers: { Authorization: `Bearer ${t.trim()}` } });
    } catch {
      setErroDaCarga({ tipo: "rede", detalhe: null });
      setCarregando(false);
      return;
    }
    const corpo = (await r.json().catch(() => null)) as { users?: Pessoa[]; error?: string } | null;
    if (!r.ok || !corpo || !Array.isArray(corpo.users)) {
      const tipo = classificarFalha(r);
      if (tipo === "negado") registrarResposta(false);
      setErroDaCarga({ tipo, detalhe: corpo?.error ?? `HTTP ${r.status}` });
      setCarregando(false);
      return;
    }
    registrarResposta(true);
    setPessoas(corpo.users);
    setCarregouEm(new Date().toISOString());
    setCarregando(false);
  }

  useEffect(() => {
    if (!restaurado || !token.trim()) return;
    queueMicrotask(() => void carregar(token));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, restaurado, recarga]);

  /** Conta e plataforma: PATCH /api/admin/users. O servidor recusa rebaixar o último admin. */
  async function salvarConta(p: Pessoa, mudar: Partial<Pick<Pessoa, "role" | "isActive">>) {
    const r = await fetch("/api/admin/users", { method: "PATCH", headers: autorizado(true), body: JSON.stringify({ ...p, ...mudar }) });
    const corpo = (await r.json().catch(() => null)) as { user?: Pessoa; error?: string } | null;
    if (!r.ok || !corpo?.user) throw new Error(corpo?.error ?? "Não foi possível salvar a pessoa.");
    return corpo.user;
  }

  /** Escritório: liberar (nasce convidado), mudar o papel, ou remover. */
  async function vincular(email: string, acao: "liberar" | "papel" | "remover", role?: "MEMBER" | "ADMIN") {
    const r = await fetch("/api/admin/users/escritorio", { method: "POST", headers: autorizado(true), body: JSON.stringify({ email, acao, ...(role ? { role } : {}) }) });
    const corpo = (await r.json().catch(() => null)) as { escritorio?: Vinculo; error?: string } | null;
    if (!r.ok) throw new Error(corpo?.error ?? "Não foi possível mudar o vínculo com o escritório.");
    return corpo?.escritorio ?? null;
  }

  const trocar = (id: string, f: (p: Pessoa) => Pessoa) => setPessoas((ps) => ps.map((p) => (p.id === id ? f(p) : p)));

  async function aplicar(p: Pessoa, c: Chaves) {
    const antes = chavesDe(p);
    setOcupado(p.id);
    setErro("");
    try {
      let atual = p;
      if (c.ativo !== antes.ativo || c.admin !== antes.admin) atual = await salvarConta(p, { isActive: c.ativo, role: c.admin ? "ADMIN" : "USER" });
      if (c.escritorio !== antes.escritorio && antes.escritorio !== "OWNER") {
        const vinculo =
          c.escritorio === "fora"
            ? await vincular(p.email, "remover")
            : await vincular(p.email, antes.escritorio === "fora" ? "liberar" : "papel", c.escritorio === "ADMIN" ? "ADMIN" : "MEMBER");
        atual = { ...atual, escritorio: c.escritorio === "fora" ? null : vinculo };
      }
      trocar(p.id, () => atual);
      setAberta(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível aplicar.");
    } finally {
      setOcupado("");
    }
  }

  async function emLote(mudar: Partial<Pick<Pessoa, "role" | "isActive">>) {
    const ids = [...marcados];
    setOcupado("lote");
    setErro("");
    try {
      const r = await fetch("/api/admin/users", { method: "PATCH", headers: autorizado(true), body: JSON.stringify({ ids, ...mudar }) });
      const corpo = (await r.json().catch(() => null)) as { error?: string } | null;
      if (!r.ok) throw new Error(corpo?.error ?? "Não foi possível atualizar em lote.");
      setPessoas((ps) => ps.map((p) => (ids.includes(p.id) ? { ...p, ...mudar } : p)));
      setMarcados(new Set());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível atualizar em lote.");
    } finally {
      setOcupado("");
    }
  }

  async function liberar(p: Pessoa, role: "MEMBER" | "ADMIN") {
    setOcupado(p.id);
    setErro("");
    try {
      const v = await vincular(p.email, "liberar", role);
      trocar(p.id, (x) => ({ ...x, escritorio: v }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível liberar.");
    } finally {
      setOcupado("");
    }
  }

  async function desativar(p: Pessoa) {
    setOcupado(p.id);
    setErro("");
    try {
      const u = await salvarConta(p, { isActive: false });
      trocar(p.id, () => u);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível desativar.");
    } finally {
      setOcupado("");
    }
  }

  // os filtros são locais: a lista vem inteira (o servidor devolve até 200 pessoas)
  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pessoas.filter((p) => (!q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)) && (papel === "all" || p.role === papel) && (situacao === "all" || (situacao === "active" ? p.isActive : !p.isActive)));
  }, [pessoas, busca, papel, situacao]);
  const semEscritorio = pessoas.filter((p) => !p.escritorio && p.isActive);
  const adminsAtivos = pessoas.filter((p) => p.role === "ADMIN" && p.isActive).length;
  const maxAud = Math.max(1, ...pessoas.map((p) => p.auditCount));
  const todos = visiveis.length > 0 && visiveis.every((p) => marcados.has(p.id));
  const porta = (controles.retrato?.freio.estado ?? "prosul") as Porta;
  const semResposta = fase === "sem-token" ? "Aguardando o token de administração." : fase === "erro" ? "Não carregado." : "Carregando…";

  const textoDaFila =
    porta === "convite"
      ? "Entraram com o Google e levaram 403: a conta existe, mas sem convite não vê nada. Liberar cria o vínculo como convidado, e o próximo login o ativa."
      : porta === "prosul"
        ? "Contas que existem e não têm vínculo. Com a porta aberta, o próximo login delas cria o vínculo sozinho, como MEMBER; liberar agora só adianta."
        : "Contas que existem e não têm vínculo com a PROSUL. Com a porta apontando para outro escritório, o próximo login as leva para lá.";

  return (
    <>
      <AvisoDaCarga fase={fase} erro={erroDaCarga?.tipo} detalhe={erroDaCarga?.detalhe} oque="as pessoas" atualizadoEm={carregouEm} onTentar={() => void carregar()} />
      {erro && (
        <div className="adm-aviso adm-aviso--erro" role="alert">
          <CircleAlert size={15} aria-hidden />
          <p>{erro}</p>
        </div>
      )}

      <Adicionar
        porta={porta}
        desligado={!carregouEm}
        onAdicionar={async (n) => {
          const r = await fetch("/api/admin/users", { method: "POST", headers: autorizado(true), body: JSON.stringify({ email: n.email, name: n.nome, role: n.admin ? "ADMIN" : "USER", isActive: true }) });
          const corpo = (await r.json().catch(() => null)) as { user?: Pessoa; error?: string } | null;
          if (!r.ok || !corpo?.user) throw new Error(corpo?.error ?? "Não foi possível adicionar a pessoa.");
          const existia = pessoas.some((p) => p.id === corpo.user!.id);
          let criada = corpo.user;
          let aviso = "";
          if (n.escritorio !== "fora" && !criada.escritorio) {
            try {
              criada = { ...criada, escritorio: await vincular(criada.email, "liberar", n.escritorio) };
            } catch (e) {
              aviso = `A conta de ${criada.email} foi criada, mas o vínculo com o escritório não: ${e instanceof Error ? e.message : "o servidor recusou"}. Use “Liberar” na fila Sem escritório.`;
            }
          }
          setPessoas((ps) => [criada, ...ps.filter((p) => p.id !== criada.id)]);
          return { existia, aviso };
        }}
      />

      <section className="adm-bloco" aria-labelledby="pb-porta">
        <header>
          <h2 id="pb-porta">A porta de entrada</h2>
        </header>
        <p className="din-lede">O que acontece com quem faz login e não tem convite.</p>
        {controles.retrato ? (
          <PortaDeEntrada
            key={`${controles.retrato.freio.estado}-${controles.retrato.freio.organizationId ?? ""}`}
            inicial={porta}
            inicialEscritorio={controles.retrato.freio.organizationId ?? ""}
            salvando={controles.salvando === "freio"}
            erro={controles.erro}
            onSalvar={(estado, organizationId) => void controles.mandar({ acao: "freio", estado, organizationId }, "freio")}
          />
        ) : (
          <div className="pb-porta">
            <AvisoDaCarga fase={controles.fase} erro={controles.erroDaCarga?.tipo} detalhe={controles.erroDaCarga?.detalhe} oque="a porta de entrada" onTentar={controles.carregar} />
          </div>
        )}
      </section>

      <section className="adm-bloco" aria-labelledby="pb-fila">
        <header>
          <h2 id="pb-fila">Sem escritório</h2>
          <span className="adm-fraco">{carregouEm ? (semEscritorio.length ? plural(semEscritorio.length, "conta esperando", "contas esperando") : "ninguém esperando") : ""}</span>
        </header>
        <p className="din-lede">{textoDaFila}</p>
        <div className="pb-fila">
          <AnimatePresence initial={false}>
            {semEscritorio.map((p) => (
              <motion.div key={p.id} className="pb-pedido" layout exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }} transition={{ duration: RITMO.troca * k, ease: SUAVE }}>
                <span className="adm-tit">
                  <b>{p.name || p.email}</b>
                  <small className="mp-mono">{p.email}</small>
                </span>
                <span className="pb-pedido-meta">
                  conta criada em <span className="ds-num">{formatarDiaMes(p.createdAt)}</span>
                  {!p.email.endsWith("@prosul.com.br") && <em className="pb-fora-do-dominio">e-mail fora da PROSUL</em>}
                </span>
                <span className="pb-pedido-acoes">
                  <Botao variante="quiet" tamanho="sm" disabled={Boolean(ocupado)} onClick={() => setConfirma({ texto: `Desativar ${p.name || p.email}? Perde o acesso ao produto imediatamente — o histórico fica.`, perigo: true, aplicar: () => void desativar(p) })}>
                    Desativar conta
                  </Botao>
                  <Botao variante="ghost" tamanho="sm" disabled={Boolean(ocupado)} onClick={() => void liberar(p, "ADMIN")}>
                    Liberar como admin
                  </Botao>
                  <Botao variante="primary" tamanho="sm" disabled={Boolean(ocupado)} onClick={() => void liberar(p, "MEMBER")}>
                    {ocupado === p.id && <Girando tamanho={12} />}
                    Liberar como membro
                  </Botao>
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {carregouEm && !semEscritorio.length && <p className="pb-fila-vazia">Toda conta ativa tem vínculo com o escritório.</p>}
          {!carregouEm && <p className="pb-fila-vazia">{semResposta}</p>}
        </div>
      </section>

      <section className="adm-numeros pb-numeros" aria-label="Pessoas em números">
        {(
          [
            ["Usuários", pessoas.length],
            ["Ativos", pessoas.filter((p) => p.isActive).length],
            ["Admins", adminsAtivos],
            ["LDs", pessoas.reduce((a, p) => a + p.ldDraftCount, 0)],
          ] as const
        ).map(([r, v]) => (
          <div key={r} className="adm-num adm-num--fixo">
            <span className="adm-num-rotulo">{r}</span>
            <b className="ds-num">{carregouEm ? v : "—"}</b>
          </div>
        ))}
      </section>

      <section className="adm-bloco" aria-labelledby="pb-pessoas">
        <header>
          <h2 id="pb-pessoas">Pessoas</h2>
          <span className="adm-fraco">{carregouEm ? plural(visiveis.length, "pessoa", "pessoas") : ""}</span>
        </header>
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
              <Botao
                variante="quiet"
                tamanho="sm"
                disabled={ocupado === "lote"}
                onClick={() =>
                  setConfirma({
                    texto: `Dar acesso de admin a ${plural(marcados.size, "pessoa", "pessoas")}? ${palavra(marcados.size, "Ela passa", "Elas passam")} a ver custo, configuração de provedores, e a poder promover outras.`,
                    perigo: false,
                    aplicar: () => void emLote({ role: "ADMIN" }),
                  })
                }
              >
                Tornar admins
              </Botao>
              <Botao
                variante="quiet"
                tamanho="sm"
                disabled={ocupado === "lote"}
                onClick={() =>
                  setConfirma({
                    texto: `Desativar ${plural(marcados.size, "pessoa", "pessoas")}? ${palavra(marcados.size, "Ela perde", "Elas perdem")} o acesso ao produto imediatamente.`,
                    perigo: true,
                    aplicar: () => void emLote({ isActive: false }),
                  })
                }
              >
                Desativar
              </Botao>
              <Botao variante="quiet" tamanho="sm" disabled={ocupado === "lote"} onClick={() => void emLote({ isActive: true })}>
                Ativar
              </Botao>
              <Botao variante="quiet" tamanho="sm" onClick={() => (setMarcados(new Set()), setConfirma(null))}>
                Limpar
              </Botao>
            </motion.div>
          )}
        </AnimatePresence>
        <Confirma c={confirma} onCancelar={() => setConfirma(null)} />

        {!carregouEm ? (
          <p className="adm-vazio">{semResposta}</p>
        ) : (
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
              const v = rotuloDoVinculo(p.escritorio);
              const estaAberta = aberta === p.id;
              return (
                <Fragment key={p.id}>
                  <div
                    className={`adm-linha pb-pessoa${marcados.has(p.id) ? " pb-pessoa--marcada" : ""}${p.isActive ? "" : " pb-pessoa--fora"}${estaAberta ? " pb-pessoa--aberta" : ""}`}
                    onClick={() => setAberta(estaAberta ? null : p.id)}
                  >
                    <span onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="pb-check"
                        checked={marcados.has(p.id)}
                        onChange={() =>
                          setMarcados((m) => {
                            const n = new Set(m);
                            if (n.has(p.id)) n.delete(p.id);
                            else n.add(p.id);
                            return n;
                          })
                        }
                        aria-label={`Selecionar ${p.name || p.email}`}
                      />
                    </span>
                    <span className="adm-tit">
                      <b>{p.name || p.email}</b>
                      <small className="mp-mono">{p.email}</small>
                    </span>
                    <span className={`mot-estado ${p.isActive ? "mot-estado--pronto" : "mot-estado--sem-chave"}`}>
                      <i aria-hidden />
                      {p.isActive ? "Ativa" : "Desativada"}
                    </span>
                    <span className={`pb-papel${p.role === "ADMIN" ? " pb-papel--admin" : ""}`}>{p.role === "ADMIN" ? "Admin" : "Usuário"}</span>
                    <span className={`pb-vinculo-rotulo pb-vinculo--${v.toLowerCase()}`}>{v}</span>
                    <span className="pb-aud">
                      <BarraEmbutida valor={p.auditCount} maximo={maxAud} />
                      <b className="ds-num">{p.auditCount}</b>
                    </span>
                    <span className="ds-num din-direita adm-fraco">{p.ldDraftCount}</span>
                    <span className="ds-num adm-fraco pb-col-data">{quandoCurto(p.updatedAt)}</span>
                    <button type="button" className="pb-abrir" aria-expanded={estaAberta} aria-label={`Acesso de ${p.name || p.email}`} onClick={(e) => (e.stopPropagation(), setAberta(estaAberta ? null : p.id))}>
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
                        ocupado={ocupado === p.id}
                        onFechar={() => setAberta(null)}
                        onAplicar={(c) => {
                          const tira = (p.isActive && !c.ativo) || (p.escritorio !== null && c.escritorio === "fora");
                          if (tira) setConfirma({ texto: `${c.ativo ? "Tirar" : "Desativar e tirar"} o acesso de ${p.name || p.email}? ${c.ativo ? "Deixa de ver os projetos do escritório." : "Perde o acesso ao produto imediatamente — o histórico fica."}`, perigo: true, aplicar: () => void aplicar(p, c) });
                          else void aplicar(p, c);
                        }}
                      />
                    )}
                  </AnimatePresence>
                </Fragment>
              );
            })}
            {!visiveis.length && <p className="adm-vazio">Ninguém com esses filtros.</p>}
          </div>
        )}
      </section>
    </>
  );
}

/** A PORTA: o interruptor com a maior consequência do painel, por isso abre a tela de pessoas logo depois de Adicionar. */
function PortaDeEntrada({ inicial, inicialEscritorio, salvando, erro, onSalvar }: { inicial: Porta; inicialEscritorio: string; salvando: boolean; erro: string; onSalvar: (p: Porta, organizationId: string) => void }) {
  const [porta, setPorta] = useState<Porta>(inicial);
  const [escritorio, setEscritorio] = useState(inicialEscritorio);
  const mudou = porta !== inicial || (porta === "outra" && escritorio !== inicialEscritorio);
  return (
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
      <Botao variante="ghost" tamanho="sm" disabled={!mudou || salvando} onClick={() => onSalvar(porta, escritorio)}>
        {salvando && <Girando tamanho={12} />}
        Salvar
      </Botao>
      {erro && <p className="din-erro-linha">{erro}</p>}
    </div>
  );
}

type NovaPessoa = { email: string; nome: string; admin: boolean; escritorio: "fora" | "MEMBER" | "ADMIN" };

/*
 * ADICIONAR: o e-mail é o que importa, então é o primeiro campo da tela. O
 * mesmo gesto cria a conta e libera no escritório (nasce convidado; o primeiro
 * login com o Google ativa).
 */
function Adicionar({ porta, desligado, onAdicionar }: { porta: Porta; desligado: boolean; onAdicionar: (n: NovaPessoa) => Promise<{ existia: boolean; aviso: string }> }) {
  const { k } = useTempo();
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [admin, setAdmin] = useState(false);
  const [noEscritorio, setNoEscritorio] = useState<NovaPessoa["escritorio"]>("MEMBER");
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    const limpo = email.trim().toLowerCase();
    if (!limpo || !limpo.includes("@")) return (setErro("Informe um e-mail válido."), setFeito(""));
    setEnviando(true);
    setErro("");
    setFeito("");
    try {
      const r = await onAdicionar({ email: limpo, nome: nome.trim(), admin, escritorio: noEscritorio });
      if (r.aviso) setErro(r.aviso);
      else
        setFeito(
          r.existia
            ? `${limpo} já tinha conta: nome e papel atualizados.`
            : noEscritorio === "fora"
              ? porta === "convite"
                ? `${limpo} tem conta, mas sem escritório: vai levar 403 até ser liberado.`
                : `${limpo} tem conta; o primeiro login cria o vínculo como MEMBER.`
              : `${limpo} entra como convidado; o primeiro login com o Google ativa.`,
        );
      setEmail("");
      setNome("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível adicionar a pessoa.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="adm-bloco" aria-labelledby="pb-adicionar">
      <header>
        <h2 id="pb-adicionar">Adicionar pessoa</h2>
      </header>
      <p className="din-lede">O e-mail da conta Google com que a pessoa vai entrar.</p>
      <form
        className="pb-adicionar"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
        aria-label="Adicionar pessoa"
        noValidate
      >
        <label className="pb-adicionar-email">
          <span>E-mail</span>
          <input
            className={`pb-campo pb-campo--grande${erro ? " pb-campo--erro" : ""}`}
            type="email"
            value={email}
            onChange={(e) => (setEmail(e.target.value), setErro(""))}
            placeholder="nome@prosul.com.br"
            autoComplete="off"
            aria-label="E-mail da pessoa a adicionar"
            aria-invalid={!!erro}
            aria-describedby="pb-adicionar-retorno"
          />
        </label>
        <label className="pb-adicionar-nome">
          <span>Nome</span>
          <input className="pb-campo pb-campo--grande" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="opcional" autoComplete="off" aria-label="Nome da pessoa a adicionar" />
        </label>
        <div className="pb-adicionar-chave">
          <span>Centro de controle</span>
          <Chave rotulo="Centro de controle" valor={admin ? "ADMIN" : "USER"} opcoes={[{ id: "USER", rotulo: "Usuário" }, { id: "ADMIN", rotulo: "Admin" }]} onTrocar={(v) => setAdmin(v === "ADMIN")} />
        </div>
        <div className="pb-adicionar-chave">
          <span>Escritório PROSUL</span>
          <Chave
            rotulo="Escritório PROSUL"
            valor={noEscritorio}
            opcoes={[
              { id: "MEMBER", rotulo: "Membro" },
              { id: "ADMIN", rotulo: "Admin" },
              { id: "fora", rotulo: "Fora" },
            ]}
            onTrocar={setNoEscritorio}
          />
        </div>
        <Botao variante="primary" type="submit" className="pb-adicionar-botao" disabled={desligado || enviando}>
          {enviando ? <Girando tamanho={13} /> : <UserPlus size={14} />} Adicionar
        </Botao>
      </form>
      <AnimatePresence initial={false} mode="wait">
        {(erro || feito) && (
          <motion.p
            key={erro || feito}
            id="pb-adicionar-retorno"
            className={`pb-adicionar-retorno${erro ? " pb-adicionar-retorno--erro" : ""}`}
            role={erro ? "alert" : "status"}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: RITMO.troca * k, ease: SUAVE }}
          >
            {erro || feito}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}
