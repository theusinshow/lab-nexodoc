import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { diaEmBrasilia } from "@/lib/fuso-de-brasilia";

/*
 * O REGISTRO DE ACESSO (03/10/2026).
 *
 * O login é JWT e a tabela `Session` nunca é escrita: até aqui o banco não sabia
 * quem entrou, quando, nem há quantos dias alguém não usa. `getUserAccess` chama
 * isto em toda página e toda API; a marca vai ao banco no máximo UMA VEZ POR
 * HORA por pessoa — a lembrança fica neste processo (um contêiner só), e perder
 * a lembrança num redeploy custa uma escrita a mais, não um dado errado.
 *
 * NUNCA DERRUBA NADA. É telemetria: falhar aqui não pode virar 500 na página de
 * quem só queria trabalhar. Por isso não é esperado (`void`) e engole o erro com
 * um aviso no log.
 */

const UMA_HORA_MS = 60 * 60 * 1000;
const ultimaMarca = new Map<string, number>();
const ultimaRecusa = new Map<string, number>();

function cedoDemais(mapa: Map<string, number>, chave: string, agora: number): boolean {
  const antes = mapa.get(chave);
  if (antes !== undefined && agora - antes < UMA_HORA_MS) return true;
  mapa.set(chave, agora);
  // O mapa não cresce sem fim: quem ficou uma hora sem marca sai dele.
  if (mapa.size > 2000) for (const [k, v] of mapa) if (agora - v >= UMA_HORA_MS) mapa.delete(k);
  return false;
}

/** Marca o dia de quem tem acesso. Chamado sem `await`. */
export function registrarAcesso(email: string): void {
  if (!email || !isDatabaseConfigured()) return;
  const agora = Date.now();
  if (cedoDemais(ultimaMarca, email, agora)) return;
  const quando = new Date(agora);
  const dia = diaEmBrasilia(quando);
  const falhou = (erro: unknown) => {
    ultimaMarca.delete(email);
    console.warn("[acesso] não gravou o acesso de", email, erro instanceof Error ? erro.message : erro);
  };
  /*
   * O `try` cobre a falha SÍNCRONA, e ela aconteceu (04/10/2026): com um cliente
   * do Prisma gerado antes da tabela, `getPrisma().acessoDiario` era `undefined`
   * e o `.upsert` lançava na hora — fora do `.catch` da promessa, e a página do
   * admin caiu com 500. Telemetria nunca pode fazer isso.
   */
  try {
    void getPrisma()
      .acessoDiario.upsert({
        where: { email_dia: { email, dia } },
        create: { email, dia, primeiro: quando, ultimo: quando },
        update: { ultimo: quando, marcas: { increment: 1 } },
      })
      .catch(falhou);
  } catch (erro) {
    falhou(erro);
  }
}

/** Guarda quem foi barrado, e por quê. Uma linha por pessoa e motivo por hora. Chamado sem `await`. */
export function registrarRecusa(email: string, motivo: string): void {
  if (!email || !isDatabaseConfigured()) return;
  if (cedoDemais(ultimaRecusa, `${email}|${motivo}`, Date.now())) return;
  const falhou = (erro: unknown) => console.warn("[acesso] não gravou a recusa de", email, erro instanceof Error ? erro.message : erro);
  // O mesmo `try` do acesso: a falha síncrona também não pode subir.
  try {
    void getPrisma().recusaDeAcesso.create({ data: { email, motivo } }).catch(falhou);
  } catch (erro) {
    falhou(erro);
  }
}
