"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaResultado, type SituacaoRes } from "../resultado-e/tela-resultado";

const SITUACOES: { id: SituacaoRes; nome: string; dica: string }[] = [
  { id: "documento", nome: "Páginas com achados", dica: "Uma coluna por página: a miniatura com os trechos marcados na cor do nível e, embaixo, os achados dela. Passe o mouse num cartão ou numa marca: o par acende. Clicar na página abre o memorial ali." },
  { id: "doc-mudas", nome: "Páginas não lidas", dica: "Todas as 42: as páginas só com desenho aparecem hachuradas, e o aviso oferece Transcrever e auditar." },
  { id: "doc-remoto", nome: "PDF em outra máquina", dica: "A auditoria foi feita noutro computador: os achados estão aqui, as páginas não. Baixar do servidor traz o arquivo." },
];

export function VitrineDoDocumento() {
  return <Vitrine telaId="documento" situacoes={SITUACOES} render={(s) => <TelaResultado key={s} situacao={s} />} />;
}
