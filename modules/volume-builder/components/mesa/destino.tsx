"use client";

/**
 * O DESTINO DAS PÁGINAS — escolhido, visível e dito antes de aplicar (V03).
 *
 * Os botões "Capa", "LD" e "Docs" da bandeja mandavam SEMPRE para o primeiro
 * volume e o primeiro grupo. Agora há um destino ativo (volume › grupo), que a
 * pessoa troca aqui ou pelo "Usar como destino" de cada grupo, e cada botão
 * diz no próprio nome aonde as páginas vão. Arrastar continua funcionando —
 * como atalho, não como único caminho.
 */

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  descreverAlvo,
  rotuloDoGrupo,
  rotuloDoVolume,
  type AlvoDeInsercao,
  type EstadoDaMontagem,
} from "@/modules/volume-builder/lib/volume/mesa";
import type { AssemblySlotType } from "@/modules/volume-builder/lib/volume/volume-types";

export type Destino = { rowId: string; blockId: string | null; posicao: number | null };

/** O destino corrigido contra o estado atual (volume/grupo removido, etc.). */
export function destinoEfetivo(estado: EstadoDaMontagem, d: Destino | null): Destino | null {
  const row = estado.rows.find((r) => r.id === d?.rowId) ?? estado.rows[0];
  if (!row) return null;
  const block = row.blocks.find((b) => b.id === d?.blockId) ?? row.blocks[0] ?? null;
  const posicao =
    block && d?.posicao !== null && d?.posicao !== undefined && d.posicao <= block.documents.length
      ? d.posicao
      : null;
  return { rowId: row.id, blockId: block?.id ?? null, posicao };
}

export function alvoPara(d: Destino, tipo: AssemblySlotType): AlvoDeInsercao | null {
  if (tipo === "cover") return { tipo: "cover", rowId: d.rowId };
  if (!d.blockId) return null;
  if (tipo === "ld" || tipo === "separator") return { tipo, rowId: d.rowId, blockId: d.blockId };
  return { tipo, rowId: d.rowId, blockId: d.blockId, posicao: tipo === "document" ? (d.posicao ?? undefined) : undefined };
}

export function SeletorDeDestino({
  estado,
  destino,
  onChange,
  onCriarVolume,
  onCriarGrupo,
}: {
  estado: EstadoDaMontagem;
  destino: Destino | null;
  onChange: (d: Destino) => void;
  onCriarVolume: () => void;
  onCriarGrupo: (rowId: string) => void;
}) {
  if (!destino) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" data-destino="nenhum">
        <span>Nenhum volume ainda — as páginas precisam de um destino.</span>
        <Button type="button" size="sm" variant="outline" onClick={onCriarVolume}>
          <Plus aria-hidden />
          Criar volume
        </Button>
      </div>
    );
  }
  const row = estado.rows.find((r) => r.id === destino.rowId)!;
  const block = row.blocks.find((b) => b.id === destino.blockId);

  return (
    <fieldset className="grid gap-1.5" data-destino={`${destino.rowId}:${destino.blockId ?? ""}`}>
      <legend className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
        Destino das páginas
      </legend>
      <div className="flex flex-wrap items-center gap-1.5">
        <Select
          aria-label="Volume de destino"
          value={destino.rowId}
          onChange={(e) => {
            const novo = estado.rows.find((r) => r.id === e.target.value);
            onChange({ rowId: e.target.value, blockId: novo?.blocks[0]?.id ?? null, posicao: null });
          }}
          className="h-8 min-w-[9rem] flex-1"
        >
          {estado.rows.map((r) => (
            <option key={r.id} value={r.id}>
              {rotuloDoVolume(estado, r.id)}
            </option>
          ))}
        </Select>
        {row.blocks.length > 0 ? (
          <Select
            aria-label="Grupo de destino"
            value={destino.blockId ?? ""}
            onChange={(e) => onChange({ ...destino, blockId: e.target.value, posicao: null })}
            className="h-8 min-w-[8rem] flex-1"
          >
            {row.blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {rotuloDoGrupo(row, b.id)}
              </option>
            ))}
          </Select>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => onCriarGrupo(row.id)}>
            <Plus aria-hidden />
            Criar grupo neste volume
          </Button>
        )}
        {block ? (
          <Select
            aria-label="Posição das pranchas no grupo"
            value={destino.posicao === null ? "fim" : String(destino.posicao)}
            onChange={(e) =>
              onChange({ ...destino, posicao: e.target.value === "fim" ? null : Number(e.target.value) })
            }
            className="h-8 min-w-[8rem] flex-1"
          >
            <option value="fim">Pranchas: no fim</option>
            {block.documents.map((_, i) => (
              <option key={i} value={i}>
                Pranchas: antes da P{i + 1}
              </option>
            ))}
          </Select>
        ) : null}
      </div>
    </fieldset>
  );
}

const BOTOES: { tipo: AssemblySlotType; rotulo: string }[] = [
  { tipo: "cover", rotulo: "Capa" },
  { tipo: "separator", rotulo: "Separatriz" },
  { tipo: "ld", rotulo: "LD" },
  { tipo: "document", rotulo: "Pranchas" },
  { tipo: "appendix", rotulo: "Anexos" },
];

/**
 * "Adicionar N páginas como … em Volume 02 › Grupo 2" — o nome acessível de
 * cada botão É a descrição do destino, para ninguém aplicar às cegas.
 */
export function InserirNoDestino({
  estado,
  destino,
  quantidade,
  onInserir,
}: {
  estado: EstadoDaMontagem;
  destino: Destino | null;
  quantidade: number;
  onInserir: (alvo: AlvoDeInsercao) => void;
}) {
  const semSelecao = quantidade === 0;
  return (
    <div className="grid gap-1.5" data-inserir-no-destino>
      <p className="text-xs text-muted-foreground">
        {semSelecao
          ? "Selecione páginas na biblioteca (clique, Espaço na caixa, ou Shift+clique para intervalo)."
          : `${quantidade === 1 ? "1 página selecionada" : `${quantidade} páginas selecionadas`} → adicionar como:`}
      </p>
      {/* Grade por largura mínima: a coluna de Arquivos tem 22rem, e cinco
          botões em linha cortavam "Separatriz" e "Pranchas" no meio. */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] gap-1.5">
        {BOTOES.map(({ tipo, rotulo }) => {
          const alvo = destino ? alvoPara(destino, tipo) : null;
          const motivo = !destino
            ? "crie um volume"
            : !alvo
              ? "crie um grupo no volume"
              : semSelecao
                ? "selecione páginas"
                : null;
          const onde = alvo ? descreverAlvo(estado, alvo) : "";
          return (
            <Button
              key={tipo}
              type="button"
              size="sm"
              variant="outline"
              disabled={Boolean(motivo)}
              onClick={() => alvo && onInserir(alvo)}
              aria-label={
                motivo
                  ? `${rotulo}: indisponível — ${motivo}`
                  : `Adicionar ${quantidade === 1 ? "1 página" : `${quantidade} páginas`} como ${rotulo} em ${onde}`
              }
              title={motivo ? `Indisponível: ${motivo}` : `Vai para ${onde}`}
              className="h-8 px-2 text-xs"
            >
              {rotulo}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
