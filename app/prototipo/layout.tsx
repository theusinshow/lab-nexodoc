import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { getUserAccess } from "@/lib/access-control";
import { geist, geistMono } from "@/lib/ds/fontes";

import "../ds.css";

/*
 * O PROTÓTIPO NAVEGÁVEL: as telas aprovadas do lab num app só, sem a moldura
 * do laboratório. Nada aqui fala com servidor. A mesma guarda do lab: livre em
 * dev, só admin em produção, e 404 para os outros.
 */

export const metadata: Metadata = { title: "Protótipo — Nexo" };

export default async function LayoutDoPrototipo({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    const session = await auth();
    if (!session?.user) notFound();
    const access = await getUserAccess(session.user.email, session.user.name);
    if (!access.isActive || !access.isAdmin) notFound();
  }
  return <div className={`ds ${geist.variable} ${geistMono.variable}`}>{children}</div>;
}
