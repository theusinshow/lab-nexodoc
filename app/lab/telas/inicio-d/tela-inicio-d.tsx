"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowUp, BookOpen, Check, ChevronRight, FileSearch, FileUp, Layers, ListChecks, Paperclip, ScanLine, X } from "lucide-react";
import { useState, type ComponentType } from "react";

import { Botao, Orbe, Selo } from "@/components/ds/basicos";
import { CURVA } from "@/lib/ds/movimento";
import { useTempo } from "@/lib/ds/tempo";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";

import { Topo } from "../_comum/topo";
import "./inicio-d.css";

export type SituacaoD = "padrao" | "tarefa-escolhida" | "arrastando" | "arquivo-recebido" | "achados-com-voce" | "primeiro-acesso";

export type IdTarefa = "auditar" | "volume" | "ld" | "conferir";

export interface Tarefa {
  id: IdTarefa;
  nome: string;
  precisa: string;
  aceita: string;
  soltar: string;
  Icone: ComponentType<{ size?: number }>;
}

/**
 * As tarefas do Nexo, nomeadas pelo que a pessoa quer fazer — e cada uma diz o
 * que ela precisa TER EM MÃOS. Como o uso é pontual (abrir, fazer, fechar), a
 * primeira pergunta que a tela responde é "o que eu trago para começar".
 */
export const TAREFAS: Tarefa[] = [
  { id: "auditar", nome: "Auditar um memorial", precisa: "O memorial descritivo em PDF.", aceita: "1 PDF", soltar: "Solte o memorial para auditar", Icone: FileSearch },
  { id: "volume", nome: "Montar um volume", precisa: "Capas, LDs, pranchas e anexos já prontos, em PDF.", aceita: "vários PDFs", soltar: "Solte os PDFs para montar", Icone: Layers },
  { id: "ld", nome: "Gerar LD e capa", precisa: "As pranchas em PDF. O Nexo lê os carimbos.", aceita: "pranchas", soltar: "Solte as pranchas para gerar", Icone: ListChecks },
  { id: "conferir", nome: "Conferir as folhas", precisa: "As pranchas, para conferir carimbo, código e revisão.", aceita: "pranchas", soltar: "Solte as pranchas para conferir", Icone: ScanLine },
];

/** O que o Nexo diz depois de ler o arquivo, e a única ação — por tarefa. */
export const DEPOIS_DE_LER: Record<IdTarefa, { arquivo: string; tamanho: string; leu: string; plano: string; custo: string; acao: string; obra: { nome: string; codigo: string; cidade: string; detalhe: string } }> = {
  auditar: {
    arquivo: "117_25_md_geral_a.pdf",
    tamanho: "42 páginas, 3,1 MB",
    leu: "O Nexo leu a capa e o carimbo",
    plano: "Vou conferir identidade do documento, volumes contra o quadro, normas citadas e coerência entre capítulos.",
    custo: "Cerca de 6 min. R$ 1,80 estimado. Pode fechar a aba enquanto roda.",
    acao: "Auditar",
    obra: { nome: "Unidade Básica de Saúde da Rua São Francisco de Assis", codigo: "117-25", cidade: "Criciúma", detalhe: "Criciúma, revisão A de 12/09/2026" },
  },
  volume: {
    arquivo: "7 arquivos",
    tamanho: "capa, LD e 5 PDFs de pranchas, 64 páginas",
    leu: "O Nexo separou os arquivos por tipo",
    plano: "Monto um volume com capa, LD e as pranchas em dois grupos (arquitetura e estrutura). Você confere a ordem antes de exportar.",
    custo: "Sem IA, sem custo. Leva segundos.",
    acao: "Montar",
    obra: { nome: "Praça da Juventude", codigo: "SIM099-26", cidade: "São José", detalhe: "São José, 24 folhas em 3 disciplinas" },
  },
  ld: {
    arquivo: "pranchas_prx099.pdf",
    tamanho: "24 pranchas, 18 MB",
    leu: "O Nexo começou a ler os carimbos",
    plano: "Gero a lista de documentos e a capa da prefeitura com o que estiver nos carimbos. Folhas sem carimbo ficam para você conferir.",
    custo: "Cerca de 2 min. R$ 0,40 estimado.",
    acao: "Gerar LD e capa",
    obra: { nome: "Praça da Juventude", codigo: "SIM099-26", cidade: "São José", detalhe: "São José, 24 folhas em 3 disciplinas" },
  },
  conferir: {
    arquivo: "pranchas_prx099.pdf",
    tamanho: "24 pranchas, 18 MB",
    leu: "O Nexo começou a ler os carimbos",
    plano: "Confiro em cada folha o código, a disciplina, a revisão e o nome da obra contra o projeto, e aponto o que divergir.",
    custo: "Cerca de 2 min. R$ 0,40 estimado.",
    acao: "Conferir",
    obra: { nome: "Praça da Juventude", codigo: "SIM099-26", cidade: "São José", detalhe: "São José, 24 folhas em 3 disciplinas" },
  },
};

const CONTINUAR = [
  { titulo: "Memorial geral 117-25", obra: "117-25", cidade: "Criciúma", estado: "Auditoria concluída: 2 bloqueios para corrigir", quando: "há 4 h", tom: "block" as const },
  { titulo: "Volume da Praça da Juventude", obra: "SIM099-26", cidade: "São José", estado: "Volume montado, falta exportar", quando: "ontem", tom: "decide" as const },
  { titulo: "LD do Ginásio Cristo Redentor", obra: "SIM118-25", cidade: "Criciúma", estado: "LD e capa gerados", quando: "21/09", tom: "ok" as const },
];

const ease = (c: readonly number[]) => [...c] as [number, number, number, number];

/**
 * INÍCIO D — tarefa primeiro. Substitui o Painel e a Conversa nova: as duas
 * telas faziam o mesmo trabalho, que é começar (ou retomar) uma tarefa.
 *
 * O momento que importa é o CARTÃO VIRANDO A TAREFA: escolher (ou soltar um
 * arquivo em) um cartão o faz crescer até ocupar a coluna, e os outros viram
 * atalhos pequenos. O olho não procura para onde foi — foi para onde ele
 * clicou.
 */
export function TelaInicioD({ situacao }: { situacao: SituacaoD }) {
  const { dur, mola } = useTempo();
  const primeiro = situacao === "primeiro-acesso";
  const [escolhida, setEscolhida] = useState<IdTarefa | null>(
    situacao === "tarefa-escolhida" || situacao === "arquivo-recebido" ? "auditar" : null,
  );
  const [arquivo, setArquivo] = useState<string | null>(situacao === "arquivo-recebido" ? "117_25_md_geral_a.pdf" : null);
  const [arrastando, setArrastando] = useState(situacao === "arrastando");
  const [alvo, setAlvo] = useState<IdTarefa | null>(situacao === "arrastando" ? "auditar" : null);
  const [texto, setTexto] = useState("");
  const tarefa = TAREFAS.find((t) => t.id === escolhida) ?? null;
  const lido = tarefa ? DEPOIS_DE_LER[tarefa.id] : null;

  function receber(id: IdTarefa, nome = DEPOIS_DE_LER[id].arquivo) {
    setEscolhida(id);
    setArquivo(nome);
    setArrastando(false);
    setAlvo(null);
  }

  return (
    <div
      className="pd"
      onDragEnter={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setArrastando(false);
          setAlvo(null);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        // Soltou fora de um cartão: o Nexo decide pelo arquivo. Aqui, o memorial.
        receber(alvo ?? "auditar", e.dataTransfer.files[0]?.name);
      }}
    >
      <div className="pd-brilho" aria-hidden />
      <Topo atual="Painel" aviso={situacao === "achados-com-voce"} />

      <main className="pd-centro">
        <div className="pd-abertura">
          <Orbe tamanho={36} estado={arquivo ? "trabalhando" : "repouso"} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1
              key={tarefa ? tarefa.id : "inicio"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: dur("state"), ease: ease(CURVA.out) }}
            >
              {tarefa ? tarefa.nome : arrastando ? "Para que é este arquivo?" : "O que vamos fazer hoje?"}
            </motion.h1>
          </AnimatePresence>
        </div>

        {situacao === "achados-com-voce" && !tarefa && (
          <motion.button
            type="button"
            className="pd-lembrete"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur("enter"), ease: ease(CURVA.out), delay: 0.2 }}
          >
            <span className="pd-lembrete-ponto" />3 achados foram atribuídos a você em 117-25
            <span className="pd-lembrete-ir">
              Ver <ChevronRight size={14} />
            </span>
          </motion.button>
        )}

        <LayoutGroup>
          {/* ---------- os quatro cartões, ou a tarefa aberta ---------- */}
          {tarefa ? (
            <>
              <div className="pd-atalhos">
                <Botao variante="quiet" tamanho="sm" onClick={() => { setEscolhida(null); setArquivo(null); }}>
                  <X />
                  Voltar
                </Botao>
                {TAREFAS.filter((t) => t.id !== tarefa.id).map((t) => (
                  <motion.button
                    key={t.id}
                    layoutId={`tarefa-${t.id}`}
                    type="button"
                    className="pd-atalho"
                    onClick={() => { setEscolhida(t.id); setArquivo(null); }}
                    transition={mola("smooth")}
                  >
                    <t.Icone size={14} />
                    {t.nome}
                  </motion.button>
                ))}
              </div>
              <motion.section layoutId={`tarefa-${tarefa.id}`} className="pd-tarefa" transition={mola("smooth")}>
                <AnimatePresence mode="wait" initial={false}>
                  {arquivo ? (
                    <motion.div
                      key="recebido"
                      className="pd-recebido"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: dur("state") }}
                    >
                      <div className="pd-arquivo">
                        <span className="pd-pdf" aria-hidden />
                        <div>
                          <b>{arquivo}</b>
                          <span>{lido?.tamanho}</span>
                        </div>
                        <Botao variante="quiet" tamanho="sm" icone aria-label="Tirar o arquivo" onClick={() => setArquivo(null)}>
                          <X />
                        </Botao>
                      </div>
                      <motion.div
                        className="pd-leitura"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: dur("enter"), ease: ease(CURVA.out), delay: 0.12 }}
                      >
                        <span className="pd-nota">{lido?.leu}</span>
                        <div className="pd-obra">
                          <MarcaDaPrefeitura prefeitura={lido?.obra.cidade} forma="selo" />
                          <div>
                            <b>{lido?.obra.nome}</b>
                            <span>
                              <span className="ds-code">{lido?.obra.codigo}</span> {lido?.obra.detalhe}
                            </span>
                          </div>
                          <Selo tom="ok">
                            <Check size={12} /> Projeto encontrado
                          </Selo>
                        </div>
                        <div className="pd-escopo">
                          <span>{lido?.plano}</span>
                          <span className="pd-nota">{lido?.custo}</span>
                        </div>
                        <div className="pd-acoes">
                          <Botao variante="quiet" tamanho="sm">
                            É outro projeto
                          </Botao>
                          <Botao variante="primary">
                            <tarefa.Icone size={16} />
                            {lido?.acao}
                          </Botao>
                        </div>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.label
                      key="soltar"
                      className="pd-soltar"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: dur("state") }}
                      onClick={(e) => {
                        e.preventDefault();
                        receber(tarefa.id);
                      }}
                    >
                      <span className="pd-soltar-icone">
                        <FileUp size={22} />
                      </span>
                      <b>{tarefa.soltar}</b>
                      <span>{tarefa.precisa}</span>
                      <span className="pd-soltar-ou">
                        ou <u>escolha no computador</u>
                      </span>
                    </motion.label>
                  )}
                </AnimatePresence>
              </motion.section>
            </>
          ) : (
            <div className="pd-cartoes">
              {TAREFAS.map((t, i) => (
                <motion.button
                  key={t.id}
                  layoutId={`tarefa-${t.id}`}
                  type="button"
                  className={`pd-cartao${arrastando ? " pd-cartao--alvo" : ""}${alvo === t.id ? " pd-cartao--sobre" : ""}`}
                  onClick={() => setEscolhida(t.id)}
                  onDragEnter={() => setAlvo(t.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (alvo !== t.id) setAlvo(t.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    receber(t.id, e.dataTransfer.files[0]?.name);
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: alvo === t.id ? -3 : 0 }}
                  transition={{ ...mola("smooth"), opacity: { duration: dur("enter"), delay: 0.04 * i } }}
                >
                  <span className="pd-cartao-icone">
                    <t.Icone size={18} />
                  </span>
                  <b>{t.nome}</b>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={alvo === t.id ? "s" : "p"}
                      className="pd-cartao-texto"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: dur("feedback") }}
                    >
                      {alvo === t.id ? t.soltar : t.precisa}
                    </motion.span>
                  </AnimatePresence>
                  <span className="pd-cartao-aceita">{t.aceita}</span>
                </motion.button>
              ))}
            </div>
          )}
        </LayoutGroup>

        {/* ---------- ou descrever ---------- */}
        {!tarefa && (
          <div className="pd-compositor">
            <textarea
              rows={1}
              aria-label="Descrever para o Nexo"
              placeholder="Ou descreva o que precisa: “refaz a LD da 063-26 com a revisão C”"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <Botao variante="quiet" icone tamanho="sm" aria-label="Anexar PDFs">
              <Paperclip />
            </Botao>
            <motion.button
              type="button"
              className="pd-enviar"
              aria-label="Enviar"
              disabled={!texto.trim()}
              animate={{ scale: texto.trim() ? 1 : 0.9, opacity: texto.trim() ? 1 : 0.45 }}
              transition={mola("snappy")}
            >
              <ArrowUp size={15} />
            </motion.button>
          </div>
        )}

        {/* ---------- continuar ---------- */}
        {!tarefa && (
          <section className="pd-continuar" aria-label="Continuar de onde parou">
            <div className="pd-continuar-cabeca">
              <h2>{primeiro ? "Primeira vez aqui?" : "Continuar de onde parou"}</h2>
              {!primeiro && (
                <Botao variante="quiet" tamanho="sm">
                  Todos os projetos
                  <ChevronRight />
                </Botao>
              )}
            </div>
            {primeiro ? (
              <div className="pd-primeiro">
                <BookOpen size={16} />
                <span>
                  Escolha uma tarefa acima ou solte um PDF em qualquer lugar. O Nexo lê o documento, descobre a obra e cria o projeto
                  sozinho.
                </span>
                <Botao variante="ghost" tamanho="sm">
                  Ver como funciona
                </Botao>
              </div>
            ) : (
              <ul>
                {CONTINUAR.map((c) => (
                  <li key={c.titulo}>
                    <button type="button">
                      <MarcaDaPrefeitura prefeitura={c.cidade} forma="sinal" />
                      <span className="pd-c-titulo">
                        <b>{c.titulo}</b>
                        <span className={`pd-c-estado pd-c-estado--${c.tom}`}>{c.estado}</span>
                      </span>
                      <span className="ds-code">{c.obra}</span>
                      <time>{c.quando}</time>
                      <ChevronRight size={15} className="pd-c-seta" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
