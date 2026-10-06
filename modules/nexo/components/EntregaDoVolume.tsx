"use client";

/**
 * A ENTREGA (06/10/2026): dois botões lado a lado, na ordem do trabalho, e o
 * passo a passo que se marca sozinho. A trava dos editáveis já existia; agora
 * está ESCRITA na tela, e o teto de 20 MB por tomo entra no mesmo lugar.
 */
import { Circle, CircleCheck, FileDown, FolderDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatarDataHora } from "@/lib/fuso-de-brasilia";
import type { SeloForLd } from "@/server/nexo/build-ld-proposal";

import { formatarMb, rotuloDoTomo } from "../lib/entrega-do-volume";
import { useEntregaDoVolume } from "../state/use-entrega-do-volume";

function Passo({ feito, titulo, nota, alerta }: { feito: boolean; titulo: string; nota?: string | null; alerta?: string | null }) {
  return (
    <li className="flex items-start gap-2 text-xs leading-relaxed">
      {feito ? (
        <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--status-ok)]" aria-label="Feito" />
      ) : (
        <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Pendente" />
      )}
      <span className="grid gap-0.5">
        <span className={feito ? "text-muted-foreground" : "text-foreground"}>{titulo}</span>
        {alerta && <span className="text-[var(--status-warning)]">{alerta}</span>}
        {!alerta && nota && <span className="text-muted-foreground">{nota}</span>}
      </span>
    </li>
  );
}

export function EntregaDoVolume({ selos }: { selos: SeloForLd[] }) {
  const e = useEntregaDoVolume(selos);
  const { passos } = e;
  if (!e.temEditaveis && e.tomos.length === 0) return null;
  const unico = passos.planejados <= 1;
  const volumesRotulo = unico ? "Baixar o volume (PDF)" : `Baixar os ${passos.planejados} volumes (PDF)`;

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-3" data-prova="entrega-do-volume" aria-label="Entrega do volume">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={passos.editaveis.feito ? "secondary" : "default"}
          loading={e.ocupado === "editaveis"}
          disabled={e.ocupado !== null || !e.temEditaveis}
          onClick={() => void e.baixarEditaveisZip()}
        >
          <FolderDown className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {e.ocupado === "editaveis" ? "Gerando os editáveis…" : "Baixar os editáveis (ODT)"}
        </Button>
        <Button
          size="sm"
          variant={passos.editaveis.feito ? "default" : "secondary"}
          loading={e.ocupado === "volumes"}
          disabled={e.ocupado !== null || !passos.volumes.liberado}
          onClick={() => void e.baixarVolumes()}
        >
          <FileDown className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {e.ocupado === "volumes" ? "Juntando os volumes…" : volumesRotulo}
        </Button>
      </div>

      <ol className="flex flex-col gap-1.5">
        <Passo
          feito={passos.editaveis.feito}
          titulo="1. Baixe os editáveis e salve na pasta do projeto no servidor."
          nota={
            passos.editaveis.feito && passos.editaveis.quando
              ? `Baixados em ${formatarDataHora(passos.editaveis.quando)}.`
              : "São eles que a equipe edita depois. Sem eles na pasta, a próxima revisão começa do zero."
          }
          alerta={passos.editaveis.motivo}
        />
        <Passo feito={false} titulo={unico ? "2. Baixe o volume (PDF)." : "2. Baixe os volumes (PDF)."} alerta={passos.volumes.motivo} />
      </ol>

      {passos.acimaDoTeto.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-[var(--status-warning)]" data-prova="acima-do-teto">
          {passos.acimaDoTeto.map((t) => (
            <li key={t.tomo}>
              {rotuloDoTomo(t.tomo, unico)}: {formatarMb(t.bytes ?? 0)} — passa do teto de 20 MB. Divida em tomos ou comprima as imagens antes de entregar.
            </li>
          ))}
        </ul>
      )}

      {e.erro && <p className="text-xs text-[var(--destructive)]">{e.erro}</p>}
    </section>
  );
}
