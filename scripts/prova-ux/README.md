# Provas de navegador da execução UX/UI (28/09/2026)

Sem token de IA, sem e-mail real, sem dado de produção. Rodam contra um `next dev`
ISOLADO na porta 3200 (pasta `.next-ux`), com o banco da bateria
(`DATABASE_URL_BATERIA`, `nexodoc_teste`), IA simulada e `RESEND_API_KEY` vazio.

```bash
node scripts/prova-ux/seed-ux.mjs        # usuário ux@nexodoc.local ADMIN + 3 projetos (upsert)
node scripts/prova-ux/sobe-dev.mjs       # servidor na 3200 (deixe rodando)
node scripts/prova-ux/prova-g03.mjs      # G03/T01: ações do projeto, legados, login/F5, conflito
node scripts/prova-ux/prova-a01-a03.mjs  # A01, G04, A02, A03 (PDFs sintéticos por pdf-lib)
node scripts/prova-ux/prova-p02.mjs      # P02/T13: estados do admin
```

- `sobe-dev.mjs` usa `ambienteDoServidor` da bateria e sobrescreve e-mail do login
  dev, pasta de build e `NEXODOC_ADMIN_TOKEN=ux-token-teste`.
- O Next acrescenta `.next-ux/*` ao `tsconfig.json` ao subir; restaure com
  `git checkout tsconfig.json` depois de derrubar o servidor.
- A bateria (`npm run bateria`) esvazia o banco de teste; rode `seed-ux.mjs` de novo.
- Capturas vão para `docs/auditoria/execucao-ux-ui-claude-code/evidencias/`.
