"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  FileUp,
  MessageCircle,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar, Botao, Esqueleto, NumeroQueChega, Orbe, Segmento, Selo, Seletor, Tecla } from "@/components/ds/basicos";
import { ATIVIDADE, GERADOS, PROJETOS, USUARIO, type ProjetoDeExemplo } from "@/lib/design-lab/amostras";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import "./painel.css";

export type SituacaoDoPainel =
  | "com-projetos"
  | "linha-aberta"
  | "nexo-trabalhando"
  | "arrastando"
  | "primeiro-acesso"
  | "nada-pendente"
  | "carregando"
  | "erro-lista"
  | "personalizando"
  | "foco-rodando";

type Ordem = "parados" | "recentes" | "achados" | "codigo";
const ORDENS: { valor: Ordem; rotulo: string }[] = [
  { valor: "parados", rotulo: "Mais parados primeiro" },
  { valor: "recentes", rotulo: "Mexidos por último" },
  { valor: "achados", rotulo: "Com mais achados" },
  { valor: "codigo", rotulo: "Por código" },
];

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

/**
 * O PAINEL no sistema novo. Tudo aqui é clicável de verdade: a situação
 * escolhida no lab só define o ponto de partida.
 */
export function TelaPainel({ situacao }: { situacao: SituacaoDoPainel }) {
  const { dur, mola } = useTempo();
  const vazio = situacao === "primeiro-acesso";
  const [escopo, setEscopo] = useState<"meus" | "todos">("meus");
  const [ordem, setOrdem] = useState<Ordem>("parados");
  const [aberta, setAberta] = useState<string | null>(situacao === "linha-aberta" ? "p1" : null);
  const [lista, setLista] = useState<"ok" | "carregando" | "erro">(
    situacao === "carregando" ? "carregando" : situacao === "erro-lista" ? "erro" : "ok",
  );
  const [personalizar, setPersonalizar] = useState(situacao === "personalizando");
  const [arrastando, setArrastando] = useState(situacao === "arrastando");
  const trabalhando = situacao === "nexo-trabalhando";
  const nadaPendente = situacao === "nada-pendente";

  const projetos = useMemo(() => {
    let p = PROJETOS.map((x) =>
      nadaPendente ? { ...x, achados: 0, comVoce: 0, estado: x.estado === "pendente" ? ("sem-pendencia" as const) : x.estado } : x,
    ).map((x) => (trabalhando && x.id === "p6" ? { ...x, estado: "auditando" as const } : x));
    if (escopo === "meus") p = p.filter((x) => x.comVoce > 0 || x.estado !== "pendente" || nadaPendente);
    const ord = [...p];
    if (ordem === "parados") ord.sort((a, b) => b.diasParado - a.diasParado);
    if (ordem === "recentes") ord.sort((a, b) => a.diasParado - b.diasParado);
    if (ordem === "achados") ord.sort((a, b) => b.achados - a.achados);
    if (ordem === "codigo") ord.sort((a, b) => a.codigo.localeCompare(b.codigo));
    return ord;
  }, [escopo, ordem, nadaPendente, trabalhando]);

  function tentarDeNovo() {
    setLista("carregando");
    setTimeout(() => setLista("ok"), 1100 * (dur("layout") / 0.32));
  }

  return (
    <div
      className="pn"
      onDragEnter={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
    >
      <div className="pn-brilho" aria-hidden />

      {/* ---------- barra de cima ---------- */}
      <header className="pn-topo">
        <div className="pn-marca">
          <Orbe tamanho={22} estado={trabalhando ? "trabalhando" : "repouso"} />
          Nexo
        </div>
        <nav className="pn-nav" aria-label="Principal">
          {["Painel", "Projetos", "Montar volumes", "Achados", "Ajuda", "Administração"].map((n) => (
            <a key={n} aria-current={n === "Painel" ? "page" : undefined}>
              {n}
            </a>
          ))}
        </nav>
        <button type="button" className="pn-busca">
          <Search size={15} />
          Buscar obra, código ou ação
          <Tecla>Ctrl K</Tecla>
        </button>
        <Botao variante="quiet" icone aria-label="Avisos" className="pn-sino">
          <Bell />
          {!vazio && <i />}
        </Botao>
        <button type="button" className="pn-quem">
          <Avatar iniciais={USUARIO.iniciais} />
          <span>
            {USUARIO.nome}
            <small>
              {USUARIO.escritorio}, {USUARIO.papel}
            </small>
          </span>
          <ChevronDown size={14} />
        </button>
      </header>

      {/* ---------- abertura ---------- */}
      <section className="pn-abertura">
        <motion.button
          type="button"
          className="pn-orbe"
          aria-label="Falar com o Nexo"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={mola("smooth")}
        >
          <Orbe tamanho={112} estado={trabalhando ? "trabalhando" : "repouso"} />
          {trabalhando && (
            <motion.span
              className="pn-orbe-anel"
              initial={{ scale: 0.9, opacity: 0.6 }}
              animate={{ scale: 1.35, opacity: 0 }}
              transition={{ duration: 1.8 * (dur("layout") / 0.32), repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </motion.button>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={trabalhando ? "t" : nadaPendente || vazio ? "n" : "a"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: dur("state"), ease: ease(CURVA.out) }}
          >
            {trabalhando ? (
              <Selo tom="nexo" ponto>
                <span className="pn-brilho-texto">Analisando o memorial de 117-25</span>
              </Selo>
            ) : nadaPendente || vazio ? (
              <Selo tom="line">Nada esperando você</Selo>
            ) : (
              <Selo tom="nexo" ponto>
                Tem achado esperando você
              </Selo>
            )}
          </motion.div>
        </AnimatePresence>

        <h1>Boa noite, {USUARIO.nome}.</h1>
        <p>Fale com o Nexo, ou solte um PDF em qualquer lugar da tela.</p>
        <div className="pn-acoes">
          <Botao variante="primary">
            <MessageCircle />
            Falar com o Nexo
          </Botao>
          <Botao variante="ghost">
            <Plus />
            Novo projeto
          </Botao>
        </div>
      </section>

      <div className="pn-corpo">
        {/* ---------- onde você parou ---------- */}
        {!vazio && (
          <div className="pn-retomar">
            <span className="pn-rotulo">Onde você parou</span>
            <div className="pn-retomar-o-que">
              <b>Memorial geral 117-25</b>
              <small>UBS da Rua São Francisco de Assis, há 4 h</small>
            </div>
            <Botao variante="ghost" tamanho="sm">
              Continuar
              <ChevronRight />
            </Botao>
          </div>
        )}

        {/* ---------- precisa da sua atenção ---------- */}
        {!vazio && !nadaPendente && lista !== "carregando" && (
          <div className="pn-atencao">
            <span className="pn-rotulo">Precisa da sua atenção</span>
            <button type="button" className="pn-chip">
              <b>
                <NumeroQueChega valor={11} />
              </b>
              meus achados
            </button>
            <button type="button" className="pn-chip">
              <b style={{ color: "var(--ds-sev-decide)" }}>
                <NumeroQueChega valor={4} />
              </b>
              projetos parados
            </button>
            <button type="button" className="pn-chip">
              <b>
                <NumeroQueChega valor={12} />
              </b>
              da equipe
            </button>
          </div>
        )}

        {/* ---------- projetos ---------- */}
        <div className="pn-cabeca-lista">
          <h2>Seus projetos abertos</h2>
          {!vazio && lista === "ok" && (
            <div className="pn-controles">
              <Segmento
                rotulo="Escopo da lista"
                valor={escopo}
                onTroca={setEscopo}
                opcoes={[
                  { valor: "meus", rotulo: "Meus projetos" },
                  { valor: "todos", rotulo: "Todos" },
                ]}
              />
              <Seletor opcoes={ORDENS} valor={ordem} onTroca={setOrdem} />
            </div>
          )}
        </div>

        <div className="pn-lista">
          <AnimatePresence mode="wait" initial={false}>
            {vazio ? (
              <motion.div key="vazio" className="pn-vazio" {...entra(dur)}>
                <span className="pn-vazio-icone">
                  <FileUp size={20} />
                </span>
                <b>Nenhum projeto seu por aqui ainda.</b>
                <p>Solte o primeiro memorial ou as pranchas de uma obra em qualquer lugar desta tela. O Nexo lê a capa e cria o projeto.</p>
                <div className="pn-acoes">
                  <Botao variante="primary" tamanho="sm">
                    <FileUp />
                    Escolher PDFs
                  </Botao>
                  <Botao variante="ghost" tamanho="sm">
                    Criar projeto à mão
                  </Botao>
                </div>
              </motion.div>
            ) : lista === "carregando" ? (
              <motion.div key="carregando" {...entra(dur)} aria-busy="true" aria-label="Carregando projetos">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="pn-linha pn-linha--esqueleto">
                    <Esqueleto largura={12} altura={12} raio={4} />
                    <Esqueleto largura={27} altura={4} />
                    <Esqueleto largura={[320, 260, 380, 240, 300][i]} altura={13} />
                    <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <Esqueleto largura={64} altura={22} raio={999} />
                      <Esqueleto largura={52} altura={22} raio={999} />
                    </span>
                  </div>
                ))}
              </motion.div>
            ) : lista === "erro" ? (
              <motion.div key="erro" className="pn-erro" {...entra(dur)} role="alert">
                <b>Não deu para carregar seus projetos.</b>
                <span>O servidor não respondeu. O resto do painel continua funcionando.</span>
                <Botao variante="ghost" tamanho="sm" onClick={tentarDeNovo}>
                  <RotateCcw />
                  Tentar de novo
                </Botao>
              </motion.div>
            ) : (
              <motion.ul key="ok" className="pn-linhas" {...entra(dur)}>
                <LayoutGroup>
                  {projetos.map((p) => (
                    <LinhaDeProjeto
                      key={p.id}
                      p={p}
                      aberta={aberta === p.id}
                      onAlternar={() => setAberta((a) => (a === p.id ? null : p.id))}
                    />
                  ))}
                </LayoutGroup>
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        {!vazio && lista === "ok" && (
          <div className="pn-rodape-lista">
            <a>Ver todos os projetos do escritório</a>
            <span className="ds-num">
              Mostrando {projetos.length} de 18
            </span>
          </div>
        )}

        {/* ---------- seu espaço ---------- */}
        <div className="pn-cabeca-lista" style={{ marginTop: 44 }}>
          <h2>Seu espaço</h2>
          <Botao variante="quiet" tamanho="sm" onClick={() => setPersonalizar(true)}>
            <SlidersHorizontal />
            Personalizar
          </Botao>
        </div>
        <div className="pn-widgets">
          <WidgetFoco rodando={situacao === "foco-rodando"} />
          <WidgetRascunho />
          <WidgetLista titulo="Atividade do escritório" carregando={lista === "carregando"} vazio={vazio} textoVazio="Ninguém mexeu em nada por aqui ainda.">
            {ATIVIDADE.map((a) => (
              <li key={a.quem + a.obra + a.quando}>
                <b>{a.quem}</b>
                <span>{a.oque}</span>
                <span className="ds-code">{a.obra}</span>
                <time>{a.quando}</time>
              </li>
            ))}
          </WidgetLista>
          <WidgetLista titulo="Gerados recentemente" carregando={lista === "carregando"} vazio={vazio} textoVazio="Capas, LDs e volumes que você gerar aparecem aqui.">
            {GERADOS.map((g) => (
              <li key={g.nome}>
                <Selo>{g.tipo}</Selo>
                <span className="pn-ell">{g.nome}</span>
                <time>{g.quando}</time>
              </li>
            ))}
          </WidgetLista>
        </div>
      </div>

      <GavetaPersonalizar aberta={personalizar} onFechar={() => setPersonalizar(false)} />

      {/* ---------- soltar PDF ---------- */}
      <AnimatePresence>
        {arrastando && (
          <motion.div
            className="pn-soltar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur("state") }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setArrastando(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
            }}
            onClick={() => setArrastando(false)}
          >
            <motion.div
              className="pn-soltar-caixa"
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              transition={mola("gentle")}
            >
              <Orbe tamanho={72} estado="trabalhando" />
              <b>Solte o PDF para iniciar a auditoria</b>
              <span>Memorial vira auditoria. Pranchas viram LD, capa e volume.</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function entra(dur: (n: "enter" | "feedback") => number) {
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, transition: { duration: dur("feedback") } },
    transition: { duration: dur("enter"), ease: ease(CURVA.out) },
  };
}

function LinhaDeProjeto({ p, aberta, onAlternar }: { p: ProjetoDeExemplo; aberta: boolean; onAlternar: () => void }) {
  const { dur, mola } = useTempo();
  const podeAbrir = Boolean(p.achadoAberto) && p.estado === "pendente";
  return (
    <motion.li layout="position" transition={mola("smooth")} className={`pn-linha${aberta ? " pn-linha--aberta" : ""}`}>
      <button type="button" className="pn-linha-cabeca" onClick={onAlternar} aria-expanded={aberta} disabled={!podeAbrir}>
        <motion.span
          className="pn-seta"
          animate={{ rotate: aberta ? 90 : 0 }}
          transition={{ duration: dur("state"), ease: ease(CURVA.out) }}
          style={{ opacity: podeAbrir ? 1 : 0.25 }}
        >
          <ChevronRight size={14} />
        </motion.span>
        <MarcaDaPrefeitura prefeitura={p.cidade} forma="sinal" />
        <span className="pn-nome">{p.nome}</span>
        <span className="ds-code">{p.codigo}</span>
        <span className="pn-cidade">{p.cidade}</span>
        <span className="pn-direita">
          {p.estado === "auditando" ? (
            <span className="pn-auditando">
              <Selo tom="nexo" ponto>
                Auditando
              </Selo>
              <span className="pn-mini">
                <motion.i
                  initial={{ width: "12%" }}
                  animate={{ width: "64%" }}
                  transition={{ duration: 6 * (dur("layout") / 0.32), ease: "linear" }}
                />
              </span>
            </span>
          ) : p.estado === "sem-pendencia" ? (
            <Selo tom="line">Sem pendência</Selo>
          ) : p.estado === "volume-montado" ? (
            <Selo tom="ok">Volume montado</Selo>
          ) : (
            <>
              <Selo>
                {p.achados} {p.achados === 1 ? "achado" : "achados"}
              </Selo>
              {p.pessoas?.map((i) => <Avatar key={i} iniciais={i} pequeno />)}
              {p.diasParado >= 30 && <Selo tom="decide">{p.diasParado} dias</Selo>}
            </>
          )}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {aberta && p.achadoAberto && (
          <motion.div
            className="pn-linha-corpo"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: dur("layout"), ease: ease(CURVA.out) }}
          >
            <div className="pn-linha-achado">
              <i className={`pn-grav pn-grav--${p.achadoAberto.gravidade}`} />
              <span>{p.achadoAberto.titulo}</span>
              <small>
                de {p.achadoAberto.de}, parado há {p.diasParado} dias
              </small>
              <span className="pn-linha-acoes">
                <Botao variante="ghost" tamanho="sm">
                  <ShieldCheck />
                  Nova auditoria
                </Botao>
                <Botao variante="quiet" tamanho="sm">
                  Abrir projeto
                </Botao>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function WidgetFoco({ rodando: rodandoInicial }: { rodando: boolean }) {
  const { dur, k } = useTempo();
  const [minutos, setMinutos] = useState<"25" | "45" | "60">("45");
  const total = Number(minutos) * 60;
  const [resta, setResta] = useState(rodandoInicial ? total - 754 : total);
  const [rodando, setRodando] = useState(rodandoInicial);

  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => setResta((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [rodando]);
  useEffect(() => {
    if (resta === 0) setRodando(false);
  }, [resta]);

  const frac = 1 - resta / total;
  const r = 42;
  const c = 2 * Math.PI * r;
  const mm = String(Math.floor(resta / 60)).padStart(2, "0");
  const ss = String(resta % 60).padStart(2, "0");

  return (
    <div className="pn-widget">
      <div className="pn-widget-cabeca">
        <h3>Foco</h3>
        <Segmento
          rotulo="Duração do foco"
          valor={minutos}
          onTroca={(v) => {
            setMinutos(v);
            setResta(Number(v) * 60);
            setRodando(false);
          }}
          opcoes={[
            { valor: "25", rotulo: "25" },
            { valor: "45", rotulo: "45" },
            { valor: "60", rotulo: "60" },
          ]}
        />
      </div>
      <div className="pn-foco">
        <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden>
          <circle cx="52" cy="52" r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="4" />
          <motion.circle
            cx="52"
            cy="52"
            r={r}
            fill="none"
            stroke="var(--ds-nexo)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={c}
            animate={{ strokeDashoffset: c * (1 - frac) }}
            transition={{ duration: dur("layout") * (k > 1 ? 1 : 1), ease: "linear" }}
            style={{ rotate: -90, transformOrigin: "52px 52px" }}
          />
        </svg>
        <span className="pn-foco-tempo ds-num" aria-live="off">
          {resta === 0 ? "00:00" : `${mm}:${ss}`}
        </span>
        <div className="pn-foco-ctl">
          {resta === 0 ? (
            <>
              <span className="pn-foco-fim">Tempo encerrado</span>
              <Botao variante="primary" tamanho="sm" onClick={() => { setResta(total); setRodando(true); }}>
                <RotateCcw />
                De novo
              </Botao>
            </>
          ) : (
            <>
              <Botao variante="primary" tamanho="sm" onClick={() => setRodando((x) => !x)} style={{ minWidth: 96 }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={rodando ? "p" : "i"}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: dur("feedback") }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                  >
                    {rodando ? <Pause /> : <Play />}
                    {rodando ? "Pausar" : "Iniciar"}
                  </motion.span>
                </AnimatePresence>
              </Botao>
              <Botao variante="quiet" tamanho="sm" onClick={() => { setResta(total); setRodando(false); }} disabled={resta === total}>
                <RotateCcw />
                Zerar
              </Botao>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function WidgetRascunho() {
  const { dur } = useTempo();
  const [texto, setTexto] = useState("Ligar para a prefeitura de Criciúma sobre o traço do contrapiso");
  const [confirmando, setConfirmando] = useState(false);
  return (
    <div className="pn-widget">
      <div className="pn-widget-cabeca">
        <h3>Rascunho</h3>
        <div style={{ position: "relative", height: 28 }}>
          <AnimatePresence mode="wait" initial={false}>
            {confirmando ? (
              <motion.span
                key="c"
                style={{ display: "inline-flex", gap: 4 }}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: dur("state") }}
              >
                <Botao variante="quiet" tamanho="sm" onClick={() => setConfirmando(false)}>
                  Manter
                </Botao>
                <Botao variante="ghost" tamanho="sm" onClick={() => { setTexto(""); setConfirmando(false); }} style={{ color: "var(--ds-state-error)" }}>
                  Apagar
                </Botao>
              </motion.span>
            ) : (
              <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur("feedback") }}>
                <Botao variante="quiet" tamanho="sm" onClick={() => setConfirmando(true)} disabled={!texto}>
                  Limpar
                </Botao>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
      <textarea
        className="pn-rascunho"
        aria-label="Rascunho"
        placeholder="O que não pode escapar hoje…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <span className="pn-nota">Fica só neste navegador.</span>
    </div>
  );
}

function WidgetLista({
  titulo,
  carregando,
  vazio,
  textoVazio,
  children,
}: {
  titulo: string;
  carregando: boolean;
  vazio: boolean;
  textoVazio: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pn-widget">
      <div className="pn-widget-cabeca">
        <h3>{titulo}</h3>
        {!vazio && !carregando && (
          <Botao variante="quiet" tamanho="sm">
            Ver todos
          </Botao>
        )}
      </div>
      {carregando ? (
        <div style={{ display: "grid", gap: 14, paddingTop: 6 }}>
          {[180, 220, 160, 200].map((w, i) => (
            <Esqueleto key={i} largura={w} altura={11} />
          ))}
        </div>
      ) : vazio ? (
        <p className="pn-nota" style={{ margin: "8px 0 0" }}>
          {textoVazio}
        </p>
      ) : (
        <ul className="pn-feed">{children}</ul>
      )}
    </div>
  );
}

function GavetaPersonalizar({ aberta, onFechar }: { aberta: boolean; onFechar: () => void }) {
  const { dur, mola } = useTempo();
  const [aba, setAba] = useState<"meus" | "todos">("meus");
  const [ordem, setOrdem] = useState<Ordem>("parados");
  const [visiveis, setVisiveis] = useState<"5" | "8" | "12">("8");
  const [atencao, setAtencao] = useState(true);
  const [widgets, setWidgets] = useState({ Foco: true, Rascunho: true, "Atividade do escritório": true, "Gerados recentemente": true, "Conversor de obra": false, Registro: false });
  const primeiro = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (aberta) primeiro.current?.focus();
    const esc = (e: KeyboardEvent) => aberta && e.key === "Escape" && onFechar();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberta, onFechar]);

  return (
    <AnimatePresence>
      {aberta && (
        <>
          <motion.div
            className="pn-veu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur("state") }}
            onClick={onFechar}
          />
          <motion.aside
            className="pn-gaveta"
            role="dialog"
            aria-label="Personalizar a Home"
            initial={{ x: "104%" }}
            animate={{ x: 0 }}
            exit={{ x: "104%", transition: { duration: dur("enter"), ease: ease(CURVA.exit) } }}
            transition={mola("gentle")}
          >
            <div className="pn-gaveta-cabeca">
              <h2>Personalizar a Home</h2>
              <Botao variante="quiet" icone tamanho="sm" aria-label="Fechar" onClick={onFechar}>
                <X />
              </Botao>
            </div>
            <div className="pn-gaveta-corpo">
              <section>
                <h3>Lista de projetos</h3>
                <label>
                  Aba padrão
                  <Segmento rotulo="Aba padrão" valor={aba} onTroca={setAba} opcoes={[{ valor: "meus", rotulo: "Meus" }, { valor: "todos", rotulo: "Todos" }]} />
                </label>
                <label>
                  Ordenação padrão
                  <Seletor opcoes={ORDENS} valor={ordem} onTroca={setOrdem} />
                </label>
                <label>
                  Projetos visíveis
                  <Segmento rotulo="Projetos visíveis" valor={visiveis} onTroca={setVisiveis} opcoes={[{ valor: "5", rotulo: "5" }, { valor: "8", rotulo: "8" }, { valor: "12", rotulo: "12" }]} />
                </label>
                <label>
                  Mostrar “Precisa da sua atenção”
                  <Interruptor ligado={atencao} onTroca={setAtencao} rotulo="Mostrar Precisa da sua atenção" />
                </label>
              </section>
              <section>
                <h3>Seu espaço</h3>
                {Object.entries(widgets).map(([nome, ligado], i) => (
                  <label key={nome}>
                    {nome}
                    <Interruptor
                      ref={i === 0 ? primeiro : undefined}
                      ligado={ligado}
                      onTroca={(v) => setWidgets((w) => ({ ...w, [nome]: v }))}
                      rotulo={nome}
                    />
                  </label>
                ))}
              </section>
            </div>
            <div className="pn-gaveta-rodape">
              <Botao variante="primary" onClick={onFechar}>
                Concluir
              </Botao>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Interruptor({
  ligado,
  onTroca,
  rotulo,
  ref,
}: {
  ligado: boolean;
  onTroca: (v: boolean) => void;
  rotulo: string;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  const { mola } = useTempo();
  return (
    <button ref={ref} type="button" role="switch" aria-checked={ligado} aria-label={rotulo} className="pn-chave" onClick={() => onTroca(!ligado)}>
      <motion.span animate={{ x: ligado ? 14 : 0 }} transition={mola("snappy")} />
    </button>
  );
}
