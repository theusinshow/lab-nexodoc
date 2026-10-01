"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronUp, Map as MapaIcone, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { Tecla } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";

import { EsqueletoDaTela } from "../lab/telas/_comum/esqueletos";
import { NoPrototipo, type IdTela } from "../lab/telas/_comum/prototipo";
import { ControleDoTopo } from "../lab/telas/_comum/topo";
import { TelaAchados } from "../lab/telas/achados/tela-achados";
import { SITUACOES as S_ACHADOS } from "../lab/telas/achados/vitrine";
import { TelaAdmin } from "../lab/telas/admin/tela-admin";
import { SITUACOES as S_ADMIN } from "../lab/telas/admin/vitrine";
import { TelaAjuda } from "../lab/telas/ajuda/tela-ajuda";
import { SITUACOES as S_AJUDA } from "../lab/telas/ajuda/vitrine";
import { TelaAuditoria } from "../lab/telas/auditoria/tela-auditoria";
import { SITUACOES as S_AUDITORIA } from "../lab/telas/auditoria/vitrine";
import { TelaConversa } from "../lab/telas/conversa/tela-conversa";
import { SITUACOES as S_CONVERSA } from "../lab/telas/conversa/vitrine";
import { SITUACOES as S_DOCUMENTO } from "../lab/telas/documento/vitrine";
import { TelaEntrada } from "../lab/telas/entrada/tela-entrada";
import { SITUACOES as S_ENTRADA } from "../lab/telas/entrada/vitrine";
import { TelaInicioD2 } from "../lab/telas/inicio-d2/tela-inicio-d2";
import { SITUACOES as S_INICIO } from "../lab/telas/inicio-d2/vitrine";
import { TelaMapa } from "../lab/telas/mapa/tela-mapa";
import { SITUACOES as S_MAPA } from "../lab/telas/mapa/vitrine";
import { TelaNexo } from "../lab/telas/nexo/tela-nexo";
import { TelaNexoAuditoria } from "../lab/telas/nexo-auditoria/tela-nexo-auditoria";
import { SITUACOES as S_NEXO_AUD } from "../lab/telas/nexo-auditoria/vitrine";
import { SITUACOES as S_NEXO } from "../lab/telas/nexo/vitrine";
import { SITUACOES as S_PARECER } from "../lab/telas/parecer/vitrine";
import { AVISOS, type ModeloDeAviso } from "../lab/telas/pecas/dados";
import { Atalhos, Avisos, juntarAviso, Paleta, type Aviso } from "../lab/telas/pecas/sobreposicoes";
import { TelaPecas } from "../lab/telas/pecas/tela-pecas";
import "../lab/telas/pecas/pecas.css";
import "../lab/telas/admin/pessoas-banco.css";
import { TelaProjeto } from "../lab/telas/projeto/tela-projeto";
import { SITUACOES as S_PROJETO } from "../lab/telas/projeto/vitrine";
import { TelaProjetos } from "../lab/telas/projetos/tela-projetos";
import { SITUACOES as S_PROJETOS } from "../lab/telas/projetos/vitrine";
import { TelaResultado } from "../lab/telas/resultado-e/tela-resultado";
import { SITUACOES as S_RESULTADO } from "../lab/telas/resultado-e/vitrine";

import "./prototipo.css";

type Situacao = { id: string; nome: string; dica: string };
type Tela = { nome: string; grupo: string; situacoes: Situacao[]; render: (s: string) => ReactNode; proprias?: boolean };

// Os componentes recebem a situação tipada; aqui ela já veio de uma das listas.
const TELAS: Record<IdTela, Tela> = {
  entrada: { nome: "Entrada", grupo: "Entrar", situacoes: S_ENTRADA, render: (s) => <TelaEntrada situacao={s as any} /> },
  inicio: { nome: "Painel", grupo: "Trabalhar", situacoes: S_INICIO, render: (s) => <TelaInicioD2 situacao={s as any} /> },
  "nexo-auditoria": { nome: "Nexo: a auditoria", grupo: "Trabalhar", situacoes: S_NEXO_AUD, render: (s) => <TelaNexoAuditoria situacao={s as any} /> },
  conversa: { nome: "Conversa com o Nexo", grupo: "Trabalhar", situacoes: S_CONVERSA, render: (s) => <TelaConversa situacao={s as any} /> },
  nexo: { nome: "Nexo: montar o volume", grupo: "Trabalhar", situacoes: S_NEXO, render: (s) => <TelaNexo situacao={s as any} /> },
  mapa: { nome: "Mapa do volume", grupo: "Trabalhar", situacoes: S_MAPA, render: (s) => <TelaMapa situacao={s as any} /> },
  auditoria: { nome: "Auditoria rodando", grupo: "Auditar", situacoes: S_AUDITORIA, render: (s) => <TelaAuditoria situacao={s as any} /> },
  resultado: {
    nome: "Resultado da auditoria",
    grupo: "Auditar",
    situacoes: [...S_RESULTADO, ...S_PARECER, ...S_DOCUMENTO],
    render: (s) => <TelaResultado situacao={s as any} />,
  },
  achados: { nome: "Achados", grupo: "Auditar", situacoes: S_ACHADOS, render: (s) => <TelaAchados situacao={s as any} /> },
  projetos: { nome: "Projetos", grupo: "Obras", situacoes: S_PROJETOS, render: (s) => <TelaProjetos situacao={s as any} /> },
  projeto: { nome: "Projeto (uma obra)", grupo: "Obras", situacoes: S_PROJETO, render: (s) => <TelaProjeto situacao={s as any} /> },
  admin: { nome: "Administração", grupo: "Sistema", situacoes: S_ADMIN, render: (s) => <TelaAdmin situacao={s as any} /> },
  ajuda: { nome: "Ajuda", grupo: "Sistema", situacoes: S_AJUDA, render: (s) => <TelaAjuda situacao={s as any} /> },
  confirmacoes: { nome: "Confirmações", grupo: "Páginas especiais", proprias: true, situacoes: [{ id: "confirmacao", nome: "Os três pesos", dica: "" }], render: () => <TelaPecas situacao="confirmacao" /> },
  "pagina-404": { nome: "Página que não existe", grupo: "Páginas especiais", proprias: true, situacoes: [{ id: "404", nome: "404", dica: "" }], render: () => <TelaPecas situacao="404" /> },
  "pagina-erro": { nome: "Página que não carregou", grupo: "Páginas especiais", proprias: true, situacoes: [{ id: "erro", nome: "Erro", dica: "" }], render: () => <TelaPecas situacao="erro" /> },
};

const GRUPOS = ["Entrar", "Trabalhar", "Auditar", "Obras", "Sistema", "Páginas especiais"];

/** A rede de mentira: quanto o "servidor" demora para trazer a tela nova. */
type Rede = "instantanea" | "normal" | "lenta" | "travada";
const REDES: { id: Rede; nome: string; ms: number }[] = [
  { id: "instantanea", nome: "Instantânea", ms: 0 },
  { id: "normal", nome: "Normal, 0,45 s", ms: 450 },
  { id: "lenta", nome: "Lenta, 1,8 s", ms: 1800 },
  { id: "travada", nome: "Travada", ms: Infinity },
];

/* ---------- a rota mora no hash: #/tela/situacao (o Voltar do navegador funciona) ---------- */
function assinarHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
function lerRota(hash: string): { tela: IdTela; situacao: string } {
  const [, t, s] = hash.replace(/^#/, "").split("/");
  const tela = (t && t in TELAS ? t : "entrada") as IdTela;
  const lista = TELAS[tela].situacoes;
  const situacao = s && lista.some((x) => x.id === s) ? s : lista[0].id;
  return { tela, situacao };
}

function digitando(alvo: EventTarget | null) {
  return !!(alvo as HTMLElement | null)?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']");
}

export function Prototipo() {
  const hash = useSyncExternalStore(assinarHash, () => window.location.hash, () => "");
  const { tela, situacao } = lerRota(hash);
  const def = TELAS[tela];
  const [volta, setVolta] = useState(0);
  const [painel, setPainel] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const [atalhos, setAtalhos] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [rede, setRede] = useState<Rede>("normal");
  const [carregando, setCarregando] = useState(false);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const telaAtual = useRef<IdTela>(tela);
  const msDaRede = useRef(450);
  useEffect(() => {
    telaAtual.current = tela;
  }, [tela]);

  /*
   * Ir para outra tela passa pelo "servidor": a tela nova aparece primeiro como
   * esqueleto, pelo tempo da rede escolhida. Trocar de situação na mesma tela,
   * entrar e as páginas especiais não carregam nada.
   */
  const ir = useCallback(
    (t: IdTela, s?: string) => {
      const destino = `#/${t}/${s ?? TELAS[t].situacoes[0].id}`;
      setPaleta(false);
      setAtalhos(false);
      setVolta((v) => v + 1); // mesma rota de novo também remonta: "começa de novo"
      if (relogio.current) clearTimeout(relogio.current);
      const carrega = t !== telaAtual.current && t !== "entrada" && !TELAS[t].proprias && msDaRede.current > 0;
      setCarregando(carrega);
      if (carrega && Number.isFinite(msDaRede.current)) relogio.current = setTimeout(() => setCarregando(false), msDaRede.current);
      if (window.location.hash !== destino) window.location.hash = destino;
      window.scrollTo(0, 0);
    },
    [setPaleta, setAtalhos, setVolta, setCarregando],
  );
  const trocarRede = (r: Rede) => {
    setRede(r);
    msDaRede.current = REDES.find((x) => x.id === r)!.ms;
    if (r !== "travada") setCarregando(false);
  };

  const avisar = useCallback((m: ModeloDeAviso) => setAvisos((a) => juntarAviso(a, { ...m, link: m.link ? `${location.origin}/nexo?auditoria=cm1x8a&achado=INC-014` : undefined })), []);
  const fecharAviso = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);

  // Ctrl K e ? valem em todo lugar do app (menos na Entrada, que é antes do app, e no
  // Início, onde a própria tela é a busca). As páginas especiais trazem as delas.
  const globais = !def.proprias && tela !== "entrada";
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPainel((p) => !p);
        return;
      }
      if (!globais) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && tela !== "inicio") {
        e.preventDefault();
        setAtalhos(false);
        setPaleta((p) => !p);
      } else if (e.key === "?" && !digitando(e.target)) {
        e.preventDefault();
        setPaleta(false);
        setAtalhos((a) => !a);
      }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [globais, tela]);

  const controle = useMemo(
    () => ({
      onBusca: () => (setAtalhos(false), setPaleta(true)),
      onAtalhos: () => (setPaleta(false), setAtalhos(true)),
    }),
    [setPaleta, setAtalhos],
  );
  const noPrototipo = useMemo(() => ({ ir }), [ir]);

  return (
    <NoPrototipo.Provider value={noPrototipo}>
      <ControleDoTopo.Provider value={controle}>
        <div className="pt">
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={`${tela}/${situacao}/${volta}/${carregando ? "e" : "t"}`}
              className="pt-tela"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: [...CURVA.out] as [number, number, number, number] }}
            >
              {carregando ? <EsqueletoDaTela tela={tela} /> : def.render(situacao)}
            </motion.main>
          </AnimatePresence>

          {globais && (
            <>
              <Paleta aberta={paleta} onFechar={() => setPaleta(false)} />
              <Atalhos aberta={atalhos} onFechar={() => setAtalhos(false)} />
            </>
          )}
          <Avisos avisos={avisos} onFechar={fecharAviso} onAcao={(a) => (fecharAviso(a.id), a.acao === "Tentar de novo" && avisar(AVISOS.atribuidos))} />

          <PainelDoPrototipo
            aberto={painel}
            onAbrir={setPainel}
            tela={tela}
            situacao={situacao}
            onIr={(t, s) => (ir(t, s), setPainel(false))}
            onSituacao={(s) => ir(tela, s)}
            onAvisar={avisar}
            rede={rede}
            onRede={trocarRede}
          />
        </div>
      </ControleDoTopo.Provider>
    </NoPrototipo.Provider>
  );
}

/**
 * O PAINEL DO PROTÓTIPO: fora do app, num canto. Fechado, diz onde se está;
 * aberto (Alt P), leva a qualquer tela, troca a situação da tela atual e
 * dispara os avisos passageiros. É o que o lab chamava de vitrine.
 */
function PainelDoPrototipo({
  aberto,
  onAbrir,
  tela,
  situacao,
  onIr,
  onSituacao,
  onAvisar,
  rede,
  onRede,
}: {
  aberto: boolean;
  onAbrir: (v: boolean) => void;
  tela: IdTela;
  situacao: string;
  onIr: (t: IdTela, s?: string) => void;
  onSituacao: (s: string) => void;
  onAvisar: (m: ModeloDeAviso) => void;
  rede: Rede;
  onRede: (r: Rede) => void;
}) {
  const def = TELAS[tela];
  const sit = def.situacoes.find((s) => s.id === situacao);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (e.preventDefault(), onAbrir(false));
    document.addEventListener("keydown", esc, true);
    return () => document.removeEventListener("keydown", esc, true);
  }, [aberto, onAbrir]);

  return (
    <div className="pt-painel-raiz">
      <AnimatePresence>
        {aberto && (
          <motion.aside
            className="pt-painel"
            aria-label="Protótipo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: [...CURVA.out] as [number, number, number, number] }}
          >
            <header className="pt-painel-cabeca">
              <b>Protótipo</b>
              <span>Nada aqui fala com o servidor.</span>
              <button type="button" className="pt-x" aria-label="Fechar (Esc)" onClick={() => onAbrir(false)}>
                <X size={15} />
              </button>
            </header>

            <section className="pt-sec">
              <h2>
                {def.nome} <span>· situação</span>
              </h2>
              <div className="pt-chips" role="radiogroup" aria-label="Situação desta tela">
                {def.situacoes.map((s, i) => (
                  <button key={s.id} type="button" role="radio" aria-checked={s.id === situacao} onClick={() => onSituacao(s.id)} title={s.dica}>
                    <span className="ds-num">{i + 1}</span>
                    {s.nome}
                  </button>
                ))}
              </div>
              {sit?.dica && <p className="pt-dica">{sit.dica}</p>}
            </section>

            <section className="pt-sec">
              <h2>Ir para</h2>
              <div className="pt-telas">
                {GRUPOS.map((g) => (
                  <div key={g}>
                    <h3>{g}</h3>
                    {(Object.keys(TELAS) as IdTela[])
                      .filter((t) => TELAS[t].grupo === g)
                      .map((t) => (
                        <button key={t} type="button" aria-current={t === tela ? "page" : undefined} onClick={() => onIr(t)}>
                          {TELAS[t].nome}
                          <span className="ds-num">{TELAS[t].situacoes.length}</span>
                        </button>
                      ))}
                  </div>
                ))}
              </div>
            </section>

            <section className="pt-sec">
              <h2>
                Rede <span>· quanto o servidor demora ao trocar de tela</span>
              </h2>
              <div className="pt-chips" role="radiogroup" aria-label="Rede">
                {REDES.map((r) => (
                  <button key={r.id} type="button" role="radio" aria-checked={rede === r.id} onClick={() => onRede(r.id)}>
                    {r.nome}
                  </button>
                ))}
              </div>
              {rede === "travada" && <p className="pt-dica">A próxima tela fica no esqueleto até você escolher outra rede.</p>}
            </section>

            <section className="pt-sec">
              <h2>Disparar um aviso passageiro</h2>
              <div className="pt-chips">
                {(
                  [
                    ["atribuídos", AVISOS.atribuidos],
                    ["copiado", AVISOS.copiado],
                    ["parcial", AVISOS.parcial],
                    ["não copiou", AVISOS.naoCopiou],
                    ["sem conexão", AVISOS.rede],
                  ] as const
                ).map(([r, m]) => (
                  <button key={r} type="button" data-falha={m.tom === "falha" || undefined} onClick={() => onAvisar(m)}>
                    {r}
                  </button>
                ))}
              </div>
            </section>

            <footer className="pt-painel-pe">
              <span>
                <Tecla>Alt</Tecla> <Tecla>P</Tecla> abre e fecha
              </span>
              <span>
                <Tecla>Ctrl K</Tecla> busca · <Tecla>?</Tecla> atalhos
              </span>
            </footer>
          </motion.aside>
        )}
      </AnimatePresence>

      <button type="button" className="pt-pilula" aria-expanded={aberto} onClick={() => onAbrir(!aberto)}>
        <MapaIcone size={14} />
        <span className="pt-pilula-tela">{def.nome}</span>
        <span className="pt-pilula-sit">{sit?.nome}</span>
        <ChevronUp size={14} className="pt-pilula-seta" />
      </button>
    </div>
  );
}
