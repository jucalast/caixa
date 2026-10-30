"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CaixaProvider, useCaixa, type Sync } from "@/lib/store";
import { DialogosProvider, useDialogos } from "./Dialogos";
import { Calendario, Contas, Dividas, Resumo, type Aba } from "./Telas";
import { Hero, Marca, P, Svg } from "./ui";

const ABAS: { id: Aba; nome: string; icone: string }[] = [
  { id: "resumo", nome: "Resumo", icone: P.dash },
  { id: "calendario", nome: "Calendário", icone: P.cal },
  { id: "contas", nome: "Contas", icone: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="2" cy="6" r="1"/><circle cx="2" cy="12" r="1"/><circle cx="2" cy="18" r="1"/>' },
  { id: "dividas", nome: "Dívidas", icone: P.card },
];

const SYNC: Record<Sync, [string, string]> = {
  local: ["Só neste aparelho", "w"],
  conectando: ["Conectando…", "w"],
  salvando: ["Salvando…", "w"],
  ok: ["Sincronizado", "ok"],
  offline: ["Sem conexão · salvo no aparelho", "bad"],
  entrar: ["Toque para entrar", "w"],
};

function lerPref(chave: string): string | null {
  try { return localStorage.getItem(chave); } catch { return null; }
}
function gravarPref(chave: string, v: string) {
  try { localStorage.setItem(chave, v); } catch { /* sem armazenamento */ }
}

function Painel() {
  const { sync, ressincronizar, sair, aviso, logado } = useCaixa();
  const { abrirEvento, abrirConfig } = useDialogos();
  const [aba, setAba] = useState<Aba>("resumo");
  const [escuro, setEscuro] = useState(true);
  const [esconder, setEsconder] = useState(false);

  useEffect(() => {
    setEscuro((lerPref("caixa.theme") ?? "dark") === "dark");
    setEsconder(lerPref("caixa.oculto") === "1");
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = escuro ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", escuro ? "#000000" : "#f4f4f5");
  }, [escuro]);
  useEffect(() => { document.body.classList.toggle("oculto", esconder); }, [esconder]);
  useEffect(() => { document.body.dataset.tab = aba; }, [aba]);

  const ir = (a: Aba) => { setAba(a); window.scrollTo({ top: 0 }); };
  const [texto, cl] = SYNC[sync];

  return (
    <div id="app">
      <header className="top">
        <Marca tamanho="sm" />
        <nav className="nav" id="tabs" aria-label="Seções">
          {ABAS.map((a) => (
            <button key={a.id} type="button" className={aba === a.id ? "on" : ""} aria-current={aba === a.id ? "page" : undefined} onClick={() => ir(a.id)}>
              <Svg d={a.icone} /><span>{a.nome}</span>
            </button>
          ))}
        </nav>
        <span className="sp" />
        <button type="button" className={`chip ${cl}`} title="Estado do banco de dados" onClick={ressincronizar} aria-live="polite">{texto}</button>
        <button className="icon-btn" type="button" title="Configurações" aria-label="Configurações" onClick={abrirConfig}><Svg d={P.gear} /></button>
        <button className="icon-btn" type="button" title="Tema" aria-label="Alternar tema claro/escuro" onClick={() => { const n = !escuro; setEscuro(n); gravarPref("caixa.theme", n ? "dark" : "light"); }}><Svg d={P.sun} /></button>
        {logado && <button className="icon-btn" type="button" title="Sair" aria-label="Sair" onClick={sair}><Svg d={P.lock} /></button>}
      </header>
      <main>
        {aba === "resumo" && <Resumo ir={ir} esconder={esconder} alternarEsconder={() => { const n = !esconder; setEsconder(n); gravarPref("caixa.oculto", n ? "1" : "0"); }} />}
        {aba === "calendario" && <Calendario />}
        {aba === "contas" && <Contas />}
        {aba === "dividas" && <Dividas />}
      </main>
      <button className="fab" type="button" onClick={() => abrirEvento(null)}><Svg d={P.plus} sw={2.5} />Lançar</button>
      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  );
}

function Login() {
  const { entrar } = useCaixa();
  const [modo, setModo] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || senha.length < 6) { setErro("Informe o e-mail e uma senha de ao menos 6 caracteres."); return; }
    setEnviando(true);
    const r = await entrar(modo, email.trim(), senha);
    setEnviando(false);
    if (r) { setErro(r); if (/Conta criada/.test(r)) setModo("in"); }
  };

  return (
    <div className="auth">
      <div className="stack">
        <div className="brand"><Marca tamanho="lg" /></div>
        <div className="card">
          <nav className="nav">
            <button type="button" className={modo === "in" ? "on" : ""} onClick={() => { setModo("in"); setErro(null); }}>Entrar</button>
            <button type="button" className={modo === "up" ? "on" : ""} onClick={() => { setModo("up"); setErro(null); }}>Criar conta</button>
          </nav>
          <Hero icone={P.lock} titulo={modo === "in" ? "Entrar" : "Criar conta"} meta="Seus dados ficam salvos na sua conta" estilo={{ background: "var(--primary-soft)", color: "var(--primary)" }} />
          <form className="body" style={{ paddingTop: 12 }} onSubmit={enviar}>
            <label className="field"><span className="lbl">E-mail</span>
              <span className="wrap"><Svg d={P.mail} /><input className="input ico" type="email" placeholder="voce@email.com" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></span>
            </label>
            <label className="field"><span className="lbl">Senha</span>
              <span className="wrap"><Svg d={P.key} /><input className="input ico" type="password" placeholder="••••••" autoComplete={modo === "in" ? "current-password" : "new-password"} value={senha} onChange={(e) => setSenha(e.target.value)} /></span>
              {modo === "up" && <span className="hint">Mínimo de 6 caracteres. Use a mesma conta no celular e no computador.</span>}
            </label>
            {erro && <div className="err" role="alert">{erro}</div>}
            <button className="btn" type="submit" disabled={enviando}>{modo === "in" ? "Entrar" : "Criar conta"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Porteiro() {
  const { logado } = useCaixa();
  if (logado === undefined) return null; // descobrindo se há sessão
  if (logado === null) return <Login />;
  return (
    <DialogosProvider>
      <Painel />
    </DialogosProvider>
  );
}

export default function App() {
  return (
    <CaixaProvider>
      <Porteiro />
    </CaixaProvider>
  );
}
