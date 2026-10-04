import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { getUserAccess } from "@/lib/access-control";

import "../ds.css";
import "./lab.css";
import { ProvedorDoLab } from "./_lab/contexto";
import { NavegacaoDoLab } from "./_lab/navegacao";

/*
 * O LABORATÓRIO do redesenho: onde cada fundamento, componente, micro-interação
 * e tela do sistema novo é mostrado, exercitado e aprovado antes de migrar.
 *
 * Aberto em desenvolvimento; em produção, só para admin, e com `notFound()` para
 * os outros — um 404 não anuncia que existe algo aqui (mesmo cuidado da
 * bancada do orbe).
 *
 * A FONTE NOVA carrega só aqui, por enquanto. O resto do app segue no IBM Plex
 * até a migração chegar nele.
 */

const geist = Geist({ subsets: ["latin"], variable: "--font-ds-sans", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-ds-mono", display: "swap" });

export const metadata: Metadata = { title: "Laboratório — Nexo" };

export default async function LayoutDoLab({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    const session = await auth();
    if (!session?.user) notFound();
    const access = await getUserAccess(session.user.email, session.user.name);
    if (!access.isActive || !access.isAdmin) notFound();
  }

  return (
    <div className={`ds lab ${geist.variable} ${geistMono.variable}`}>
      <ProvedorDoLab>
        <NavegacaoDoLab />
        <main className="lab-main">{children}</main>
      </ProvedorDoLab>
    </div>
  );
}
