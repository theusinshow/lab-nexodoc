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
    desde: "hoje, 17:44",
    dias: 0,
    achados: [
      { id: "ACH-001", impacto: "block", disc: "geral", titulo: "Revisão B no carimbo, revisão A na capa", pagina: 1 },
      { id: "ACH-002", impacto: "block", disc: "estrutural", titulo: "Volume de concreto diverge entre memorial e quadro", pagina: 18 },
      { id: "ACH-006", impacto: "note", disc: "geral", titulo: "Numeração de capítulos pula do 6 para o 8", pagina: 27 },
    ],
  },
  {
    id: "c2",
    codigo: "SIM047-26",
    cliente: "Prefeitura Municipal de Criciúma",
    obra: "Quadra poliesportiva coberta do CAIC",
    titulo: "Memorial de cálculo estrutural, rev. B",
    pessoa: "Carla",
    desde: "26/09",
    dias: 5,
    achados: [
      { id: "ACH-011", impacto: "decide", disc: "estrutural", titulo: "Vento calculado pela NBR 6123 sem o fator S3 da cobertura", pagina: 9 },
      { id: "ACH-014", impacto: "block", disc: "estrutural", titulo: "Carga da cobertura metálica diverge entre memória e prancha EST-04", pagina: 22 },
    ],
  },
];

export const QUE_VOCE_PASSOU: Parecer[] = [
  {
    id: "p1",
    codigo: "117-25",
    cliente: "Prefeitura Municipal de Criciúma",
    obra: "Unidade Básica de Saúde da Rua São Francisco de Assis",
    titulo: "Memorial geral, rev. A",
    pessoa: "Carla",
    desde: "hoje, 17:50",
    dias: 0,
    achados: [{ id: "ACH-004", impacto: "decide", disc: "hidrossanitario", titulo: "NBR 5626 citada na edição de 1998; a vigente é de 2020", pagina: 31 }],
  },
  {
    id: "p2",
    codigo: "117-25",
    cliente: "Prefeitura Municipal de Criciúma",
    obra: "Unidade Básica de Saúde da Rua São Francisco de Assis",
    titulo: "Memorial geral, rev. A",
    pessoa: "Rafael",
    desde: "hoje, 17:50",
    dias: 0,
    achados: [{ id: "ACH-003", impacto: "decide", disc: "arquitetura", titulo: "Área coberta de 1.240 m² no texto, 1.180 m² no quadro", pagina: 6 }],
  },
  {
    id: "p3",
    codigo: "117-25",
    cliente: "Prefeitura Municipal de Criciúma",
    obra: "Unidade Básica de Saúde da Rua São Francisco de Assis",
    titulo: "Memorial geral, rev. A",
    pessoa: "Jéssica",
    desde: "hoje, 17:51",
    dias: 0,
    achados: [{ id: "ACH-008", impacto: "texto", disc: "geral", titulo: "Município grafado “Criciuma”, sem acento", pagina: 2 }],
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
