import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null | undefined;

/** Cliente único do Supabase, ou `null` se as variáveis de ambiente não estiverem configuradas (o app roda só no aparelho). */
export function getSupabase(): SupabaseClient | null {
  if (cliente !== undefined) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cliente = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "caixa.auth" } }) : null;
  return cliente;
}
