"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaResultado, type SituacaoRes } from "../resultado-e/tela-resultado";

const SITUACOES: { id: SituacaoRes; nome: string; dica: string }[] = [
  { id: "documento", nome: "Páginas com achados", dica: "A etiqueta reta na cor do nível: cheia é pendente, vazada e riscada é tratada. J e K percorrem os achados na ordem de leitura, C corrige ali mesmo (a etiqueta esvazia), Enter abre no memorial, F leva à fila. A legenda é o filtro: clique num nível para esconder." },
  { id: "doc-mudas", nome: "Páginas não lidas", dica: "Todas as 42: as páginas só com desenho aparecem hachuradas, e o aviso oferece Transcrever e auditar." },
  { id: "doc-remoto", nome: "PDF em outra máquina", dica: "A auditoria foi feita noutro computador: os achados estão aqui, as páginas não. Baixar do servidor traz o arquivo." },
];

export function VitrineDoDocumento() {
  return <Vitrine telaId="documento" situacoes={SITUACOES} render={(s) => <TelaResultado key={s} situacao={s} />} />;
}
