/**
 * OS ACHADOS EM ABERTO, como a página /achados junta hoje (pendenciasDe e
 * enviadosPor): por parecer, o que está com você e quem mandou; e o que você
 * passou a alguém, por pessoa. Os achados da 117-25 são os mesmos do
 * Resultado, para as telas contarem a mesma história.
 */
import type { Disciplina, Impacto } from "../resultado-e/dados";

export interface AchadoAberto {
  id: string;
  impacto: Impacto;
  disc: Disciplina;
  titulo: string;
  pagina: number;
}

export interface Parecer {
  id: string;
  codigo: string;
  cliente: string;
  obra: string;
  titulo: string;
  /** Quem mandou para você, ou para quem você mandou. */
  pessoa: string;
  desde: string;
  dias: number;
  achados: AchadoAberto[];
}

export const COM_VOCE: Parecer[] = [
  {
    id: "c1",
    codigo: "117-25",
    cliente: "Prefeitura Municipal de Criciúma",
    obra: "Unidade Básica de Saúde da Rua São Francisco de Assis",
    titulo: "Memorial geral, rev. A",
    pessoa: "Nexo, na sua auditoria",
    desde: "hoje, 21:13",
    dias: 0,
    achados: [
      { id: "ACH-001", impacto: "block", disc: "geral", titulo: "Revisão B no carimbo, revisão A na capa", pagina: 1 },
      { id: "ACH-002", impacto: "block", disc: "geral", titulo: "O memorial cita a prancha ARQ-07, que não está na lista de documentos", pagina: 6 },
    ],
  },
  {
    id: "c2",
    codigo: "SIM047-26",
    cliente: "Prefeitura Municipal de Criciúma",
    obra: "Quadra poliesportiva coberta do CAIC",
    titulo: "Memorial descritivo, rev. B",
    pessoa: "Carla",
    desde: "26/09",
    dias: 5,
    achados: [
      { id: "ACH-002", impacto: "block", disc: "arquitetura", titulo: "Rampa de acesso com 12% de inclinação; a NBR 9050 pede até 8,33%", pagina: 7 },
      { id: "ACH-007", impacto: "decide", disc: "arquitetura", titulo: "Memorial cita 4 vestiários, a planta mostra 3", pagina: 12 },
    ],
  },
];

export const QUE_VOCE_PASSOU: Parecer[] = [
  {
    id: "p2",
    codigo: "117-25",
    cliente: "Prefeitura Municipal de Criciúma",
    obra: "Unidade Básica de Saúde da Rua São Francisco de Assis",
    titulo: "Memorial geral, rev. A",
    pessoa: "Rafael",
    desde: "hoje, 21:20",
    dias: 0,
    achados: [{ id: "ACH-003", impacto: "decide", disc: "arquitetura", titulo: "Área coberta de 1.240 m² no texto, 1.180 m² no quadro", pagina: 9 }],
  },
  {
    id: "p3",
    codigo: "117-25",
    cliente: "Prefeitura Municipal de Criciúma",
    obra: "Unidade Básica de Saúde da Rua São Francisco de Assis",
    titulo: "Memorial geral, rev. A",
    pessoa: "Jéssica",
    desde: "hoje, 21:21",
    dias: 0,
    achados: [{ id: "ACH-008", impacto: "texto", disc: "geral", titulo: "Município grafado “Criciuma”, sem acento", pagina: 31 }],
  },
  {
    id: "p4",
    codigo: "SIM031-26",
    cliente: "Prefeitura Municipal de Tubarão",
    obra: "Muro de contenção da Rua Anita Garibaldi",
    titulo: "Memorial de cálculo, rev. A",
    pessoa: "Carla",
    desde: "22/09",
    dias: 9,
    achados: [{ id: "ACH-006", impacto: "decide", disc: "estrutural", titulo: "Empuxo calculado sem a sobrecarga da via, citada no cap. 3", pagina: 14 }],
  },
];
