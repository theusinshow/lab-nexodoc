"use client";

import { useCabecaDoAdmin } from "@/components/telas/admin/casca";
import { ProjetosDoAdmin } from "@/components/telas/admin/projetos";

/** PROJETOS: o que cada projeto guarda, e como apagar um item ou o projeto inteiro. */
export default function AdminProjetosPage() {
  useCabecaDoAdmin({});
  return <ProjetosDoAdmin />;
}
