"use client";

/**
 * A SAUDAÇÃO DA ENTRADA — a primeira frase do Nexo numa conversa nova.
 *
 * Ela se escrevia sozinha, letra a letra, com o orbe "falando" junto. Saiu na
 * migração para o sistema novo (02/10/2026): é movimento roteirizado, que
 * segura a tela sem ninguém ter pedido, e a regra do Matheus é movimento só
 * em resposta ao gesto (o orbe é a exceção, e ele continua). A frase chega
 * inteira.
 *
 * Montada num quadro depois da montagem porque a hora é a de Brasília NO
 * NAVEGADOR: no servidor ela sairia com outra hora e a hidratação discordaria.
 * A altura fica reservada para o composer não andar quando ela chega.
 */

import { partesEmBrasilia } from "@/lib/fuso-de-brasilia";
import { useEffect, useState } from "react";

import { montarSaudacao } from "../lib/saudacao";

export function SaudacaoDoNexo({ nome }: { nome?: string | null; onDigitando?: (digitando: boolean) => void }) {
  const [frase, setFrase] = useState<string | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setFrase(montarSaudacao(partesEmBrasilia(new Date()).hora, nome)));
    return () => cancelAnimationFrame(raf);
  }, [nome]);

  return <h2 className="nx-saudacao">{frase ?? ""}</h2>;
}
