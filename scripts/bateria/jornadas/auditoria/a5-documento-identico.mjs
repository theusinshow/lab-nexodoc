// A5 — auditar o memorial até COMPLETED e auditar de novo o MESMO arquivo.
// Esperado (catálogo): recusa "O documento é idêntico…" legível, e nenhuma
// auditoria nova no banco. Desde 02/10/2026 a recusa não é erro no cartão: o
// pedido reabre o parecer anterior no palco, com o aviso "Nada mudou desde a
// última auditoria" no meio da tela.
//
// A base só serve se a primeira rodada saiu limpa (sem passada incompleta, sem
// folha muda pendente — lib/elegibilidade-da-base.ts). Por isso o memorial curto
// e a verificação da primeira rodada antes do gesto: sem ela, "não recusou"
// seria indistinguível de "a base não servia".
export default {
  id: "a5",
  area: "auditoria",
  titulo: "documento idêntico: reabre o parecer anterior com aviso e nenhuma auditoria nova no banco",
  async rodar(ctx) {
    await ctx.login();
    const f = await ctx.fixtures();

    await ctx.abrirCartaoDeAuditoria(f.memorialCurto);
    await ctx.auditarNoCartao();
    await ctx.esperarParecer(1);
    await ctx.page.waitForTimeout(1500);

    const id = await ctx.conversaAberta();
    const primeira = await ctx.auditoriasDaConversa(id);
    ctx.verificar(
      "a primeira rodada saiu COMPLETED e sem passada incompleta (base que serve)",
      primeira.linhas.length === 1 &&
        primeira.linhas[0].status === "COMPLETED" &&
        (primeira.linhas[0].passadas ?? []).length === 0,
      JSON.stringify(primeira.linhas),
    );

    await (await ctx.esperarBotao(/^Auditar de novo$/, 30_000)).click();
    await ctx.auditarNoCartao();

    const recusa = ctx.page.getByText(/O documento é idêntico ao que foi auditado em \d{2}\/\d{2}\. Não há o que auditar\./);
    await recusa.first().waitFor({ timeout: 120_000 }).catch(() => {});
    ctx.verificar("a recusa aparece, visível de verdade", await ctx.visivelRolando(recusa), `contagem=${await recusa.count()}`);
    const aviso = ctx.page.getByRole("dialog", { name: "Nada mudou desde a última auditoria" });
    ctx.verificar("o aviso de que nada mudou está no palco", (await aviso.count()) === 1, `avisos=${await aviso.count()}`);
    await aviso.getByRole("button", { name: /^Ver o parecer$/ }).click();
    ctx.verificar("Ver o parecer fecha o aviso", (await aviso.count()) === 0, `avisos=${await aviso.count()}`);

    await ctx.page.waitForTimeout(2000);
    const conversa = await ctx.lerConversa(id);
    ctx.verificar("o bilhete da tentativa recusada não ficou no disco", !conversa?.auditoriaPendente, JSON.stringify(conversa?.auditoriaPendente));
    const pareceres = (conversa?.results ?? []).filter((r) => r.kind === "auditoria");
    // O segundo artefato é o MESMO parecer reaberto: mesmo auditId, marcado como sem mudança.
    const [antes, reaberto] = pareceres;
    ctx.verificar(
      "o pedido reabriu o parecer anterior, e não um novo",
      pareceres.length === 2 && Boolean(reaberto?.payload?.semMudanca) && reaberto?.payload?.auditId === antes?.payload?.auditId,
      `pareceres=${pareceres.length} auditIds=${pareceres.map((r) => r.payload?.auditId).join(",")} semMudanca=${Boolean(reaberto?.payload?.semMudanca)}`,
    );

    const { registradas, linhas } = await ctx.auditoriasDaConversa(id);
    // O cartão registra o id ANTES do POST (`registrarAuditoria`), então a
    // conversa conhece dois ids: é por eles que o banco é consultado.
    ctx.verificar("a conversa registrou as duas tentativas", registradas.length === 2, `registradas=${registradas.length}`);
    const recusado = registradas[1]?.auditId;
    ctx.verificar(
      "o id recusado não deixou linha no banco",
      Boolean(recusado) && linhas.length === 1 && !linhas.some((l) => l.id === recusado),
      `recusado=${recusado} linhas=${JSON.stringify(linhas.map((l) => ({ id: l.id, status: l.status })))}`,
    );
  },
};
