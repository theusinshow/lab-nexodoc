import { redirect } from "next/navigation";

import { Moldura } from "@/components/moldura/moldura";
import { TelaPainel, type AchadoComVoce, type IdTarefa, type TrabalhoParaContinuar } from "@/components/telas/painel/tela-painel";
import { comVoce } from "@/lib/achados-em-aberto";
import { requireActor } from "@/lib/access-control";
import { cidadeDoCliente } from "@/lib/cliente-do-projeto";
import { getPrisma } from "@/lib/db";
import { partesEmBrasilia } from "@/lib/fuso-de-brasilia";
import { carregarMoldura } from "@/lib/moldura";
import { linkDoNexo } from "@/lib/contexto-da-url";
import { resumoDoEscritorio, type DiaDoEscritorio } from "@/lib/resumo-do-escritorio";

/*
 * A RAIZ É O PAINEL, no sistema novo (Início D2 aprovado em 30/09/2026).
 *
 * O que saiu do Painel antigo, por decisão do Matheus em 01/10 ("pode
 * retirar"): Foco, Rascunho, Personalizar, os filtros e as ordens da lista de
 * projetos e a atividade do escritório. O Nexo é aberto para uma tarefa e
 * fechado — não é painel de acompanhamento diário. Obra parada mora em
 * Projetos ("paradas há mais de 20 dias").
 *
 * "Continuar" são as conversas mais recentes de quem lê (as mesmas sete
 * colunas de [[lib/trabalho-recente.ts]], sem abrir o JSON da conversa); "Com
 * você", os achados atribuídos ([[lib/achados-em-aberto.ts]]).
 */

const TAREFAS: IdTarefa[] = ["auditar", "volume", "ld", "conferir"];
const QUANTOS_CONTINUAR = 5;
const QUANTOS_COM_VOCE = 4;

function saudacaoDe(agora: Date) {
  const { hora } = partesEmBrasilia(agora);
  return hora < 5 ? "Boa noite" : hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
}

function primeiroNome(nome: string) {
  const local = nome.includes("@") ? nome.split("@")[0] : nome;
  return local.trim().split(/[\s._-]+/)[0] || nome;
}

export default async function PainelPage({ searchParams }: { searchParams: Promise<{ tarefa?: string }> }) {
  const { tarefa } = await searchParams;
  /*
   * `/?tarefa=` é endereço antigo: a tarefa abria aqui uma área de soltar. Desde
   * 02/10/2026 ela abre o Nexo já preparado para ela — o link segue funcionando.
   */
  if (tarefa && TAREFAS.includes(tarefa as IdTarefa)) {
    redirect(linkDoNexo({ intencao: tarefa === "volume" ? "montar" : (tarefa as "auditar" | "ld" | "conferir") }));
  }
  const dados = await carregarMoldura("/");

  let continuar: TrabalhoParaContinuar[] = [];
  let achados: AchadoComVoce[] = [];
  let totalComVoce = 0;
  let resumo: DiaDoEscritorio[] = [];

  if (!dados.semBanco) {
    const actor = await requireActor();
    const prisma = getPrisma();
    const [conversas, pareceres, serie] = await Promise.all([
      prisma.nexoConversation.findMany({
        where: { userEmail: actor.email },
        orderBy: { updatedAt: "desc" },
        take: QUANTOS_CONTINUAR,
        select: { id: true, title: true, tipo: true, auditoriaPendente: true, updatedAt: true, folderKey: true, project: { select: { code: true, client: true } } },
      }),
      comVoce(actor.email, actor.userId, actor.organizationId),
      resumoDoEscritorio(actor.organizationId),
    ]);

    /*
     * SEM PROJETO, A PASTA (07/10/2026, U24): conversa ainda não endereçada mas
     * já guardada na pasta da obra ("999-26-CRICIUMA") saía "sem obra", e as
     * cinco linhas do Continuar ficavam iguais. A pasta diz código e cidade.
     */
    const daPasta = (pasta: string | null) => {
      const m = /^([A-Z]*\d{2,3}-\d{2})-(.+)$/i.exec(pasta ?? "");
      return m ? { codigo: m[1], cidade: m[2].replace(/-/g, " ") } : null;
    };
    continuar = conversas.map((c) => ({
      conversaId: c.id,
      codigo: c.project?.code ?? daPasta(c.folderKey)?.codigo ?? null,
      cliente: c.project ? cidadeDoCliente(c.project.client) || c.project.client : (daPasta(c.folderKey)?.cidade ?? ""),
      trabalho: c.title || "Conversa sem título",
      estado: c.auditoriaPendente ? "auditoria em curso" : c.tipo === "auditoria" ? "auditoria" : c.tipo === "volume" ? "volume" : "conversa",
      tom: c.auditoriaPendente ? "decide" : null,
      quando: c.updatedAt.toISOString(),
    }));

    totalComVoce = pareceres.reduce((n, p) => n + p.achados.length, 0);
    achados = pareceres
      .flatMap((p) =>
        p.achados.map((a) => ({
          auditId: p.auditId,
          findingId: a.id,
          chave: `${p.chave}:${a.id}`,
          titulo: a.titulo,
          codigo: p.codigo,
          nivel: a.nivel,
          pagina: a.pagina,
          de: p.pessoa,
        })),
      )
      // o que impede a entrega primeiro
      .sort((a, b) => Number(b.nivel === "block") - Number(a.nivel === "block"))
      .slice(0, QUANTOS_COM_VOCE);
    resumo = serie;
  }

  return (
    <Moldura dados={dados} atual="Painel" buscaPropria>
      <TelaPainel
        nome={primeiroNome(dados.usuario.nome)}
        saudacao={saudacaoDe(new Date())}
        tarefaInicial={null}
        obras={dados.obras}
        recentes={dados.recentes}
        continuar={continuar}
        comVoce={achados}
        totalComVoce={totalComVoce}
        resumo={resumo}
      />
    </Moldura>
  );
}
