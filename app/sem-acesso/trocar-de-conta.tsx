"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Botao } from "@/components/ds/basicos";

/* Sair e voltar ao login: é o caminho de quem entrou com a conta errada. */
export function TrocarDeConta() {
  return (
    <Botao variante="quiet" tamanho="sm" onClick={() => void signOut({ redirectTo: "/login" })}>
      <LogOut size={14} strokeWidth={1.75} aria-hidden />
      Entrar com outra conta
    </Botao>
  );
}
