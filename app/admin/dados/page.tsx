"use client";

import { useCabecaDoAdmin } from "@/components/telas/admin/casca";
import { ExpurgoDeConversas, HistoricoDeAuditorias, OperacaoDeLds } from "@/components/telas/admin/dados";

/*
 * DADOS: o que ficou gravado no servidor. Apagar aqui é permanente — e alcança
 * as máquinas que montaram, não só o banco. O expurgo vem primeiro: é a
 * pergunta que traz alguém aqui ("o que o banco guarda, e como eu limpo
 * isso?"); as duas listas abaixo são consulta.
 */
export default function AdminDadosPage() {
  // cada lista diz de quando são os dados dela; o cabeçalho não afirma uma hora só
  useCabecaDoAdmin({});
  return (
    <>
      <ExpurgoDeConversas />
      <HistoricoDeAuditorias />
      <OperacaoDeLds />
    </>
  );
}
