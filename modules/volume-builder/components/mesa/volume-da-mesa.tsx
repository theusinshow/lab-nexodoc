"use client";

/**
 * UM VOLUME NA MESA — capa, e os grupos com separatriz, LD, pranchas e anexos,
 * na ordem em que o PDF sai (auditoria UX/UI, V03/V05/V08/G07/G09).
 *
 * Tudo o que se faz aqui tem um BOTÃO COM NOME: tirar, trocar, mover para
 * antes/depois, levar para outro grupo, duplicar, remover — e cada botão diz de
 * qual item e de qual volume está falando. Soltar uma página arrastada num
 * lugar continua funcionando, pelo mesmo caminho das operações (`mesa.ts`).
 *
 * Nada aqui pergunta "tem certeza?": toda operação vai para o histórico, e o
 * aviso no topo oferece Desfazer.
 */

import { useDroppable } from "@dnd-kit/core";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  Crosshair,
  Eye,
  FilePlus2,
  FileText,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ROTULO_DO_TIPO,
  adicionarGrupo,
  duplicarGrupo,
  duplicarVolume,
  editarGrupo,
  editarVolume,
  inserirPaginas,
  moverDocumento,
  moverDocumentoParaGrupo,
  moverGrupo,
  moverVolume,
  removerGrupo,
  removerSlot,
  removerVolume,
  rotuloDoGrupo,
  rotuloDoVolume,
  type AlvoDeInsercao,
  type EstadoDaMontagem,
  type ProntidaoDoVolume,
  type Resultado,
} from "@/modules/volume-builder/lib/volume/mesa";
import { formatPageSelection } from "@/modules/volume-builder/lib/utils/parse-page-selection";
import type { AssemblyBlock, AssemblyRow, AssemblySlot, PageAsset } from "@/modules/volume-builder/lib/volume/volume-types";
import { cn } from "@/lib/utils";
import type { Destino } from "./destino";

type Executar = (op: (e: EstadoDaMontagem) => Resultado, opcoes?: { chave?: string }) => Resultado;

const ESTADO_DO_VOLUME: Record<ProntidaoDoVolume["estado"], { rotulo: string; variante: "secondary" | "warning" | "ok" }> = {
  rascunho: { rotulo: "Rascunho", variante: "secondary" },
  incompleto: { rotulo: "Incompleto", variante: "warning" },
  pronto: { rotulo: "Pronto para conferir", variante: "ok" },
};

export function VolumeDaMesa({
  estado,
  row,
  indice,
  prontidao,
  destino,
  selecionadas,
  executar,
  onDestino,
  onPrevia,
}: {
  estado: EstadoDaMontagem;
  row: AssemblyRow;
  indice: number;
  prontidao: ProntidaoDoVolume;
  destino: Destino | null;
  selecionadas: PageAsset[];
  executar: Executar;
  onDestino: (d: Destino) => void;
  onPrevia: (rowId: string) => void;
}) {
  const vol = rotuloDoVolume(estado, row.id);
  const e = ESTADO_DO_VOLUME[prontidao.estado];
  const inserir = (alvo: AlvoDeInsercao) => executar((s) => inserirPaginas(s, alvo, selecionadas));

  return (
    <section
      id={`volume-${row.id}`}
      aria-label={vol}
      data-volume={row.id}
      className="scroll-mt-28 border bg-card p-3"
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold tabular-nums">{String(indice + 1).padStart(2, "0")}</span>
        <label className="sr-only" htmlFor={`titulo-${row.id}`}>
          Título de {vol}
        </label>
        <Input
          id={`titulo-${row.id}`}
          value={row.title}
          onChange={(ev) =>
            executar((s) => editarVolume(s, row.id, { title: ev.target.value }), { chave: `titulo:${row.id}` })
          }
          className="h-8 min-w-[8rem] flex-1 text-sm"
        />
        <Badge variant={e.variante} data-estado-do-volume={prontidao.estado}>
          {e.rotulo}
          {prontidao.bloqueios.length > 0 ? ` · ${prontidao.bloqueios.length} pendência${prontidao.bloqueios.length === 1 ? "" : "s"}` : ""}
        </Badge>
        <span className="font-mono text-[11px] text-muted-foreground">{prontidao.paginas} pág. no PDF</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button type="button" size="sm" variant="outline" onClick={() => onPrevia(row.id)} aria-label={`Prévia do PDF de ${vol}`}>
            <Eye aria-hidden />
            Prévia
          </Button>
          <IconeComNome rotulo={`Mover ${vol} para cima`} disabled={indice === 0} onClick={() => executar((s) => moverVolume(s, row.id, -1))}>
            <ArrowUp />
          </IconeComNome>
          <IconeComNome
            rotulo={`Mover ${vol} para baixo`}
            disabled={indice === estado.rows.length - 1}
            onClick={() => executar((s) => moverVolume(s, row.id, 1))}
          >
            <ArrowDown />
          </IconeComNome>
          <IconeComNome rotulo={`Duplicar ${vol}`} onClick={() => executar((s) => duplicarVolume(s, row.id))}>
            <Copy />
          </IconeComNome>
          <IconeComNome rotulo={`Remover ${vol}`} perigo onClick={() => executar((s) => removerVolume(s, row.id))}>
            <Trash2 />
          </IconeComNome>
        </div>
      </header>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label htmlFor={`nome-${row.id}`} className="font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">
          Nome final do PDF
        </label>
        <Input
          id={`nome-${row.id}`}
          value={row.outputFileName}
          placeholder="ex.: 106_25_vol_5_est.pdf"
          onChange={(ev) =>
            executar((s) => editarVolume(s, row.id, { outputFileName: ev.target.value }), { chave: `nome:${row.id}` })
          }
          className="h-8 min-w-[12rem] flex-1 font-mono text-xs"
        />
      </div>

      <div className="mt-3 grid gap-3">
        <Lugar
          titulo={`Capa de ${vol}`}
          rotulo="Capa"
          dropId={`cover:${row.id}`}
          slot={row.cover}
          selecionadas={selecionadas}
          onEscolher={() => inserir({ tipo: "cover", rowId: row.id })}
          onTirar={() => executar((s) => removerSlot(s, { tipo: "cover", rowId: row.id }))}
        />

        {row.blocks.map((block, i) => (
          <GrupoDaMesa
            key={block.id}
            estado={estado}
            row={row}
            block={block}
            indice={i}
            ativo={destino?.rowId === row.id && destino.blockId === block.id}
            selecionadas={selecionadas}
            executar={executar}
            onDestino={onDestino}
          />
        ))}

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            const r = executar((s) => adicionarGrupo(s, row.id));
            const novo = r.estado.rows.find((x) => x.id === row.id)?.blocks.at(-1);
            if (novo) onDestino({ rowId: row.id, blockId: novo.id, posicao: null });
          }}
          aria-label={`Adicionar grupo a ${vol}`}
        >
          <Plus aria-hidden />
          Adicionar grupo
        </Button>
      </div>
    </section>
  );
}

function GrupoDaMesa({
  estado,
  row,
  block,
  indice,
  ativo,
  selecionadas,
  executar,
  onDestino,
}: {
  estado: EstadoDaMontagem;
  row: AssemblyRow;
  block: AssemblyBlock;
  indice: number;
  ativo: boolean;
  selecionadas: PageAsset[];
  executar: Executar;
  onDestino: (d: Destino) => void;
}) {
  const vol = rotuloDoVolume(estado, row.id);
  const grp = rotuloDoGrupo(row, block.id);
  const onde = `${grp} de ${vol}`;
  const inserir = (alvo: AlvoDeInsercao) => executar((s) => inserirPaginas(s, alvo, selecionadas));
  const outrosGrupos = estado.rows.flatMap((r) =>
    r.blocks
      .filter((b) => b.id !== block.id)
      .map((b) => ({ rowId: r.id, blockId: b.id, rotulo: `${rotuloDoVolume(estado, r.id)} › ${rotuloDoGrupo(r, b.id)}` })),
  );

  return (
    <div
      id={`grupo-${block.id}`}
      data-grupo={block.id}
      className={cn(
        "scroll-mt-28 border p-2.5",
        ativo ? "border-[var(--nexodoc-tertiary-strong)] bg-[var(--nexodoc-tertiary-bg)]/40" : "bg-muted/15",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{grp}</span>
        {ativo ? (
          <Badge variant="secondary" className="gap-1">
            <Crosshair aria-hidden />
            destino atual
          </Badge>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDestino({ rowId: row.id, blockId: block.id, posicao: null })}
            aria-label={`Usar ${onde} como destino das páginas`}
          >
            <Crosshair aria-hidden />
            Usar como destino
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <IconeComNome rotulo={`Mover ${onde} para cima`} disabled={indice === 0} onClick={() => executar((s) => moverGrupo(s, row.id, block.id, -1))}>
            <ArrowUp />
          </IconeComNome>
          <IconeComNome
            rotulo={`Mover ${onde} para baixo`}
            disabled={indice === row.blocks.length - 1}
            onClick={() => executar((s) => moverGrupo(s, row.id, block.id, 1))}
          >
            <ArrowDown />
          </IconeComNome>
          <IconeComNome rotulo={`Duplicar ${onde}`} onClick={() => executar((s) => duplicarGrupo(s, row.id, block.id))}>
            <Copy />
          </IconeComNome>
          <IconeComNome rotulo={`Remover ${onde}`} perigo onClick={() => executar((s) => removerGrupo(s, row.id, block.id))}>
            <Trash2 />
          </IconeComNome>
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1.4fr)]">
        <CampoRotulado id={`gt-${block.id}`} rotulo="Nome do grupo">
          <Input
            id={`gt-${block.id}`}
            value={block.title}
            onChange={(ev) => executar((s) => editarGrupo(s, row.id, block.id, { title: ev.target.value }), { chave: `gt:${block.id}` })}
            className="h-8 text-xs"
          />
        </CampoRotulado>
        <CampoRotulado id={`gc-${block.id}`} rotulo="Código">
          <Input
            id={`gc-${block.id}`}
            value={block.disciplineCode}
            placeholder="EST"
            onChange={(ev) => executar((s) => editarGrupo(s, row.id, block.id, { disciplineCode: ev.target.value }), { chave: `gc:${block.id}` })}
            className="h-8 text-xs"
          />
        </CampoRotulado>
        <CampoRotulado id={`gs-${block.id}`} rotulo="Título da separatriz automática">
          <Input
            id={`gs-${block.id}`}
            value={block.separatorTitle}
            placeholder="PROJETO DE ESTRUTURAS"
            onChange={(ev) => executar((s) => editarGrupo(s, row.id, block.id, { separatorTitle: ev.target.value }), { chave: `gs:${block.id}` })}
            className="h-8 text-xs"
          />
        </CampoRotulado>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {block.separator?.selection ? (
          <Lugar
            titulo={`Separatriz de ${onde}`}
            rotulo="Separatriz (PDF próprio)"
            dropId={`separator:${block.id}`}
            slot={block.separator}
            selecionadas={selecionadas}
            onEscolher={() => inserir({ tipo: "separator", rowId: row.id, blockId: block.id })}
            onTirar={() => executar((s) => removerSlot(s, { tipo: "separator", rowId: row.id, blockId: block.id }))}
            rotuloTirar="Restaurar automática"
          />
        ) : (
          <SeparatrizAutomatica
            titulo={block.separatorTitle}
            dropId={`separator:${block.id}`}
            onde={onde}
            podeUsar={selecionadas.length > 0}
            onUsarProprio={() => inserir({ tipo: "separator", rowId: row.id, blockId: block.id })}
          />
        )}
        <Lugar
          titulo={`LD de ${onde}`}
          rotulo="Lista de documentos (LD)"
          dropId={`ld:${block.id}`}
          slot={block.ld}
          selecionadas={selecionadas}
          onEscolher={() => inserir({ tipo: "ld", rowId: row.id, blockId: block.id })}
          onTirar={() => executar((s) => removerSlot(s, { tipo: "ld", rowId: row.id, blockId: block.id }))}
        />
      </div>

      {(["document", "appendix"] as const).map((tipo) => {
        const lista = tipo === "document" ? block.documents : (block.appendices ?? []);
        const nome = tipo === "document" ? "Prancha" : "Anexo";
        return (
          <div key={tipo} className="mt-2">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{ROTULO_DO_TIPO[tipo]}</span>
              <Badge variant="outline" className="h-5 px-1.5 text-[11px]">
                {lista.length}
              </Badge>
            </div>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2">
              {lista.map((slot, i) => (
                <li key={slot.id}>
                  <Lugar
                    titulo={`${nome} ${i + 1} de ${onde}`}
                    rotulo={`${nome} ${i + 1}`}
                    dropId={`${tipo}-item:${block.id}:${i}`}
                    slot={slot}
                    selecionadas={selecionadas}
                    onEscolher={() => undefined}
                    onTirar={() => executar((s) => removerSlot(s, { tipo, rowId: row.id, blockId: block.id, indice: i }))}
                    extra={
                      <div className="flex flex-wrap items-center gap-1">
                        <IconeComNome
                          rotulo={`Mover ${nome.toLowerCase()} ${i + 1} para antes`}
                          disabled={i === 0}
                          onClick={() => executar((s) => moverDocumento(s, row.id, block.id, tipo, i, i - 1))}
                        >
                          <ArrowLeft />
                        </IconeComNome>
                        <IconeComNome
                          rotulo={`Mover ${nome.toLowerCase()} ${i + 1} para depois`}
                          disabled={i === lista.length - 1}
                          onClick={() => executar((s) => moverDocumento(s, row.id, block.id, tipo, i, i + 1))}
                        >
                          <ArrowRight />
                        </IconeComNome>
                        {outrosGrupos.length > 0 ? (
                          <Select
                            aria-label={`Levar ${nome.toLowerCase()} ${i + 1} para outro grupo`}
                            value=""
                            onChange={(ev) => {
                              const [rowId, blockId] = ev.target.value.split("|");
                              if (rowId && blockId) {
                                executar((s) =>
                                  moverDocumentoParaGrupo(s, { rowId: row.id, blockId: block.id, tipo, indice: i }, { rowId, blockId }),
                                );
                              }
                            }}
                            className="h-7 w-full text-[11px]"
                          >
                            <option value="">Levar para outro grupo…</option>
                            {outrosGrupos.map((g) => (
                              <option key={g.blockId} value={`${g.rowId}|${g.blockId}`}>
                                {g.rotulo}
                              </option>
                            ))}
                          </Select>
                        ) : null}
                      </div>
                    }
                  />
                </li>
              ))}
              <li>
                <Lugar
                  titulo={`${ROTULO_DO_TIPO[tipo]} de ${onde}`}
                  rotulo={`Adicionar ${tipo === "document" ? "pranchas" : "anexos"}`}
                  dropId={`${tipo === "document" ? "documents" : "appendices"}:${block.id}`}
                  selecionadas={selecionadas}
                  multiplas
                  onEscolher={() => inserir({ tipo, rowId: row.id, blockId: block.id })}
                  onTirar={() => undefined}
                />
              </li>
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/**
 * UM LUGAR DA SEQUÊNCIA — preenchido ou vazio, e alvo de soltura.
 *
 * Vazio, ele oferece "Escolher páginas": com páginas selecionadas na
 * biblioteca, elas entram AQUI (alvo explícito, sem arrastar); sem seleção, o
 * botão diz o que falta. Preenchido, diz o arquivo e as páginas, e oferece
 * trocar pelas selecionadas e tirar.
 */
function Lugar({
  titulo,
  rotulo,
  dropId,
  slot,
  selecionadas,
  multiplas = false,
  onEscolher,
  onTirar,
  rotuloTirar = "Tirar",
  extra,
}: {
  titulo: string;
  rotulo: string;
  dropId: string;
  slot?: AssemblySlot;
  selecionadas: PageAsset[];
  multiplas?: boolean;
  onEscolher: () => void;
  onTirar: () => void;
  rotuloTirar?: string;
  extra?: ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: dropId });
  const n = selecionadas.length;
  const soltando = isOver ? "border-[var(--nexodoc-tertiary-strong)] bg-[var(--nexodoc-tertiary-bg)]" : "";
  const substituivel = !dropId.startsWith("document-item") && !dropId.startsWith("appendix-item");

  if (slot?.selection) {
    return (
      <div ref={setNodeRef} data-lugar={dropId} className={cn("grid gap-1 border bg-background p-2", soltando)}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">{rotulo}</span>
          <FileText className="size-3.5 text-muted-foreground" aria-hidden />
        </div>
        <p className="truncate text-xs font-medium" title={slot.selection.sourceFileName}>
          {slot.selection.sourceFileName}
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">{formatPageSelection(slot.selection)}</p>
        <div className="flex flex-wrap items-center gap-1">
          {substituivel && n > 0 ? (
            <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={onEscolher} aria-label={`Trocar ${titulo} pela página selecionada`}>
              Trocar
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-[var(--status-critical)]"
            onClick={onTirar}
            aria-label={`${rotuloTirar}: ${titulo}`}
          >
            <X aria-hidden />
            {rotuloTirar}
          </Button>
        </div>
        {extra}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      data-lugar={dropId}
      className={cn("grid min-h-[5.5rem] content-center justify-items-center gap-1 border border-dashed p-2 text-center", soltando)}
    >
      <FilePlus2 className="size-4 text-muted-foreground" aria-hidden />
      <span className="text-xs font-medium text-muted-foreground">{rotulo}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2 text-[11px]"
        disabled={n === 0}
        onClick={onEscolher}
        aria-label={
          n === 0
            ? `${titulo}: selecione páginas na biblioteca para escolher`
            : `Colocar ${n === 1 ? "a página selecionada" : `${multiplas ? `as ${n} páginas selecionadas` : "a primeira página selecionada"}`} em ${titulo}`
        }
      >
        {n === 0 ? "Selecione páginas" : multiplas && n > 1 ? `Colocar ${n} páginas` : "Colocar aqui"}
      </Button>
      <span className="text-[11px] text-muted-foreground">ou arraste para cá</span>
    </div>
  );
}

function SeparatrizAutomatica({
  titulo,
  dropId,
  onde,
  podeUsar,
  onUsarProprio,
}: {
  titulo: string;
  dropId: string;
  onde: string;
  podeUsar: boolean;
  onUsarProprio: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: dropId });
  return (
    <div
      ref={setNodeRef}
      data-lugar={dropId}
      className={cn(
        "grid gap-1 border border-[var(--nexodoc-tertiary-strong)]/45 bg-[var(--nexodoc-tertiary-bg)] p-2",
        isOver && "ring-2 ring-[var(--nexodoc-tertiary)]/30",
      )}
    >
      <span className="text-xs font-medium text-[var(--nexodoc-tertiary)]">Separatriz automática</span>
      <p className="line-clamp-2 text-[11px] font-semibold uppercase">{titulo || "sem título"}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2 text-[11px]"
        disabled={!podeUsar}
        onClick={onUsarProprio}
        aria-label={podeUsar ? `Usar a página selecionada como separatriz de ${onde}` : `Separatriz de ${onde}: selecione uma página para usar PDF próprio`}
      >
        {podeUsar ? "Usar página selecionada" : "Selecione uma página para usar PDF próprio"}
      </Button>
    </div>
  );
}

function IconeComNome({
  rotulo,
  onClick,
  disabled,
  perigo,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  disabled?: boolean;
  perigo?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn("size-8", perigo && "text-[var(--status-critical)] hover:text-[var(--status-critical)]")}
      onClick={onClick}
      disabled={disabled}
      aria-label={rotulo}
      title={rotulo}
    >
      <span aria-hidden className="contents">
        {children}
      </span>
    </Button>
  );
}

function CampoRotulado({ id, rotulo, children }: { id: string; rotulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">
        {rotulo}
      </label>
      {children}
    </div>
  );
}
