import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import { getUserAccess } from "@/lib/access-control";
import { redirectToLogin } from "@/lib/auth-redirect";
import { destinosPara } from "@/lib/navegacao-principal";
import { ACOES_DA_PALETA } from "@/modules/nexo/lib/paleta";

/**
 * AJUDA — glossário e "onde fica" (auditoria UX/UI, G01/G02/G07, 28/09/2026).
 *
 * As listas saem das MESMAS fontes da navegação e da paleta: se um destino ou
 * uma ação mudar de nome, a ajuda muda junto — uma ajuda que descreve um botão
 * que não existe é pior do que ajuda nenhuma.
 */
const GLOSSARIO: { termo: string; id?: string; texto: string }[] = [
  { termo: "Projeto", texto: "A obra. Guarda conversas, auditorias, volumes e arquivos. Cria-se em Projetos, ou nasce dos documentos anexados no Nexo." },
  { termo: "Conversa", texto: "Um trabalho no Nexo: você anexa PDFs e pede o que precisa. “Nova conversa” abre uma; ela entra num projeto quando os documentos dizem qual é." },
  { termo: "Auditoria e parecer", id: "parecer", texto: "A leitura do memorial contra a obra declarada. O parecer lista os achados e sai em PDF pelo botão Exportar, no topo do parecer." },
  { termo: "Achado", texto: "Um problema apontado no parecer, com evidência, página e ação recomendada." },
  { termo: "Validade", texto: "Se o achado está certo: Confirmar achado, Falso positivo ou Gravidade errada. Não diz nada sobre a obra." },
  { termo: "Tratamento", id: "atribuir", texto: "O que foi feito: pendente, com alguém (Selecionar para atribuir › Atribuir a…), correção informada ou decisão técnica com motivo. Atribuir não manda e-mail; “Notificar por e-mail” é separado." },
  { termo: "Link do achado", id: "link", texto: "No detalhe do achado, Mais ações › Copiar link do achado. Quem abre cai no mesmo achado do mesmo parecer." },
  { termo: "Volume", texto: "Um PDF final do pacote. Tem grupos, e cada grupo tem capa, lista de documentos, separatriz, pranchas e anexos." },
  { termo: "Grupo", texto: "Uma parte do volume (por disciplina, por exemplo), com separatriz automática." },
  { termo: "Capa", texto: "A primeira folha do volume ou do grupo." },
  { termo: "Lista de documentos (LD)", texto: "A relação das pranchas do volume, com código e revisão." },
  { termo: "Separatriz", id: "separatriz", texto: "A folha que abre cada grupo. No Nexo é gerada com as pranchas; na montagem manual é automática por grupo." },
  { termo: "Prévia", texto: "O volume montado página a página, antes de exportar — nada é gravado no projeto por ver a prévia." },
  { termo: "Carimbo", id: "carimbo", texto: "Os dados lidos de cada prancha (nº, código, disciplina, revisão). Corrige-se no Nexo: Mapa do volume › folha › corrigir." },
];

export default async function AjudaPage() {
  const session = await auth();
  if (!session?.user) redirectToLogin("/ajuda");
  const access = await getUserAccess(session.user.email, session.user.name);
  if (!access.isActive) redirect("/sem-acesso");

  const ondeFica = ACOES_DA_PALETA.filter((a) => a.grupo === "Onde fica");

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-6 sm:px-7">
      <PageHeader
        navegacao={{ ehAdmin: access.isAdmin }}
        title="Ajuda"
        description="Onde fica cada função e o que cada palavra quer dizer. No Nexo, “Buscar ações” (ou Ctrl+K) procura as mesmas funções pelo nome ou por um sinônimo."
      />

      <section aria-labelledby="destinos" className="space-y-3">
        <h2 id="destinos" className="text-lg font-semibold">Para onde ir</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {destinosPara(access.isAdmin).map((d) => (
            <div key={d.href} className="nx-cut-8 bg-card p-4">
              <dt>
                <Link href={d.href} className="font-medium text-foreground underline-offset-4 hover:underline">
                  {d.rotulo}
                </Link>
              </dt>
              <dd className="mt-1 text-sm leading-6 text-muted-foreground">{d.resumo}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="onde-fica" className="space-y-3">
        <h2 id="onde-fica" className="text-lg font-semibold">Onde fica</h2>
        <ul className="m-0 grid list-none gap-2 p-0">
          {ondeFica.map((a) => (
            <li key={a.id} className="grid gap-0.5 border-b border-border/60 pb-2 sm:grid-cols-[16rem_1fr] sm:gap-4">
              <span className="font-medium text-foreground">{a.rotulo}</span>
              <span className="text-sm leading-6 text-muted-foreground">{a.requisito}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="glossario" className="space-y-3">
        <h2 id="glossario" className="text-lg font-semibold">Glossário</h2>
        <p className="text-sm text-muted-foreground">
          Projeto → Conversas e auditorias → Volumes → Grupos → Documentos e páginas.
        </p>
        <dl className="grid gap-3">
          {GLOSSARIO.map((g) => (
            <div key={g.termo} id={g.id} className="scroll-mt-24">
              <dt className="font-medium text-foreground">{g.termo}</dt>
              <dd className="text-sm leading-6 text-muted-foreground">{g.texto}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
