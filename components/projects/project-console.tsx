"use client";

import { formatarEmBrasilia } from "@/lib/fuso-de-brasilia";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Database, FolderKanban, Loader2, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Ima } from "@/components/ambiente/ima";
import { MarcaDaPrefeitura } from "@/modules/nexo/components/MarcaDaPrefeitura";
import { rotuloDeProjeto } from "@/lib/rotulos-de-status";
import { plural } from "@/lib/plural";
import { cidadeDoCliente } from "@/lib/cliente-do-projeto";

export type ProjectConsoleItem = {
  id: string;
  code: string;
  name: string;
  client: string;
  description: string;
  status: string;
  updatedAt: string;
  counts: {
    documents: number;
    uploads: number;
    artifacts: number;
    events: number;
  };
  /** Achados atribuídos e ainda abertos neste projeto (P01: o que espera). */
  pendentes?: number;
  /** Desses, quantos estão com quem lê. */
  comVoce?: number;
};

type SituacaoDoProjeto = "ativos" | "arquivados" | "todos";
type OrdemDosProjetos = "atividade" | "codigo";

type FormState = {
  code: string;
  name: string;
  client: string;
  description: string;
};

const initialForm: FormState = {
  code: "",
  name: "",
  client: "",
  description: "",
};

export function ProjectConsole({ initialProjects }: { initialProjects: ProjectConsoleItem[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState("");
  /*
   * P01 (28/09/2026): a lista vem primeiro e o cadastro é uma AÇÃO ("Novo
   * projeto"), não uma coluna fixa ao lado. Arquivados não somem: têm filtro
   * visível com contagem.
   */
  const [situacao, setSituacao] = useState<SituacaoDoProjeto>("ativos");
  const [ordem, setOrdem] = useState<OrdemDosProjetos>("atividade");
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const arquivado = (p: ProjectConsoleItem) => p.status === "ARCHIVED";
  const contagem = {
    ativos: projects.filter((p) => !arquivado(p)).length,
    arquivados: projects.filter(arquivado).length,
    todos: projects.length,
  };
  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    const porSituacao = projects.filter((p) =>
      situacao === "todos" ? true : situacao === "arquivados" ? p.status === "ARCHIVED" : p.status !== "ARCHIVED",
    );
    const porTexto = normalizedQuery
      ? porSituacao.filter((project) =>
          [project.code, project.name, project.client, project.description]
            .join(" ")
            .toLocaleLowerCase("pt-BR")
            .includes(normalizedQuery),
        )
      : porSituacao;
    return [...porTexto].sort((a, b) =>
      ordem === "codigo"
        ? a.code.localeCompare(b.code, "pt-BR", { numeric: true })
        : // Quem tem achado com você vem primeiro; depois, a atividade mais recente.
          (b.comVoce ?? 0) - (a.comVoce ?? 0) || b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [projects, query, situacao, ordem]);

  async function handleCreateProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      client: form.client.trim(),
      description: form.description.trim(),
    };

    if (!payload.code || !payload.name) {
      setError("Informe código e nome do projeto.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json().catch(() => null)) as
          | { project?: { id: string }; error?: string }
          | null;

        if (!response.ok || !data?.project) {
          throw new Error(data?.error ?? "Não foi possível criar o projeto.");
        }

        setForm(initialForm);
        router.push(`/projetos/${data.project.id}`);
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "Não foi possível criar o projeto.");
      }
    });
  }

  function updateForm(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3" data-organizar-projetos>
        <div className="relative min-w-[14rem] flex-1 sm:max-w-[340px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por código, nome, cliente ou observação"
            aria-label="Buscar projeto"
            className="pl-9"
          />
        </div>
        <div role="group" aria-label="Situação do projeto" className="flex flex-wrap gap-1">
          {(
            [
              ["ativos", "Ativos"],
              ["arquivados", "Arquivados"],
              ["todos", "Todos"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={situacao === valor}
              data-filtro-projeto={valor}
              onClick={() => setSituacao(valor)}
              className={
                situacao === valor
                  ? "nx-cut-6 bg-card px-2.5 py-1 font-mono text-[11px] text-foreground ring-1 ring-[var(--ring)]"
                  : "nx-cut-6 px-2.5 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
              }
            >
              {rotulo} ({contagem[valor]})
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Ordem
          <select
            value={ordem}
            onChange={(event) => setOrdem(event.target.value as OrdemDosProjetos)}
            className="h-9 rounded-sm border bg-transparent px-2 text-xs normal-case tracking-normal text-foreground"
          >
            <option value="atividade">com você e mais recentes</option>
            <option value="codigo">por código</option>
          </select>
        </label>
        <span className="font-mono text-xs text-muted-foreground" aria-live="polite">
          {filteredProjects.length} de {plural(projects.length, "projeto", "projetos")}
        </span>
        <Button
          type="button"
          size="sm"
          variant={criando ? "secondary" : "default"}
          className="ml-auto"
          aria-expanded={criando}
          onClick={() => setCriando((v) => !v)}
        >
          <Plus className="size-4" />
          {criando ? "Fechar o cadastro" : "Novo projeto"}
        </Button>
      </div>

      {criando ? (
      <Card className="max-w-xl">
        <CardContent className="space-y-5 py-5">
          <div>
            <h2 className="text-base font-semibold">Novo projeto</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie o dossiê para vincular auditoria, LD, capas e volumes ao mesmo registro.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleCreateProject}>
            <div className="space-y-2">
              <Label htmlFor="project-code">Código</Label>
              <Input
                id="project-code"
                value={form.code}
                onChange={(event) => updateForm("code", event.target.value.toLocaleUpperCase("pt-BR"))}
                placeholder="EX: 2026-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-name">Nome</Label>
              <Input
                id="project-name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="Nome do projeto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-client">Cliente</Label>
              <Input
                id="project-client"
                value={form.client}
                onChange={(event) => updateForm("client", event.target.value)}
                placeholder="Órgão, prefeitura ou contratante"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Observações</Label>
              <Textarea
                id="project-description"
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                rows={4}
                placeholder="Escopo, fase, lote ou detalhes operacionais"
              />
            </div>

            {error ? (
              <p className="border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {/* O segundo (e último) controle com ímã no produto. `w-full` sobe
                para o invólucro, senão o botão perde a largura ao ganhar um pai
                `inline-flex`. */}
            <Ima className="w-full">
              <Button className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Criar projeto
              </Button>
            </Ima>
          </form>
        </CardContent>
      </Card>
      ) : null}

      <section className="space-y-4">

        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 py-6">
              <Database className="size-5 text-muted-foreground" />
              <div>
                <h2 className="text-base font-semibold">Nenhum projeto encontrado</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {situacao === "ativos" && contagem.arquivados > 0
                    ? `Há ${plural(contagem.arquivados, "projeto arquivado", "projetos arquivados")} — veja em Arquivados.`
                    : "Ajuste a busca ou crie um projeto em “Novo projeto”."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="transition-all duration-[var(--duration-fast)] ease-[var(--ease-feedback)] hover:border-[var(--ring)]/40"
              >
                <CardContent className="space-y-4 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="size-4 shrink-0 text-primary" />
                        {/* O `truncate` saiu: o nome da obra é a identidade do
                            cartão, e ele cortava com a coluna vazia ao lado.
                            Duas linhas custam menos do que "Cancha d…". */}
                        <h2 className="text-lg font-semibold leading-snug">{project.name}</h2>
                      </div>
                      {/*
                        PAGA UMA DÍVIDA ANTES DE DECORAR. O cartão tem `client`
                        no dado e FILTRA por ele na busca — mas não o mostrava:
                        quem procurava por "criciuma" recebia uma lista que não
                        explicava por que aqueles projetos vieram.

                        O SELO vem junto porque o cartão é superfície larga, e
                        porque a marca só ganha o direito de existir ao lado do
                        valor que a origina. Sem cliente cadastrado, ela fica
                        cinza — e a linha continua com o código, que é o que
                        sempre existe.
                      */}
                      <p className="mt-1 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        <MarcaDaPrefeitura prefeitura={project.client} forma="selo" />
                        <span className="min-w-0 truncate">
                          {project.client ? `${project.code} · ${cidadeDoCliente(project.client)}` : project.code}
                        </span>
                      </p>
                    </div>
                    <Badge variant="outline">{rotuloDeProjeto(project.status)}</Badge>
                  </div>

                  {/*
                    ERAM QUATRO CARTÕES DENTRO DO CARTÃO, e os quatro em zero.

                    Cartão aninhado é sempre o desenho errado, e aqui o preço era
                    concreto: as quatro células com borda própria ocupavam o
                    melhor terço do cartão para dizer "nada aconteceu ainda" —
                    quatro vezes, com moldura, em toda obra recém-criada.

                    Agora é uma linha, e ela só existe quando existe o que
                    contar. Projeto vazio simplesmente não a mostra, que é a
                    verdade dita em menos espaço.
                  */}
                  {project.pendentes ? (
                    <p className="text-sm text-foreground" data-pendencias-do-projeto>
                      {plural(project.pendentes, "achado aberto", "achados abertos")}
                      {project.comVoce ? (
                        <span className="text-[var(--status-warning)]"> · {project.comVoce} com você</span>
                      ) : null}
                    </p>
                  ) : null}
                  {resumoDoProjeto(project.counts) ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      {resumoDoProjeto(project.counts)}
                    </p>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      Atualizado em {formatDate(project.updatedAt)}
                    </span>
                    <Button asChild size="sm">
                      <Link href={`/projetos/${project.id}`}>
                        Retomar
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * O que a obra já acumulou, numa linha — e nada quando não acumulou nada.
 *
 * Substitui os quatro cartões aninhados. Zero não vira "0": some. A ausência é
 * a informação, e ela não precisa de moldura para ser dita.
 */
function resumoDoProjeto(counts: ProjectConsoleItem["counts"]): string {
  const partes = [
    counts.documents ? plural(counts.documents, "documento", "documentos") : "",
    counts.uploads ? plural(counts.uploads, "arquivo", "arquivos") : "",
    counts.artifacts ? plural(counts.artifacts, "artefato", "artefatos") : "",
    counts.events ? plural(counts.events, "evento", "eventos") : "",
  ].filter(Boolean);

  return partes.join(" · ");
}

function formatDate(value: string) {
  return formatarEmBrasilia(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
