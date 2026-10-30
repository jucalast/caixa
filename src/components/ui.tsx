"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/** Ícone de traço: recebe o conteúdo SVG (paths) como HTML. */
export function Svg({ d, className, size, sw = 2.2, style }: { d: string; className?: string; size?: number; sw?: number; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      width={size} height={size} className={className} style={style} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}

export const P = {
  alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4M12 17h.01"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  dots: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  list: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  out: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  in: '<path d="M17 7 7 17"/><path d="M16 17H7V8"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  undo: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  bars: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
};

export const ICONE_CAT: Record<string, string> = {
  "Salário": '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  "Aluguel recebido": '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  "13º": '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  "Moradia": '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  "Financiamento": '<path d="M3 22h18"/><path d="M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/><path d="m12 2 9 5H3z"/>',
  "Faculdade": '<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  "Transporte": '<path d="M8 6v6M16 6v6M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>',
  "Casa": '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M16 8H8M16 12H8M13 16H8"/>',
  "Empréstimo": '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  "Cartão": P.card,
  "Dívida": P.alert,
  "Família": P.users,
  "Alimentação": '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  "Lazer": '<rect x="2" y="2" width="20" height="20" rx="2.2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5"/>',
  "Outros": P.dots,
};

export const ICONE_GRUPO: Record<string, string> = {
  atraso: P.alert, cartao: P.card, familia: P.users, outro: P.dots,
  juros: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
};

export function Marca({ tamanho }: { tamanho: "lg" | "sm" }) {
  return (
    <span className={`marca ${tamanho}`}>
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <defs><linearGradient id={`lg-${tamanho}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#b8f34a" /><stop offset="1" stopColor="#8fe05a" /></linearGradient></defs>
        <rect width="32" height="32" rx="16" fill={`url(#lg-${tamanho})`} />
        <rect x="6.5" y="17" width="5" height="8.5" rx="2" fill="#0c1a03" opacity=".55" />
        <rect x="13.5" y="12" width="5" height="13.5" rx="2" fill="#0c1a03" opacity=".8" />
        <rect x="20.5" y="6.5" width="5" height="19" rx="2" fill="#0c1a03" />
      </svg>
      <span>Caixa</span>
    </span>
  );
}

export function Hero({ icone, titulo, meta, estilo }: { icone: string; titulo: string; meta: ReactNode; estilo?: CSSProperties }) {
  return (
    <div className="hero">
      <div className="hero-ico" style={estilo}><Svg d={icone} /></div>
      <div><h2>{titulo}</h2><div className="meta">{meta}</div></div>
    </div>
  );
}

/** Folha modal nativa (<dialog>): foco preso, Esc e clique fora fecham. Renderize só enquanto estiver aberta. */
export function Dialogo({ aoFechar, children, id }: { aoFechar: () => void; children: ReactNode; id?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref} id={id}
      onClose={aoFechar} onCancel={(e) => { e.preventDefault(); aoFechar(); }}
      onClick={(e) => { if (e.target === ref.current) aoFechar(); }}
    >
      {children}
    </dialog>
  );
}

/** Confirmação dentro do app, no lugar do `confirm()` do navegador. */
export function Confirmar({ titulo, texto, rotulo, aoConfirmar, aoFechar }: { titulo: string; texto: string; rotulo: string; aoConfirmar: () => void; aoFechar: () => void }) {
  return (
    <Dialogo aoFechar={aoFechar}>
      <div className="card">
        <Hero icone={P.alert} titulo={titulo} meta={texto} estilo={{ background: "var(--alert-bg)", color: "var(--danger)" }} />
        <div className="body">
          <div className="actions">
            <button className="btn ghost" type="button" onClick={aoFechar}>Cancelar</button>
            <button className="btn danger" type="button" onClick={() => { aoConfirmar(); aoFechar(); }}>{rotulo}</button>
          </div>
        </div>
      </div>
    </Dialogo>
  );
}
