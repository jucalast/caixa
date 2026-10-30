# Caixa — planejamento financeiro (João e Giovana)

Next.js (App Router) + TypeScript + Supabase. A versão estática antiga está em `legacy/index.html`.

## Rodar
```
npm install
cp .env.example .env.local   # URL e chave "anon" do Supabase
npm run dev                  # http://localhost:3000
npm test                     # cálculos (src/lib)
npm run build
```
Sem as variáveis do Supabase o app funciona só no aparelho (localStorage).

## Banco
Rode `supabase.sql` uma vez no Supabase. O formato (`caixa_state`, uma linha JSON por usuário) é o mesmo da versão antiga, então os dados existentes continuam valendo. Quem já estava logado precisa entrar uma vez de novo.

## Deploy (Vercel)
Importe o repositório no Vercel e cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Nada mais é necessário.

## Estrutura
- `src/lib/calc.ts`, `actions.ts`, `migrate.ts`: regras puras e testadas
- `src/lib/store.tsx`: estado, cache local e sincronização (a edição mais recente, por `_ts`, vence)
- `src/components/`: telas, diálogos e a linha com swipe
