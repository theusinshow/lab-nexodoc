import { TransicaoDePagina } from "@/components/layout/transicao-de-pagina";

/**
 * Recriado pelo Next a cada troca de seção — é isso que dá à transição de
 * página uma saída e uma entrada. Ver [[transicao-de-pagina.tsx]].
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <TransicaoDePagina>{children}</TransicaoDePagina>;
}
