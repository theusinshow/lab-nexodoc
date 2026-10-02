import type { FindingDiscipline } from "@/lib/audit-report";
import { DISCIPLINAS } from "@/lib/nivel-do-achado";

const POR_ID = Object.fromEntries(DISCIPLINAS.map((d) => [d.id, d])) as Record<FindingDiscipline, (typeof DISCIPLINAS)[number]>;

/**
 * O SELO DA DISCIPLINA (veio do lab: resultado-e/disciplina.tsx): um ponto
 * quadrado e a sigla da prancha (ARQ, EST, HID…), na cor da disciplina.
 * Quadrado de propósito: o ponto redondo já é do nível do achado, e os dois
 * aparecem lado a lado. `neutro`: sigla cinza, quando a cor da tela é do nível.
 */
export function SeloDaDisciplina({ disc, nome, neutro }: { disc: FindingDiscipline; nome?: boolean; neutro?: boolean }) {
  const d = POR_ID[disc] ?? POR_ID.geral;
  return (
    <span className={`dc dc--${d.id}${nome ? " dc--nome" : ""}${neutro ? " dc--neutro" : ""}`} title={d.nome}>
      <i />
      {nome ? d.nome : d.sigla}
    </span>
  );
}
