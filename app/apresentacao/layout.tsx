import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import "@/app/ds.css";

/**
 * O DECK FALA A LÍNGUA DO SISTEMA NOVO. Desde 02/10/2026 a apresentação usa os
 * tokens `--ds-*`, a Geist e as peças de `components/ds` — as mesmas do
 * redesenho aprovado no /lab. O deck é a vitrine do produto: se ele parecer de
 * outro sistema, a sala vê dois produtos.
 *
 * As famílias moram aqui (e não no layout raiz) pelo mesmo motivo do /lab: a
 * Geist só carrega onde o sistema novo já vale. A classe `ds` fica na raiz do
 * palco, não neste invólucro: é ela que liga as regras de base e precisa
 * anular o `zoom` de tela grande do ds.css (ver palco.css).
 */
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-ds-sans",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-ds-mono",
  display: "swap",
});

export default function LayoutDaApresentacao({
  children,
}: {
  children: ReactNode;
}) {
  return <div className={`${geist.variable} ${geistMono.variable}`}>{children}</div>;
}
