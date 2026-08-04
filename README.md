# Dashboard Ops

Dashboard interno de inteligência comercial (React + TypeScript + Vite, Netlify Functions + Postgres). Mostra
KPIs, ranking, funil, gargalos e plano de ação por colaborador/equipe, com dados reais lidos direto do banco —
nada de mock.

## Stack

- **Frontend**: React 19 + Vite + TypeScript, Tailwind CSS v4, Recharts, React Router v7.
- **Backend**: Netlify Functions (Node, compatível com Lambda) + [`pg`](https://node-postgres.com/) conectando
  em um Postgres externo (schema `madm`).
- **Auth**: login próprio (token HMAC assinado, sem serviço terceiro) — ver seção [Login](#login).
- **Deploy**: Netlify (site `madm-dashboard`).

## Como rodar localmente

1. `npm install`
2. Copie `.env.example` para `.env` e preencha as credenciais do Postgres (`DB_HOST`, `DB_PORT`,
   `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`) e as variáveis de auth (`AUTH_SECRET`, `DASHBOARD_USERS`).
3. Rode com o proxy do Netlify (necessário pras Functions funcionarem em dev):
   ```
   npx netlify-cli dev
   ```
   Isso sobe o Vite e expõe tudo (frontend + functions) em `http://localhost:8888`.
4. `npm run build` roda `tsc -b && vite build` — sempre confira que passa antes de deployar.

Nunca commitar `.env` — só `.env.example` (sem valores reais).

## Fonte de dados (Postgres, schema `madm`)

**O usuário do Postgres usado aqui deve ter permissão SOMENTE de `SELECT`** nas views abaixo — nunca
`INSERT`/`UPDATE`/`DELETE`/`DDL`. Todas as queries em `netlify/functions/*.ts` usam `pg` com queries
parametrizadas (`$1`, `$2`, nunca concatenação de string) e devem continuar assim.

O dashboard cruza três views (por nome de colaborador, normalizado em `src/lib/assinadosPeriodo.ts` —
`normalizarNome`) pra montar cada `ColaboradorMetricas`:

| View | Grão | Usada para | Campo de data |
|---|---|---|---|
| `madm.view_relatorio_judit` | 1 linha por colaborador, snapshot agregado do mês | cadastro (nome, equipe, classificação operacional/canal), metas, e as métricas que ainda não têm granularidade diária no banco (ligações, TMA, venda ganha/perdida) | — (mensal) |
| `madm.view_app_kommo_leads` | 1 linha por lead | **Recebidos** (contagem por `data_qualificacao`) e **Protocolados** (contagem por `data_protocolo_juridico_auditoria`) | `data_qualificacao`, `data_protocolo_juridico_auditoria` |
| `madm.view_app_emitidos_e_assinados` | 1 linha por contrato | **Assinados** (contagem de `status ilike 'signed'` por `data_assinatura`) | `data_assinatura` |

As duas últimas views não trazem a contagem pronta — o valor é sempre **contagem de linhas por
consultor/data** (`group by`, `count(*)`), nunca uma coluna pré-calculada.

### Canal (Judit × Discadora)

`canal` vem da coluna `Classificação Operacional` de `view_relatorio_judit`: contém `"judit"` (case
insensitive) → `Judit`; qualquer outro valor (`Discador`, `Discadora`, `Não Informado`, `Supervisor`) →
`Discadora` na exibição (`src/lib/format.ts` → `formatCargo`). Judit e Discadora são mutuamente exclusivos —
qualquer soma que separe os dois grupos tem que bater com o total geral, nunca contar a mesma pessoa 2x.

### Período selecionado (calendário do topo)

O calendário (`src/context/DataSelecionadaContext.tsx`) define um intervalo `inicio`/`fim` (um dia só, clicando
2x no mesmo dia, ou um intervalo, clicando em dois dias diferentes). Ao abrir o dashboard, o período padrão é
"dia 01 do mês corrente até hoje".

`src/lib/useIntelligence.ts` é o hook central: busca Assinados/Recebidos/Protocolados do período selecionado
(`netlify/functions/assinados-periodo.ts`, `recebidos-periodo.ts`, `protocolados-periodo.ts`) e substitui esses
três campos em cada colaborador (`src/lib/aplicarAssinadosPeriodo.ts`), recalculando em cascata todas as
conversões, eficiência e status. **Todo KPI, gráfico, ranking, alerta e gargalo deriva desse mesmo hook** — não
adicione buscas de dado direto numa página; sempre reaproveite `useIntelligence()`.

## Login

Duas fontes de usuários:

1. **Fixos** via variável de ambiente `DASHBOARD_USERS` (`netlify/functions/auth-login.ts`) — pensados para
   contas administrativas/master.
2. **Autocadastro** (`netlify/functions/auth-register.ts`) — qualquer pessoa cria a própria conta em `/login`
   informando nome, sobrenome e senha. O login é sempre derivado como `primeiro.sobrenome@madmbrasil.com.br`
   e a senha é guardada com hash (scrypt + salt), nunca em texto puro. Fica salvo no Netlify Blobs
   (`dashboard-registered-users`) e sempre entra com `role: "user"` — master só é concedido manualmente via
   `DASHBOARD_USERS` (ou automaticamente via `MASTER_LOGINS`, ver abaixo).

Para configurar:

1. Preencha `AUTH_SECRET` (local e no Netlify) com uma string aleatória longa — ex: `openssl rand -hex 32`.
2. Preencha `DASHBOARD_USERS` com a lista de contas fixas em JSON, ex:
   `[{"usuario":"diretoria@empresa.com","senha":"...","role":"master","nome":"Diretoria"}]`

O token de sessão dura 12h e fica salvo no `localStorage` do navegador. Trocar `AUTH_SECRET` invalida todas as
sessões ativas (útil se algum token vazar).

### Master automático por lista (MASTER_LOGINS)

Quando alguém se autocadastra em `/login` com o próprio email corporativo, a conta normalmente entra como
usuário comum — a menos que o login (a parte antes de `@madmbrasil.com.br`) esteja na variável de ambiente
`MASTER_LOGINS` (separada por vírgula). Nesse caso a conta já nasce com `role: "master"` e vê **Logs de
Acesso** desde o primeiro login.

### Contas salvas ("bolinha" de acesso rápido)

Depois do primeiro login, o navegador guarda localmente (`localStorage`, sem senha) um atalho com nome e
iniciais da pessoa — clicar nele leva direto pro campo de senha, sem digitar o usuário de novo.

## Segurança

- **Toda function autenticada** (`assinados-periodo`, `recebidos-periodo`, `protocolados-periodo`,
  `relatorio-judit`, `logs`, `track-visit`) valida o token via `netlify/functions/_shared/auth.ts`
  (`extrairToken`/`validarToken`) antes de tocar no banco. `auth-login`/`auth-register` são as únicas exceções
  (são elas que emitem o token).
- **Validação de entrada**: `netlify/functions/_shared/validacao.ts` valida tipo, tamanho máximo e remove
  caracteres de controle de qualquer corpo de requisição antes de usar.
- **Rate limit** (`netlify/functions/_shared/rateLimit.ts`, por IP, via Netlify Blobs): 10 tentativas de login
  erradas a cada 15 min; 5 cadastros por hora.
- **CSP e demais headers de segurança** definidos em `netlify.toml`, aplicados a todas as respostas.
- Nenhuma function expõe stack trace ou detalhe interno em caso de erro — sempre uma mensagem genérica.

## Governança de acesso (Logs)

Todo login e navegação de página ficam registrados (`netlify/functions/_shared/logs.ts`, Netlify Blobs). Só
`role: "master"` vê **Logs de Acesso** na sidebar e consegue abrir `/logs` (`RequireMaster` redireciona
qualquer outra pessoa).

## Deploy

`netlify deploy --prod` direto costuma retornar `Forbidden` nesta conta (causa não totalmente diagnosticada).
Workaround usado: deploy de draft + promoção manual:

```
npx netlify deploy --dir=dist --functions=netlify/functions   # gera uma Draft URL
npx netlify api restoreSiteDeploy --data '{"site_id":"...","deploy_id":"..."}'   # promove o draft pra produção
```

Variáveis de ambiente devem ser configuradas em **todos os contexts** do Netlify (`netlify env:set KEY value`
sem `--context`), já que o draft roda em `deploy-preview` e as functions gravam o env no momento do deploy —
promover um draft não propaga retroativamente vars só de `production`.
