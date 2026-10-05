import { TransicaoDePagina } from "@/components/layout/transicao-de-pagina";

/**
 * Recriado a cada troca de destino do admin (Cockpit, Dinheiro, Motor…): o
 * cabeçalho e o trilho, que são do layout, ficam; só o destino sai e entra.
 * Ver [[transicao-de-pagina.tsx]].
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <TransicaoDePagina>{children}</TransicaoDePagina>;
}
