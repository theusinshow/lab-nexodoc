import type { Achado } from "./dados";
import "./etiqueta.css";

const curto = (a: Achado) => a.id.replace("ACH-", "");

/**
 * A ETIQUETA: retângulo reto na cor do nível, o código em branco no meio. Ela
 * carrega o estado — cheia é pendente, vazada (só o contorno, código riscado) é
 * tratada —, então dá para ver de longe o que falta sem ler nada. É a cara do
 * achado em todo o Resultado: na fila, no Resumo, na página e na nota.
 */
export function Etiqueta({ a, aceso = false, curta }: { a: Achado; aceso?: boolean; curta?: boolean }) {
  return (
    <span className={`nd-etq${curta ? " nd-etq--margem" : ""} nd--${a.impacto}${a.desfecho ? " nd-etq--tratada" : ""}${aceso ? " nd-etq--acesa" : ""}`} aria-hidden={curta}>
      {curta ? curto(a) : a.id}
    </span>
  );
}
