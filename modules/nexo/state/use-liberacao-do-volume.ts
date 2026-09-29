"use client";

import { useMemo } from "react";
import { liberacaoDoVolume, type Liberacao } from "../lib/editaveis-no-projeto";
import { useConversation } from "./conversation-store";

/**
 * Se o PDF do volume pode sair agora. UMA fonte para todo lugar que o entrega
 * (link do card, "baixar todos", "remontar e baixar"): uma trava repetida em
 * cada botão é a que um deles esquece.
 */
export function useLiberacaoDoVolume(): Liberacao {
  const { editaveisSalvos, results } = useConversation();
  return useMemo(() => liberacaoDoVolume(editaveisSalvos, results), [editaveisSalvos, results]);
}
