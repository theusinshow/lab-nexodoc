import type { Metadata } from "next";

import "@/components/telas/nexo/pele-do-nexo.css";

export const metadata: Metadata = {
  title: "Nexo",
  description: "Assistente que produz LD, capas, separatrizes, volume e auditoria",
};

/*
 * O NEXO NO SISTEMA NOVO (migração, passo 5). A moldura (Topo, avisos, aviso
 * de tela pequena) vem da página, que é quem carrega os dados dela; aqui fica
 * só a pele: o tema antigo remapeado para o ds enquanto as peças internas
 * não são redesenhadas uma a uma. O `AppShell` saiu — era fundo, cor e altura,
 * e a moldura faz os três.
 */
export default function NexoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
