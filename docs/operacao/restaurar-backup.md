# Restaurar o banco (Railway, ponto no tempo)

Provado em 09/10/2026: restauro de 30 minutos atrás numa cópia temporária, com
34 tabelas, 30 migrações e 6.804 linhas, e os dados parando antes do horário
pedido. Produção não foi tocada.

## O que existe

- **Postgres** com PITR (recuperação para um ponto no tempo) ligado; os backups
  contínuos vão para o bucket `Postgres-PITR` da Railway.
- **Bucket `nexo-cofre`** (pranchas, memoriais, volumes, prints): **não** entra no
  backup do Postgres. Perder o bucket = perder esses arquivos; as linhas do
  banco continuam e apontam para o que sumiu.
- **`NEXODOC_COFRE_CHAVE`**: sem ela, o que está cifrado no cofre não abre.
  Guarde a cópia fora da Railway.

## Ensaiar (sem tocar produção)

```bash
railway login            # uma vez por máquina
railway link             # projeto Nexo, ambiente production, serviço nexodoc

# 1. cópia do banco de N minutos atrás, num serviço NOVO
railway postgres --service Postgres pitr restore --at 30m --new-service-name pg-restauro-teste --yes

# 2. a cópia sobe com proxy TCP; conferir tabelas, migrações e contagens nela
railway variables --service pg-restauro-teste --json   # PGUSER/PGPASSWORD/PGDATABASE + RAILWAY_TCP_PROXY_*

# 3. apagar a cópia — SEMPRE com --service explícito: sem ele o comando
#    apaga o serviço linkado, que é o APP
railway service delete --service pg-restauro-teste --yes
```

## Restaurar de verdade (incidente)

1. Restaurar para um serviço novo (passo 1 acima), no instante **antes** do
   problema.
2. Conferir a cópia (passo 2).
3. Apontar o app para ela: no serviço `nexodoc`, trocar `DATABASE_URL` pela
   referência do serviço novo e redeployar.
4. Só depois de o app estar bem na cópia, decidir o destino do Postgres antigo.

O horário aceita RFC3339 (`2026-10-09T15:42:00Z`), `AAAA-MM-DD HH:MM` (fuso
local) ou relativo (`30m`, `2h`, `1d`). O banco grava `createdAt` sem fuso:
script rodando num PC em Brasília mostra os horários 3 h adiantados.
