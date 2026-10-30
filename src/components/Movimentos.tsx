"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { alternarAtrasar, alternarPago } from "@/lib/actions";
import { brl, brl0, fmtD, hoje, rotuloDia } from "@/lib/format";
import { useCaixa } from "@/lib/store";
import type { Evento, Linha } from "@/lib/types";
import { useDialogos } from "./Dialogos";
import { ICONE_CAT, P, Svg } from "./ui";

const LIMIAR = 70;

/** Linha que desliza para a esquerda (toque ou mouse) e dispara `aoDeslizar` ao passar do limiar. */
function Deslizavel({ ativo, rotulo, desfazer, aoDeslizar, aoClicar, atrasado, children }: {
  ativo: boolean; rotulo: string; desfazer: boolean; aoDeslizar: () => void; aoClicar: () => void; atrasado: boolean; children: (p: { style: CSSProperties; swiping: boolean }) => ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const ini = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const deslizou = useRef(false);

  const soltar = () => {
    const i = ini.current;
    ini.current = null;
    if (!i || !arrastando) { setDx(0); return; }
    setArrastando(false);
    deslizou.current = true;
    setTimeout(() => { deslizou.current = false; }, 320);
    if (dx <= -LIMIAR) {
      try { navigator.vibrate?.(25); } catch { /* sem vibração */ }
      setDx(-400);
      setTimeout(() => { aoDeslizar(); setDx(0); }, 180);
    } else setDx(0);
  };

  return (
    <div
      className={`swipe-row ${atrasado ? "is-atrasado" : ""} ${arrastando ? "swiping" : ""}`}
      onPointerDown={(e) => {
        if (!ativo || (e.pointerType === "mouse" && e.button !== 0) || (e.target as HTMLElement).closest("button")) return;
        ini.current = { x: e.clientX, y: e.clientY, horizontal: null };
      }}
      onPointerMove={(e) => {
        const i = ini.current;
        if (!i) return;
        const mx = e.clientX - i.x, my = e.clientY - i.y;
        if (i.horizontal === null && (Math.abs(mx) > 7 || Math.abs(my) > 7)) i.horizontal = Math.abs(mx) > Math.abs(my);
        if (!i.horizontal) return;
        if (!arrastando) { setArrastando(true); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
        setDx(mx < 0 ? (mx < -140 ? -140 + (mx + 140) * 0.2 : mx) : mx * 0.15);
      }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onClick={() => { if (!deslizou.current) aoClicar(); }}
    >
      {ativo && (
        <div className={`swipe-act ${desfazer ? "undo" : "atrasar"} ${Math.abs(dx) >= LIMIAR && dx < 0 ? "ready" : ""}`}>
          <div className="swipe-act-inner"><Svg d={desfazer ? P.undo : P.clock} /><span>{rotulo}</span></div>
        </div>
      )}
      {children({ style: dx ? { transform: `translateX(${dx}px)` } : {}, swiping: arrastando })}
    </div>
  );
}

export function situacao(e: Evento, r: Linha | null, hojeIso: string): { texto: string; cl: string } {
  const atrasar = !!(e.atrasar && !e.pago);
  const neg = !!(r && r.on && r.after < 0);
  if (e.pago) return { texto: e.tipo === "in" ? "Recebido" : "Pago", cl: "ok" };
  if (atrasar) return { texto: "Deixou atrasar", cl: "w" };
  if (e.date < hojeIso) return { texto: "Vencida", cl: "bad" };
  if (neg) return { texto: "Sem saldo", cl: "bad" };
  return e.est ? { texto: "A confirmar", cl: "w" } : { texto: "Previsto", cl: "" };
}

/** Uma linha de movimento: ícone da categoria, nome, situação, valor e o círculo de "já foi". */
export function Tx({ e, r }: { e: Evento; r: Linha | null }) {
  const { update } = useCaixa();
  const { abrirEvento, pagarFatura } = useDialogos();
  const hojeIso = hoje();
  const atrasar = !!(e.atrasar && !e.pago);
  const neg = !!(r && r.on && r.after < 0);
  const { texto, cl } = situacao(e, r, hojeIso);
  const podeArrastar = !e.pago && e.tipo === "out";

  return (
    <Deslizavel
      ativo={podeArrastar} desfazer={atrasar} atrasado={atrasar}
      rotulo={atrasar ? "Voltar ao caixa" : "Deixar atrasar"}
      aoDeslizar={() => update(alternarAtrasar, e.id)}
      aoClicar={() => abrirEvento(e.id)}
    >
      {({ style, swiping }) => (
      <div style={style} className={`tx ${e.pago ? "done" : ""} ${atrasar || (r && !r.on) ? "off" : ""} ${swiping ? "swiping" : ""}`}>
        <span className={`ic ${e.tipo}`}><Svg d={ICONE_CAT[e.cat] ?? P.dots} /></span>
        <div className="grow">
          <div className="t">
            <span className="t-name">{e.desc}</span>
            {!e.pago && <span className={`chip ${cl}`}>{texto}</span>}
            {e.prazo && <span className="chip chip-prazo"><Svg d={P.clock} size={10} />Prazo: {e.prazo}</span>}
          </div>
          <div className="s">
            {e.pago && <span className={`chip ${cl}`}>{texto}</span>}
            {r && r.on && <span className={`num ${neg ? "neg" : ""}`}>fica {brl0(r.after)}</span>}
          </div>
        </div>
        <b className={`num amt ${e.tipo === "in" ? "pos" : ""}`}>{e.tipo === "in" ? "+" : "−"}{brl(e.valor)}</b>
        <button
          className={`check ${e.pago ? "on" : ""}`} type="button"
          aria-label={`Marcar ${e.desc} como ${e.tipo === "in" ? "recebido" : "pago"}`} aria-pressed={e.pago}
          onClick={(ev) => { ev.stopPropagation(); if (e.cat === "Cartão" && !e.pago) pagarFatura(e.id); else update(alternarPago, e.id); }}
        >
          <Svg d={P.check} sw={3.5} />
        </button>
      </div>
      )}
    </Deslizavel>
  );
}

/** Agrupa movimentos por dia, com o cabeçalho "Hoje / Amanhã / sex, 10/11". */
export function PorDia({ itens }: { itens: { e: Evento; r: Linha | null }[] }) {
  const hojeIso = hoje();
  const grupos: { dia: string; itens: typeof itens }[] = [];
  for (const it of itens) {
    const g = grupos.at(-1);
    if (g && g.dia === it.e.date) g.itens.push(it);
    else grupos.push({ dia: it.e.date, itens: [it] });
  }
  return (
    <>
      {grupos.map((g) => (
        <div key={g.dia}>
          <div className="dia">{rotuloDia(g.dia, hojeIso)}</div>
          <div className="tlist">{g.itens.map((it) => <Tx key={it.e.id} e={it.e} r={it.r} />)}</div>
        </div>
      ))}
    </>
  );
}

export { fmtD };
