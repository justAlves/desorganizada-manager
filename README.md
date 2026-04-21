# Desorganizada Manager

App interno para gerenciar pedidos e estoque de uma loja de camisetas de futebol, com uma API pública para ser consumida por um agente de IA no WhatsApp.

**Stack:** Next.js 16 (App Router) · React 19 · Supabase (Postgres + Auth) · Tailwind CSS v4 · shadcn/ui · Zod.

> Este projeto usa Next.js 16 — o antigo `middleware.ts` virou `proxy.ts`, e `cookies()`, `headers()`, `params` e `searchParams` são **assíncronos**. Se for editar, consulte os guias em `node_modules/next/dist/docs/`.

## Setup

### 1. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase → **Settings → API**.
- `SUPABASE_SERVICE_ROLE_KEY`: mesma página. **Nunca exponha no cliente.**
- `PUBLIC_API_KEY`: gere com `openssl rand -hex 32`. Essa chave é o que o agente do WhatsApp envia em `x-api-key`.

### 2. Banco de dados

No painel do Supabase vá em **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute. Isso cria:

- Tabelas `products`, `orders`, `order_items`
- Enums `product_size` e `order_status`
- Trigger de `updated_at`
- RPC `create_order_with_items` (decrementa estoque atomicamente)
- RLS habilitado: usuários autenticados têm acesso total; anônimos não enxergam nada. A API pública usa a `service_role` (que bypassa RLS) e é protegida pelo header `x-api-key`.

### 3. Criar um usuário do dashboard

No Supabase, **Authentication → Users → Add user** (ou use a CLI). Depois entre em `/login` com esse e-mail/senha.

### 4. Rodar

```bash
bun install
bun dev
```

A app sobe em `http://localhost:3000`. O `proxy.ts` redireciona `/` para `/login` (ou `/dashboard` se já logado).

## Estrutura

```
app/
  (auth)/login/              # página de login + server action
  (dashboard)/               # rotas protegidas
    layout.tsx               # sidebar + checagem dupla de sessão
    page.tsx                 # dashboard com cards de resumo
    estoque/                 # CRUD de produtos
    pedidos/                 # lista, filtros, detalhe, criação manual
      [id]/                  # detalhes + atualização de status
  api/public/                # rotas públicas protegidas por x-api-key
    products/
    products/search/
    orders/
    orders/[phone]/
components/ui/               # shadcn/ui (Button, Input, Dialog, Select, Table, …)
lib/
  supabase/
    client.ts                # createBrowserClient
    server.ts                # createServerClient (usa await cookies())
    admin.ts                 # service-role (apenas para /api/public/*)
    types.ts                 # tipos, enums, labels, threshold de estoque
  api-auth.ts                # validação de x-api-key
  utils.ts                   # cn(), formatBRL(), formatDateTime()
proxy.ts                     # (ex-middleware) auth + redirects
supabase/schema.sql          # schema + RLS + RPC
```

## API pública (para o agente de WhatsApp)

Todas as rotas exigem o header `x-api-key: $PUBLIC_API_KEY`. Respostas são JSON.

### `GET /api/public/products`

Lista produtos com `quantity > 0`.

```bash
curl -H "x-api-key: $PUBLIC_API_KEY" \
  https://seu-dominio.com/api/public/products
```

Resposta:

```json
[
  {
    "id": "a0e1…",
    "name": "Flamengo Home 2024",
    "team": "Flamengo",
    "size": "M",
    "quantity": 8,
    "price": 189.9
  }
]
```

### `GET /api/public/products/search?q=flamengo&size=M`

Busca por nome **ou** time (ILIKE case-insensitive). `size` é opcional.

```bash
curl -H "x-api-key: $PUBLIC_API_KEY" \
  "https://seu-dominio.com/api/public/products/search?q=flamengo&size=M"
```

### `POST /api/public/orders`

Cria um pedido e decrementa o estoque **atomicamente** (o RPC `create_order_with_items` lockeia cada produto com `FOR UPDATE` e valida estoque). Retorna **409** se faltar estoque ou o produto não existir.

```bash
curl -X POST https://seu-dominio.com/api/public/orders \
  -H "x-api-key: $PUBLIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "João Silva",
    "customer_phone": "61999999999",
    "customer_address": "Rua X, 123, Brasília",
    "notes": "Mensagem original do WhatsApp",
    "items": [
      { "product_id": "a0e1…", "quantity": 1 }
    ]
  }'
```

Resposta (201):

```json
{
  "order_id": "b2f3…",
  "total_price": 189.9,
  "status": "pending"
}
```

### `GET /api/public/orders/:phone`

Lista pedidos de um cliente pelo telefone (string exata — o agente deve normalizar antes de chamar).

```bash
curl -H "x-api-key: $PUBLIC_API_KEY" \
  https://seu-dominio.com/api/public/orders/61999999999
```

## Notas de implementação

- **Autenticação do dashboard**: Supabase Auth (e-mail/senha). A sessão é persistida em cookies pelo `@supabase/ssr`; o `proxy.ts` refresca o token em cada navegação e redireciona rotas protegidas para `/login`.
- **Server Actions** em `app/(auth)/login/actions.ts`, `app/(dashboard)/estoque/actions.ts` e `app/(dashboard)/pedidos/actions.ts`. Toda mutação passa por `revalidatePath` para invalidar o cache.
- **Criação de pedido**: tanto o dashboard (autenticado) quanto a API pública chamam o **mesmo** RPC (`create_order_with_items`), então a lógica de validação/decremento fica em um único lugar auditável.
- **Estoque baixo**: threshold em `LOW_STOCK_THRESHOLD` (`lib/supabase/types.ts`, default 5).
- **Next.js 16**: `proxy.ts` substitui `middleware.ts`; `cookies()`, `params` e `searchParams` são Promises — sempre `await`.
