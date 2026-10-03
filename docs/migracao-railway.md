# Migração Render + Neon → Railway

> **Executada em 03/10/2026.** `nexo-doc.com` e `www` servidos pelo Railway
> (projeto `clever-spontaneity`, serviços `nexodoc` e `Postgres` 18.6 em
> `us-east4-eqdc4a`; o tráfego entra pela borda `gru1`, em São Paulo). Banco de
> produção (`neondb`) copiado e conferido tabela a tabela; backups diário,
> semanal e mensal e PITR ligados; Render suspensa. O roteiro abaixo fica como
> registro e para refazer num ambiente novo.
>
> **Armadilha que apareceu:** a região padrão do workspace era `ams`
> (Amsterdã). O primeiro Postgres nasceu lá, e mudar a região do serviço depois
> NÃO move o volume — foi preciso recriar o banco. Antes de criar serviços,
> confira a região padrão (workspace → `preferredRegion`).

**Por quê (medido em 03/10/2026):** o app roda na Render em Oregon e o banco no
Neon em São Paulo (`sa-east-1`). A tela de Projetos faz 23 consultas em ~13
esperas encadeadas; a ~175 ms cada ida e volta Oregon ↔ São Paulo, são ~2,3 s só
de distância por clique, mais o sono do Neon gratuito (1-5 s depois de 5 min
parado) e os 0,5 vCPU do Starter. No Railway, app e banco ficam na mesma rede
interna (~1 ms por consulta).

**Situação:** app ainda não lançado, sem usuários. Banco de 35 MB, Postgres
17.11. Hoje o `.env.local` aponta para o MESMO banco da produção — a migração
separa os dois: o Railway vira produção, o Neon fica só para desenvolvimento.

---

## 0. Antes de começar

- [ ] Plano **Pro** ativo no Railway (o trial tem pouca memória para o build com
      LibreOffice).
- [ ] App do Railway no GitHub com acesso a `theusinshow/nexodoc`.
- [ ] Os valores das variáveis da Render guardados em lugar seguro (não no chat).
- [ ] PostgreSQL 17 no PC (`C:\Program Files\PostgreSQL\17\bin`) — já instalado.

## 1. Criar o projeto (painel do Railway)

1. **New Project → Deploy from GitHub repo →** `theusinshow/nexodoc`, branch
   `main`. O `railway.json` da raiz já diz: build pelo `Dockerfile`, health check
   em `/api/saude`, reinício automático se cair.
2. **+ New → Database → PostgreSQL** no mesmo projeto.
3. Nos dois serviços, **Settings → Region: US East** (mais perto do Brasil que
   Oregon). App e banco precisam estar na MESMA região.
4. No serviço do app, **Settings → Resources:** limite de **2 vCPU e 4 GB**. Só o
   uso real é cobrado.
5. **Settings → Backups** do Postgres: ligar **Daily, Weekly e Monthly**, e
   **Enable PITR**.
6. Conta → **Usage limits:** um teto de gasto (ex.: US$ 40) com alerta.

> O primeiro deploy do app vai falhar enquanto não houver `DATABASE_URL` — é
> esperado. Não aponte o app para o banco antes do passo 3 (a cópia): o
> `prisma migrate deploy` do início criaria as tabelas vazias e a restauração
> teria de limpar tudo de novo (o `db:restore` usa `--clean`, então funciona,
> mas é um passo a mais).

## 2. Variáveis do app (serviço do app → Variables)

**Copiar iguais da Render:**

| Variável | Observação |
|---|---|
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | as duas — sem a segunda o login Google quebra |
| `AUTH_TRUST_HOST=true` | |
| `JEV_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY` | |
| `NEXODOC_ADMIN_EMAILS` | |
| `NEXODOC_EMAIL_FROM="NexoDoc <avisos@nexo-doc.com>"` | o Resend é verificado no domínio, não no host |
| `NEXODOC_DEV_AUTH=false` | explícita de propósito |
| `NEXODOC_ESCRITORIO_PADRAO=` | **definida e VAZIA** — desliga a entrada automática num escritório (`lib/access-control.ts`). Não apagar |
| `NEXODOC_ENABLE_COHERENCE_PASS=true` | |
| `NEXODOC_MAX_CHUNKS_PER_FILE=24`, `NEXODOC_CHUNK_CONCURRENCY=5`, `NEXODOC_CHUNK_TIMEOUT_MS=120000`, `NEXODOC_DEEP_CHUNK_MAX_OUTPUT_TOKENS=6000` | |
| `NEXODOC_MAX_AUDITORIAS_SIMULTANEAS=1`, `NEXODOC_MAX_AUDITORIAS_SIMULTANEAS_GLOBAL=1`, `NEXODOC_MONTHLY_BUDGET_USD=20` | rever antes do lançamento |
| `OPENAI_MODEL`, `NEXODOC_AUDIT_*_MODEL`, `NEXODOC_NEXO_MODEL`, `NEXODOC_LD_OPENAI_MODEL`, `NEXODOC_SELO_CHECK_MODEL`, `NEXODOC_VOLUME_*_MODEL` | os modelos, iguais |
| `NEXODOC_CHAT_REASONING_EFFORT=low`, `NEXODOC_NEXO_REASONING_EFFORT=low` | |
| `NEXT_PUBLIC_NEXO_ENABLED=true` | |

**Mudam:**

| Variável | Valor no Railway |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — referência ao banco do projeto, pela rede interna. **Só depois da cópia (passo 3)** |
| `NODE_OPTIONS` | `--max-old-space-size=3072` (~75% dos 4 GB; ver o comentário no `render.yaml`) |
| `NEXODOC_ADMIN_TOKEN` | **novo** — o antigo foi exposto numa conversa em 03/10 |
| `AUTH_SECRET` | **novo**. Sem usuários, ninguém perde sessão |

Os dois valores novos saem de
`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
(rodar duas vezes, um para cada).
| `AUTH_URL` | primeiro o endereço `https://<servico>.up.railway.app`; na virada (passo 6), `https://nexo-doc.com` |

**Não levar** (o código não lê mais): `NEXODOC_AI_PROVIDER`,
`NEXODOC_ENABLE_DEEPSEEK`, `DOCUMENT_CONVERTER_URL` (o LibreOffice está no
container), `NEXODOC_AUDIT_COBERTURA_TOTAL=false` (é o padrão).

## 3. Copiar o banco (no PC, PowerShell)

A origem é o banco atual do Neon — a connection string está no `DATABASE_URL`
da Render. Use o host **sem `-pooler`** (o `pg_dump` não deve passar pelo
PgBouncer). O destino é a **`DATABASE_PUBLIC_URL`** do serviço Postgres no
Railway (aba Variables) — a interna só funciona de dentro do Railway.

```powershell
$env:PATH = "C:\Program Files\PostgreSQL\17\bin;$env:PATH"

# 1. backup do Neon (vai para .\backups\nexodoc-<data>.dump)
$env:DATABASE_URL = "<url do Neon, host sem -pooler>"
npm run db:backup

# 2. restaurar no Railway
$env:DATABASE_URL = "<DATABASE_PUBLIC_URL do Railway>"
$env:BACKUP_FILE = ".\backups\nexodoc-<data>.dump"
npm run db:restore

# 3. conferir: todas as tabelas têm de bater
node scripts/compara-bancos.mjs "<url do Neon>" "<DATABASE_PUBLIC_URL do Railway>"
```

São 35 MB: leva segundos. Depois de conferido, apague a variável da sessão
(`Remove-Item Env:DATABASE_URL, Env:BACKUP_FILE`) para nenhum comando seguinte
cair no banco errado.

## 4. Ligar o app ao banco e testar pelo endereço do Railway

1. Pôr `DATABASE_URL=${{Postgres.DATABASE_URL}}` no app. O deploy roda
   `prisma migrate deploy` (não deve haver migração pendente) e sobe.
2. **Settings → Networking → Generate Domain** no app: sai o
   `https://<servico>.up.railway.app`. Pôr esse endereço no `AUTH_URL`.
3. **Google Cloud Console → APIs e serviços → Credenciais →** o cliente OAuth
   do Nexo → **acrescentar** em "URIs de redirecionamento autorizados":
   `https://<servico>.up.railway.app/api/auth/callback/google`. Não tirar o de
   `nexo-doc.com`.
4. Testar: login Google, Início, Projetos, abrir uma obra, uma auditoria Padrão,
   gerar um PDF (prova o LibreOffice), mandar um e-mail de convite.

## 5. Separar o desenvolvimento

O `.env.local` continua apontando para o Neon, que passa a ser só de
desenvolvimento. A partir daqui, **nenhuma URL do Railway entra no
`.env.local`**.

## 6. Virar o domínio (Cloudflare)

Hoje: `nexo-doc.com` → A `216.24.57.1` (Render) e `www` → CNAME
`nexodoc-co8m.onrender.com`.

1. Railway, app → **Settings → Networking → Custom Domain:** adicionar
   `nexo-doc.com` e `www.nexo-doc.com`. Ele mostra o alvo do CNAME (e um TXT de
   verificação, se pedir).
2. Cloudflare → DNS: trocar o registro da raiz por um **CNAME** para o alvo do
   Railway (a Cloudflare achata o CNAME na raiz) e o `www` para o mesmo alvo.
   Não mexer nos registros do Resend (MX/TXT/DKIM).
3. Se o proxy da Cloudflare (nuvem laranja) estiver ligado: SSL/TLS em **Full**.
4. `AUTH_URL=https://nexo-doc.com` no Railway.
5. Testar de novo o login pelo domínio.

## 7. Desligar o antigo (depois de alguns dias)

- Render: suspender o serviço `nexodoc`; depois, apagar o `render.yaml` do
  repositório.
- Neon: continua como banco de desenvolvimento. Trocar a senha dele (a atual
  foi exposta em 03/10).
- Tirar do Google OAuth o redirecionamento do `onrender.com`, se houver.

## Cuidados que já se sabe

- **Requisição longa:** o Railway corta HTTP em 15 min, e em 5 min sem dado. A
  auditoria manda `: ping` a cada 15 s (cobre os 5 min) e a profunda típica leva
  3-7 min. Se a conexão cair, a auditoria segue no servidor e grava o parecer.
- **Memória:** se mudar o limite do serviço, mudar o `NODE_OPTIONS` junto.
- **Backup fora do Railway:** os backups do Railway somem se o volume for
  apagado. Rodar `npm run db:backup` contra a `DATABASE_PUBLIC_URL` de vez em
  quando e guardar o arquivo fora.
