"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Mutacao } from "./actions";
import { migrar } from "./migrate";
import { getSupabase } from "./supabase";
import type { Estado } from "./types";

export type Sync = "local" | "conectando" | "salvando" | "ok" | "offline" | "entrar";

const KEY = "caixa.v1";
const chaveLocal = (uid?: string) => (uid ? `${KEY}:${uid}` : KEY);

function lerLocal(uid?: string): Estado {
  try {
    const bruto = localStorage.getItem(chaveLocal(uid)) ?? (uid ? localStorage.getItem(KEY) : null);
    return migrar(bruto ? JSON.parse(bruto) : null);
  } catch {
    return migrar(null);
  }
}
function gravarLocal(s: Estado, uid?: string) {
  try { localStorage.setItem(chaveLocal(uid), JSON.stringify(s)); } catch { /* cota cheia ou modo privado: segue só em memória */ }
}

interface Ctx {
  S: Estado;
  update: <A extends unknown[]>(mut: Mutacao<A>, ...args: A) => void;
  /** Troca o estado inteiro (restaurar backup). */
  substituir: (novo: Estado) => void;
  sync: Sync;
  ressincronizar: () => void;
  email: string | null;
  /** `undefined` enquanto descobre se há sessão; `null` sem login; `false` se o app não usa nuvem. */
  logado: boolean | null | undefined;
  entrar: (modo: "in" | "up", email: string, senha: string) => Promise<string | null>;
  sair: () => Promise<void>;
  toast: (t: string) => void;
  aviso: string | null;
}

const Contexto = createContext<Ctx | null>(null);
export const useCaixa = () => {
  const c = useContext(Contexto);
  if (!c) throw new Error("useCaixa fora do CaixaProvider");
  return c;
};

const traduzErro = (m: string) =>
  /invalid login/i.test(m) ? "E-mail ou senha incorretos."
  : /already|registered/i.test(m) ? "Esse e-mail já tem conta. Use Entrar."
  : /confirm/i.test(m) ? "Confirme o e-mail antes de entrar."
  : /fetch|network/i.test(m) ? "Sem conexão com o banco."
  : m;

export function CaixaProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  const uid = session?.user.id;

  const [S, setS] = useState<Estado>(() => migrar(null));
  const sRef = useRef(S);
  const sujo = useRef(false);
  const enviando = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const uidRef = useRef<string | undefined>(undefined);
  const [sync, setSync] = useState<Sync>(supabase ? "conectando" : "local");
  const [aviso, setAviso] = useState<string | null>(null);
  /** Para quem o estado em memória já foi carregado do aparelho ("local" = app sem nuvem). Evita piscar o planejamento de exemplo. */
  const [hidratado, setHidratado] = useState<string | null>(null);

  const toast = useCallback((t: string) => {
    setAviso(t);
    setTimeout(() => setAviso((a) => (a === t ? null : a)), 2200);
  }, []);

  const adotar = useCallback((novo: Estado) => { sRef.current = novo; setS(novo); }, []);

  /** Grava o estado inteiro na linha do usuário (upsert). Se falhar, o dado segue salvo no aparelho e tenta de novo. */
  const push = useCallback(async () => {
    if (!supabase || !uidRef.current) return;
    if (enviando.current) { timer.current = setTimeout(push, 700); return; }
    enviando.current = true;
    const ts = (sRef.current._ts ||= Date.now());
    try {
      const { error } = await supabase.from("caixa_state").upsert({ user_id: uidRef.current, data: sRef.current, updated_at: new Date(ts).toISOString() });
      if (error) throw error;
      if (sRef.current._ts === ts) sujo.current = false;
      setSync(sujo.current ? "salvando" : "ok");
    } catch {
      setSync("offline");
      timer.current = setTimeout(push, 15000);
    } finally { enviando.current = false; }
  }, [supabase]);

  const agendarPush = useCallback(() => {
    if (!supabase || !uidRef.current) return;
    sujo.current = true;
    setSync("salvando");
    clearTimeout(timer.current);
    timer.current = setTimeout(push, 700);
  }, [supabase, push]);

  /** Busca a versão da nuvem; a mais recente (por `_ts`) vence. */
  const pull = useCallback(async () => {
    if (!supabase || !uidRef.current || sujo.current) return;
    setSync("conectando");
    try {
      const { data, error } = await supabase.from("caixa_state").select("data").eq("user_id", uidRef.current).maybeSingle();
      if (error) throw error;
      const remoto = data?.data as Estado | undefined;
      const local = sRef.current;
      if (!remoto) { local._ts ||= Date.now(); agendarPush(); return; }
      if ((remoto._ts ?? 0) > (local._ts ?? 0)) {
        const novo = migrar(remoto);
        adotar(novo);
        gravarLocal(novo, uidRef.current);
        setSync("ok");
      } else if ((remoto._ts ?? 0) < (local._ts ?? 0)) agendarPush();
      else setSync("ok");
    } catch {
      setSync("offline");
    }
  }, [supabase, agendarPush, adotar]);

  // Sessão
  useEffect(() => {
    if (!supabase) { adotar(lerLocal()); setHidratado("local"); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_ev, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [supabase, adotar]);

  // Troca de usuário: carrega o cache do aparelho e depois confere a nuvem
  useEffect(() => {
    if (session === undefined) return;
    uidRef.current = uid;
    if (!uid) { if (supabase) setSync("entrar"); return; }
    adotar(lerLocal(uid));
    setHidratado(uid);
    sujo.current = false;
    pull();
  }, [session, uid, supabase, adotar, pull]);

  useEffect(() => {
    const volta = () => { if (!document.hidden) pull(); };
    document.addEventListener("visibilitychange", volta);
    window.addEventListener("online", pull);
    return () => { document.removeEventListener("visibilitychange", volta); window.removeEventListener("online", pull); };
  }, [pull]);

  const substituir = useCallback((novo: Estado) => {
    const pronto = { ...migrar(novo), _ts: Date.now() };
    adotar(pronto);
    gravarLocal(pronto, uidRef.current);
    agendarPush();
  }, [adotar, agendarPush]);

  const update: Ctx["update"] = useCallback((mut, ...args) => {
    const proximo = structuredClone(sRef.current);
    const msg = mut(proximo, ...args);
    proximo._ts = Date.now();
    adotar(proximo);
    gravarLocal(proximo, uidRef.current);
    agendarPush();
    if (msg) toast(msg);
  }, [adotar, agendarPush, toast]);

  const entrar: Ctx["entrar"] = useCallback(async (modo, email, senha) => {
    if (!supabase) return "O banco não está configurado.";
    const { data, error } = modo === "in"
      ? await supabase.auth.signInWithPassword({ email, password: senha })
      : await supabase.auth.signUp({ email, password: senha });
    if (error) return traduzErro(error.message);
    if (!data.session) return "Conta criada. Confirme o e-mail que você recebeu e depois entre.";
    return null;
  }, [supabase]);

  const sair = useCallback(async () => {
    await supabase?.auth.signOut();
    window.location.reload(); // limpa qualquer dado do usuário anterior da memória
  }, [supabase]);

  const logado = !supabase ? (hidratado === "local" ? false : undefined)
    : session === undefined ? undefined
    : session ? (hidratado === uid ? true : undefined)
    : null;

  const valor: Ctx = {
    S, update, substituir, sync, ressincronizar: pull, email: session?.user.email ?? null, logado, entrar, sair, toast, aviso,
  };
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
