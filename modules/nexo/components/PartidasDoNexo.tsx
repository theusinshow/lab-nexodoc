"use client";

/**
 * OS TRÊS COMEÇOS, logo abaixo da saudação.
 *
 * A saudação NOMEIA as portas ("montar ou auditar?"); estes chips as ABREM. É a
 * diferença entre quem sabe o que quer e quem sabe como pedir — e ela some
 * depois da primeira conversa, que é quando a pessoa já aprendeu o vocabulário.
 *
 * O CHIP ESCREVE, NÃO ENVIA. Enviar direto gastaria uma volta de modelo para o
 * agente responder "anexe as pranchas" na metade dos casos, e o primeiro
 * contato com um produto que cobra por volta não pode ser uma cobrança que não
 * levou a nada. Escrito no composer, o pedido fica a um Enter — e visível, que
 * é como se aprende a frase.
 *
 * E QUANDO FALTA O INSUMO, ele também abre o seletor de arquivos: "audita o
 * memorial" numa conversa sem memorial é a frase certa sem nada a que ela se
 * aplique. O gesto seguinte é sempre anexar, então ele vem junto.
 */

import { PARTIDAS, faltaInsumo } from "../lib/partidas";
import { useComposer } from "../state/composer-controller";

export function PartidasDoNexo({
  temPranchas,
  temMemorial,
  onAnexar,
  ativa = null,
  onEscolher,
}: {
  temPranchas: boolean;
  temMemorial: boolean;
  /** Abre o seletor de arquivos — chamado só quando falta o insumo da partida. */
  onAnexar?: () => void;
  /** A tarefa da tela, marcada. */
  ativa?: string | null;
  /** Escolher um atalho prepara a tela para ele. */
  onEscolher?: (id: string) => void;
}) {
  const composer = useComposer();

  /* Os atalhos da conversa nova (Conversa v2): escrevem o pedido no campo; Enter envia. */
  return (
    <div data-partidas className="cx-atalhos">
      {PARTIDAS.map((partida) => {
        const falta = faltaInsumo(partida, { pranchas: temPranchas, memorial: temMemorial });
        return (
          <button
            key={partida.id}
            type="button"
            data-partida={partida.id}
            aria-pressed={ativa === partida.id}
            title={
              falta
                ? `Escreve o pedido e abre o seletor — falta ${partida.precisa === "pranchas" ? "anexar as pranchas" : "anexar o memorial"}.`
                : "Escreve o pedido no campo abaixo. Enter envia."
            }
            onClick={() => {
              // Sem o memorial ainda, a leitura dele já trará "Auditar o memorial": só abre o seletor.
              if (!(falta && partida.precisa === "memorial")) composer.fill(partida.frase);
              onEscolher?.(partida.id);
              if (falta) onAnexar?.();
            }}
          >
            {partida.rotulo}
          </button>
        );
      })}
    </div>
  );
}
