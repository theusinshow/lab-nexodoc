import { DISCIPLINA, type Disciplina } from "./dados";

/**
 * O SELO DA DISCIPLINA: um ponto quadrado e a sigla da prancha (ARQ, EST,
 * HID…), na cor da disciplina. Quadrado de propósito: o ponto redondo já é
 * do nível do achado, e os dois aparecem lado a lado.
 */
export function SeloDaDisciplina({ disc, nome }: { disc: Disciplina; nome?: boolean }) {
  const d = DISCIPLINA[disc];
  return (
    <span className={`dc dc--${disc}${nome ? " dc--nome" : ""}`} title={d.nome}>
      <i />
      {nome ? d.nome : d.sigla}
    </span>
  );
}
