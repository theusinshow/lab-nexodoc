import { DISCIPLINA, type Disciplina } from "./dados";

/**
 * O SELO DA DISCIPLINA: um ponto quadrado e a sigla da prancha (ARQ, EST,
 * HID…), na cor da disciplina. Quadrado de propósito: o ponto redondo já é
 * do nível do achado, e os dois aparecem lado a lado.
 */
/** neutro: sigla cinza, para quando a cor da tela é do nível (a cor segue o agrupamento). */
export function SeloDaDisciplina({ disc, nome, neutro }: { disc: Disciplina; nome?: boolean; neutro?: boolean }) {
  const d = DISCIPLINA[disc];
  return (
    <span className={`dc dc--${disc}${nome ? " dc--nome" : ""}${neutro ? " dc--neutro" : ""}`} title={d.nome}>
      <i />
      {nome ? d.nome : d.sigla}
    </span>
  );
}
