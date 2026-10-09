/**
 * Preparo comum das sessões de navegador dos portões.
 *
 * O tour guiado se oferece sozinho a quem nunca abriu o produto — e um navegador
 * de automação é, todo dia, alguém que nunca abriu o produto. Sem isto, o
 * primeiro balão cai por cima da tela que o portão veio medir, e a falha aparece
 * como se o recurso testado tivesse quebrado.
 *
 * O portão do PRÓPRIO tour (`shot-tour.mjs`) não usa isto, de propósito: lá o
 * primeiro acesso é o objeto do teste.
 */

/** Marca o tour como já visto ANTES da primeira navegação. */
export async function pularTourGuiado(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("nexo:tour-visto", "1");
    } catch {
      // Sem storage não há tour para pular.
    }
  });
}

/**
 * Sessão sem tela de login, para o build de produção (`next start`), que não
 * tem "Entrar como dev" — e é o único que não recarrega sozinho
 * ([[nexodoc-manifesto-recarrega-dev]]). Assina o mesmo JWT que o login dev
 * assinaria, com o AUTH_SECRET do `.env.local`, para o ator do ambiente.
 */
export async function entrarSemTela(contexto, base) {
  const fs = await import("node:fs");
  const env = Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l))
      .filter(Boolean)
      .map(([, k, v]) => [k, v.replace(/^["']|["']$/g, "")]),
  );
  const email = (process.env.NEXODOC_DEV_AUTH_EMAIL ?? env.NEXODOC_DEV_AUTH_EMAIL ?? "").trim().toLowerCase();
  const secret = process.env.AUTH_SECRET ?? env.AUTH_SECRET;
  if (!email || !secret) throw new Error("Falta NEXODOC_DEV_AUTH_EMAIL ou AUTH_SECRET (.env.local).");
  const { encode } = await import("next-auth/jwt");
  const cookie = "authjs.session-token";
  const name = env.NEXODOC_DEV_AUTH_NAME?.trim() || "Usuário Dev";
  const value = await encode({ salt: cookie, secret, token: { sub: email, email, name } });
  await contexto.addCookies([{ name: cookie, value, url: base, httpOnly: true, sameSite: "Lax" }]);
}
