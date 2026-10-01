"use client";

import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { Check, CircleAlert, Info, LoaderCircle, LogOut, Mail, Terminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Botao, Orbe, Tecla } from "@/components/ds/basicos";

import { SUAVE } from "../conversa/turnos";
import { useIr, useNoPrototipo } from "../_comum/prototipo";
import "./entrada.css";

/*
 * A ENTRADA: login e sem acesso. À esquerda o login de sempre; à direita o
 * filme do Nexo (o memorial auditado, e o volume). Os textos são os do app.
 */

export type SituacaoEntrada =
  | "padrao"
  | "indo"
  | "erro"
  | "dev"
  | "contato"
  | "recado-enviado"
  | "recado-nao-saiu"
  | "sem-acesso"
  | "sem-responsavel";

const VERSAO = "b18a14d";
const LIMITE = 2000;
const ADMINS = ["matheus@prosul.com.br", "fernanda@prosul.com.br"];

/** O "G" do Google fica colorido: é a única cor de fora em toda a tela (marca de terceiro, sinal de confiança). */
function MarcaDoGoogle() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.63-.06-1.23-.16-1.8H9v3.4h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.58Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.87-3.04.87-2.35 0-4.34-1.58-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.6.1-1.17.28-1.7V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l2.99-2.33Z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.34L15.02 2.34A8.64 8.64 0 0 0 9 0 9 9 0 0 0 .96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

/** O recado tem TRÊS desfechos e a tela nunca diz que mandou quando não mandou. */
type Recado = "enviado" | "gravado" | "nao-configurado" | "falhou";
const RECADO: Record<Recado, { tom: "ok" | "atencao" | "erro"; texto: string }> = {
  enviado: { tom: "ok", texto: "Recado enviado. O responsável responde no e-mail que você informou." },
  gravado: { tom: "atencao", texto: "Modo de desenvolvimento: o recado foi gravado no disco e nenhum e-mail saiu." },
  "nao-configurado": { tom: "atencao", texto: "O envio de e-mail não está configurado neste ambiente. Nada foi enviado: procure o responsável por outro canal." },
  falhou: { tom: "erro", texto: "O envio falhou e nada saiu. Tente de novo em instantes." },
};

function Aviso({ tom, children }: { tom: "ok" | "atencao" | "erro" | "info"; children: React.ReactNode }) {
  const Icone = tom === "ok" ? Check : tom === "info" ? Info : CircleAlert;
  return (
    <p className={`en-aviso en-aviso--${tom}`} role={tom === "erro" ? "alert" : "status"}>
      <Icone size={14} strokeWidth={2} aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Falar com o responsável: abre NO LUGAR, embaixo do que deu errado (não é modal). */
function Contato({ aberto, onAbrir, desfecho }: { aberto: boolean; onAbrir: (a: boolean) => void; desfecho?: Recado }) {
  const [texto, setTexto] = useState(desfecho ? "Sou do escritório e a tela disse que a conta não está liberada." : "");
  const [email, setEmail] = useState(desfecho ? "victor@prosul.com.br" : "");
  const [enviando, setEnviando] = useState(false);
  const [resposta, setResposta] = useState<Recado | undefined>(desfecho);
  const primeiro = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aberto && !desfecho) primeiro.current?.focus();
  }, [aberto, desfecho]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setResposta(undefined);
    setTimeout(() => {
      setEnviando(false);
      setResposta("gravado");
    }, 900);
  };

  return (
    <div className="en-contato">
      <AnimatePresence initial={false} mode="popLayout">
        {!aberto ? (
          <motion.div key="fechado" exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            <Botao variante="quiet" tamanho="sm" onClick={() => onAbrir(true)}>
              <Mail size={14} strokeWidth={1.75} aria-hidden />
              Falar com o responsável
            </Botao>
          </motion.div>
        ) : (
          <motion.form
            key="aberto"
            className="en-form"
            onSubmit={enviar}
            onKeyDown={(e) => e.key === "Escape" && (e.preventDefault(), onAbrir(false))}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: SUAVE }}
          >
            <p className="en-form-titulo">Falar com o responsável</p>
            <label className="en-campo">
              <span>Seu e-mail</span>
              <input ref={primeiro} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="para o responsável poder responder" />
            </label>
            <label className="en-campo">
              <span>
                O que aconteceu
                <em className="ds-num">
                  {texto.length}/{LIMITE}
                </em>
              </span>
              <textarea rows={3} required maxLength={LIMITE} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="quem é você, de que escritório, e o que a tela disse" />
            </label>
            {resposta && <Aviso tom={RECADO[resposta].tom}>{RECADO[resposta].texto}</Aviso>}
            <div className="en-form-acoes">
              <Botao variante="ghost" tamanho="sm" type="submit" disabled={enviando}>
                {enviando && <LoaderCircle size={14} className="en-gira" aria-hidden />}
                {enviando ? "Enviando" : "Enviar recado"}
              </Botao>
              <Botao variante="quiet" tamanho="sm" onClick={() => onAbrir(false)}>
                Cancelar <Tecla>Esc</Tecla>
              </Botao>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Login({ situacao, indo, onIr }: { situacao: SituacaoEntrada; indo: boolean; onIr: () => void }) {
  const ir = useIr();
  const [contato, setContato] = useState(situacao === "contato" || situacao.startsWith("recado"));
  const desfecho: Recado | undefined = situacao === "recado-enviado" ? "enviado" : situacao === "recado-nao-saiu" ? "nao-configurado" : undefined;

  return (
    <>
      <h1 className="en-titulo">Entre no Nexo</h1>
      <p className="en-lede">Documentação de projetos de engenharia, do carimbo ao volume.</p>

      {situacao === "erro" && <Aviso tom="erro">Não foi possível autenticar com o Google. Tente de novo; se repetir, fale com o responsável.</Aviso>}

      <button type="button" className="en-google" disabled={indo} onClick={onIr} aria-describedby="en-nota">
        {indo ? <LoaderCircle size={16} className="en-gira" aria-hidden /> : <MarcaDoGoogle />}
        {indo ? "Indo para o Google" : "Entrar com Google"}
      </button>
      <p id="en-nota" className="en-nota">
        Use a conta Google do escritório. Depois dela, o Nexo confere se a conta está liberada; se não estiver, diz quem libera.
      </p>

      {situacao === "dev" && (
        <form className="en-dev" onSubmit={(e) => (e.preventDefault(), ir("inicio"))}>
          <p className="en-dev-rotulo">
            <Terminal size={13} strokeWidth={1.75} aria-hidden />
            Acesso de desenvolvimento
          </p>
          <div className="en-dev-linha">
            <input type="email" autoComplete="off" placeholder="em branco: dev@prosul.local" aria-label="Entrar como" />
            <Botao variante="ghost" tamanho="sm" type="submit">
              Entrar como dev
            </Botao>
          </div>
        </form>
      )}

      <div className="en-rodape">
        <Contato aberto={contato} onAbrir={setContato} desfecho={desfecho} />
      </div>
    </>
  );
}

function SemAcesso({ comResponsavel }: { comResponsavel: boolean }) {
  const ir = useIr();
  const assunto = encodeURIComponent("Liberação de acesso ao Nexo");
  return (
    <>
      <h1 className="en-titulo">Sua conta está certa, falta a liberação</h1>
      <p className="en-lede">
        Você entrou como <span className="en-mono en-email">victor@prosul.com.br</span>. A conta é válida; ela só ainda não foi habilitada para o Nexo.
      </p>

      {comResponsavel ? (
        <div className="en-quem">
          <p className="en-quem-titulo">Quem libera no escritório</p>
          <ul>
            {ADMINS.map((a) => (
              <li key={a}>
                <span className="en-mono">{a}</span>
                <a className="ds-btn ds-btn--ghost ds-btn--sm" href={`mailto:${a}?subject=${assunto}`} onClick={(e) => e.preventDefault()}>
                  <Mail size={14} strokeWidth={1.75} aria-hidden />
                  Pedir liberação
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Aviso tom="info">Este ambiente não diz quem administra o Nexo. Peça a liberação a quem cuida dos acessos no escritório.</Aviso>
      )}

      <div className="en-rodape en-rodape--linha">
        <p>Depois de liberada, é a mesma conta: entre de novo por aqui.</p>
        <Botao variante="quiet" tamanho="sm" onClick={() => ir("entrada", "padrao")}>
          <LogOut size={14} strokeWidth={1.75} aria-hidden />
          Entrar com outra conta
        </Botao>
      </div>
    </>
  );
}

/**
 * O FILME DA ENTRADA: 15 s em loop, feito em HyperFrames (videos/nexo-entrada).
 * É decorativo e mudo; o login nunca espera por ele. O primeiro quadro é o
 * pôster, então o vídeo entra sem salto quando termina de carregar. Com
 * movimento reduzido fica um quadro parado (o mapa já montado e conferido),
 * e em tela estreita o painel some e nada é baixado.
 */
function Filme() {
  const reduzir = !!useReducedMotionConfig();
  const [largo, setLargo] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(min-width: 900px)");
    const ver = () => setLargo(mq.matches);
    ver();
    mq.addEventListener("change", ver);
    return () => mq.removeEventListener("change", ver);
  }, []);
  if (!largo) return null;
  if (reduzir) return <img className="en-filme-midia" src="/lab/entrada/nexo-entrada-poster.webp" alt="" />;
  return (
    <video className="en-filme-midia" autoPlay muted loop playsInline preload="auto" poster="/lab/entrada/nexo-entrada-inicio.webp" aria-hidden>
      <source src="/lab/entrada/nexo-entrada.webm" type="video/webm" />
      <source src="/lab/entrada/nexo-entrada.mp4" type="video/mp4" />
    </video>
  );
}

export function TelaEntrada({ situacao }: { situacao: SituacaoEntrada }) {
  const semAcesso = situacao === "sem-acesso" || situacao === "sem-responsavel";
  const [indo, setIndo] = useState(situacao === "indo");
  const ir = useIr();
  const proto = useNoPrototipo();
  // No protótipo, o Google "responde" e a conta cai no Início.
  useEffect(() => {
    if (!proto || !indo) return;
    const id = setTimeout(() => ir("inicio"), 1400);
    return () => clearTimeout(id);
  }, [proto, indo, ir]);
  return (
    <div className="en">
      <section className="en-porta">
        <header className="en-marca">
          <Orbe tamanho={18} />
          <span>Nexo</span>
        </header>
        <main className="en-conteudo">{semAcesso ? <SemAcesso comResponsavel={situacao === "sem-acesso"} /> : <Login situacao={situacao} indo={indo} onIr={() => setIndo(true)} />}</main>
        <footer className="en-pe">
          <span>PROSUL</span>
          <span className="en-mono">versão {VERSAO}</span>
        </footer>
      </section>
      <section className="en-filme" aria-hidden>
        <Filme />
      </section>
    </div>
  );
}
