"use client";

import { Vitrine } from "../../_lab/vitrine";
import { TelaResultado, type SituacaoRes } from "../resultado-e/tela-resultado";

const SITUACOES: { id: SituacaoRes; nome: string; dica: string }[] = [
  { id: "documento", nome: "A. Etiqueta", dica: "Retângulo reto na cor do nível, com o código em branco: na margem da página, na altura do trecho, e ao lado de cada nota. Passe o mouse numa nota: a etiqueta dela e a da página ganham um contorno." },
  { id: "doc-numero", nome: "B. Só número", dica: "Nenhuma forma: o número do achado em mono, na cor do nível, na margem e na nota. O trecho ganha sublinhado em vez de grifo." },
  { id: "doc-regua", nome: "C. Barra de revisão", dica: "A régua vertical na margem esquerda, como a prancha marca o que mudou; na nota, um quadrado na cor do nível. Sem número: o par se acha pelo mouse." },
  { id: "doc-mudas", nome: "Páginas não lidas", dica: "Todas as 42: as páginas só com desenho aparecem hachuradas, e o aviso oferece Transcrever e auditar." },
  { id: "doc-remoto", nome: "PDF em outra máquina", dica: "A auditoria foi feita noutro computador: os achados estão aqui, as páginas não. Baixar do servidor traz o arquivo." },
];

export function VitrineDoDocumento() {
  return <Vitrine telaId="documento" situacoes={SITUACOES} render={(s) => <TelaResultado key={s} situacao={s} />} />;
}
