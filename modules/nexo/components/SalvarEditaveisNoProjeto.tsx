"use client";

/**
 * PASSO 2 DO VOLUME: baixar capa, LD e separatriz (ODT) num ZIP.
 *
 * É o que destrava o PDF do volume. O editável é o que se conserta à mão no
 * LibreOffice; se ele não sai do navegador, some com o navegador que o gerou.
 * O usuário move o ZIP para a pasta do projeto ele mesmo — gravar direto na
 * pasta (seletor do Chrome) saiu em 30/09: pedia permissão de editar arquivos
 * e esbarrava em disco de rede.
 */

import { useState } from "react";
import { FolderDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SeloForLd } from "@/server/nexo/build-ld-proposal";
import { useConversation } from "../state/conversation-store";
import { useLiberacaoDoVolume } from "../state/use-liberacao-do-volume";
import { baixarEditaveis } from "../lib/editaveis";
import { nomesDosEditaveis } from "../lib/nome-do-volume";
import { gerarEditaveisConsolidados, parametrosDaEntrega } from "../lib/editaveis-consolidados";
import { assinaturaDosDocumentos } from "../lib/editaveis-no-projeto";
import { formatarDataHora } from "@/lib/fuso-de-brasilia";

export function SalvarEditaveisNoProjeto({ selos }: { selos: SeloForLd[] }) {
  const { results, identidade, editaveisSalvos, registrarEditaveisSalvos } = useConversation();
  const liberacao = useLiberacaoDoVolume();

  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  /**
   * SÓ os três consolidados, com os nomes do escritório (30/09/2026):
   * `138_26_editaveis.zip` com `138_26_est_met_capas/ld/separatriz.odt`. Os
   * por-tomo ficaram de fora — eram a maioria dos arquivos e ninguém os usava.
   */
  async function baixarZip() {
    setErro(null);
    try {
      const assinatura = assinaturaDosDocumentos(results);
      setOcupado("Gerando os editáveis…");
      const nomes = nomesDosEditaveis(selos, identidade ?? {});
      const { editaveis: todos, falhas } = await gerarEditaveisConsolidados({
        selos,
        nomes,
        params: parametrosDaEntrega(results),
        identidade,
      });
      // Liberar com um editável faltando é liberar o volume que perde a capa
      // editável — exatamente o que a trava existe para impedir.
      if (falhas.length > 0) {
        throw new Error(`Não deu para gerar: ${falhas.join("; ")}. O ZIP não saiu.`);
      }
      await baixarEditaveis(todos, nomes.zip);
      registrarEditaveisSalvos({
        pasta: "",
        quando: Date.now(),
        modo: "zip",
        arquivos: todos.map((e) => e.nome),
        assinatura,
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao juntar os editáveis.");
    } finally {
      setOcupado(null);
    }
  }

  const salvoAgora = editaveisSalvos && liberacao.liberado;

  return (
    <div className="flex flex-col gap-2" data-prova="salvar-editaveis">
      <p className="text-xs text-muted-foreground">
        Antes de baixar o volume, baixe a capa, a LD e a separatriz editáveis (ODT) e
        coloque-as na pasta do projeto.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={salvoAgora ? "secondary" : "default"}
          loading={ocupado !== null}
          onClick={() => void baixarZip()}
        >
          <FolderDown className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {ocupado ?? "Baixar os editáveis (ZIP)"}
        </Button>
      </div>

      {salvoAgora && editaveisSalvos && (
        <p className="text-xs text-[var(--status-ok)]" data-prova="editaveis-salvos">
          {editaveisSalvos.modo === "pasta"
            ? `Salvos em “${editaveisSalvos.pasta}” em ${formatarDataHora(editaveisSalvos.quando)}.`
            : `Baixados em ZIP em ${formatarDataHora(editaveisSalvos.quando)} — confira se foram para a pasta do projeto.`}
        </p>
      )}
      {!salvoAgora && editaveisSalvos && liberacao.motivo && (
        <p className="text-xs text-[var(--status-warning)]">{liberacao.motivo}</p>
      )}

      {erro && <p className="text-xs text-[var(--destructive)]">{erro}</p>}
    </div>
  );
}
