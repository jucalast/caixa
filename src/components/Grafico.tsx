"use client";

import { useId } from "react";
import { kMil } from "@/lib/format";
import type { Linha } from "@/lib/types";

const T = (d: string) => new Date(d + "T12:00:00").getTime();

/** Curva do saldo do caixa entre `inicio` e `fim`; marca o pior dia (ou o pico, se nunca negativar). */
export function Grafico({ L, saldoInicial, inicio, fim }: { L: Linha[]; saldoInicial: number; inicio: string; fim: string }) {
  const id = useId().replace(/:/g, "");
  const pts = [{ d: inicio, v: saldoInicial }];
  L.forEach((r) => { if (r.on && r.e.date <= fim && r.e.date >= inicio) pts.push({ d: r.e.date, v: r.after }); });

  const t0 = T(inicio), t1 = Math.max(T(fim), t0 + 864e5);
  const vs = pts.map((p) => p.v), lo = Math.min(0, ...vs), hi = Math.max(0, ...vs);
  const W = 360, H = 180, pl = 8, pr = 8, pt = 22, pb = 24, span = hi - lo || 1;
  const x = (d: string) => pl + Math.min(1, Math.max(0, (T(d) - t0) / (t1 - t0))) * (W - pl - pr);
  const y = (v: number) => pt + ((hi - v) / span) * (H - pt - pb);

  // Degraus amostrados e suavizados
  const N = 60;
  let sm = Array.from({ length: N + 1 }, (_, i) => {
    const t = t0 + ((t1 - t0) * i) / N;
    return pts.reduce((v, p) => (T(p.d) <= t ? p.v : v), pts[0].v);
  });
  for (let k = 0; k < 3; k++) {
    const ant = sm;
    sm = ant.map((_, i) => {
      let s = 0, c = 0;
      for (let j = Math.max(0, i - 2); j <= Math.min(N, i + 2); j++) { s += ant[j]; c++; }
      return s / c;
    });
  }
  const sx = (i: number) => pl + (i / N) * (W - pl - pr);
  const P = sm.map((v, i) => [sx(i), y(Math.min(hi, Math.max(lo, v)))]);
  let path = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(N, i + 2)];
    path += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const y0 = y(0), base = H - pb;
  const area = path + `V${base.toFixed(1)}H${P[0][0].toFixed(1)}Z`;

  // Marcadores de mês: o dia 1 de cada mês dentro do intervalo
  const marcas: { d: string; nome: string }[] = [];
  const NOMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  for (let [yy, mm] = [+inicio.slice(0, 4), +inicio.slice(5, 7) + 1]; ; mm++) {
    if (mm > 12) { mm = 1; yy++; }
    const d = `${yy}-${String(mm).padStart(2, "0")}-01`;
    if (T(d) >= t1) break;
    marcas.push({ d, nome: NOMES[mm - 1] });
  }

  const alvo = lo < 0 ? vs.indexOf(lo) : vs.indexOf(hi);
  const p = pts[Math.max(0, alvo)];
  const k = Math.min(N, Math.max(0, Math.round(((T(p.d) - t0) / (t1 - t0)) * N)));
  const px = sx(k), py = P[k][1];
  const tx = Math.min(Math.max(px, 40), W - 40), ty = Math.max(py - 14, 16);

  return (
    <>
      <div className="chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Como o saldo do caixa muda até o fim do ano">
          <defs>
            <linearGradient id={`cg${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".28" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient>
            <linearGradient id={`cb${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".35" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient>
          </defs>
          {marcas.map((m) => (
            <g key={m.d}>
              <line x1={x(m.d)} x2={x(m.d)} y1={pt} y2={base} stroke="var(--text-muted)" opacity=".18" />
              <text x={x(m.d)} y={H - 6} fill="var(--text-muted)" fontSize="11" textAnchor="middle">{m.nome}</text>
            </g>
          ))}
          <line x1={pl} x2={W - pr} y1={y0} y2={y0} stroke="var(--lav)" strokeWidth="1.5" opacity=".75" />
          <text x={W - pr} y={y0 - 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">R$ 0</text>
          <path d={area} fill={`url(#cg${id})`} />
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x={px - 6} y={py} width="12" height={Math.max(0, base - py)} rx="2" fill={`url(#cb${id})`} />
          <circle cx={px} cy={py} r="8" fill="var(--accent)" opacity=".25" />
          <circle cx={px} cy={py} r="4" fill="var(--accent)" stroke="#fff" strokeWidth="1.5" />
          <rect x={tx - 30} y={ty - 14} width="60" height="22" rx="11" fill="var(--accent)" />
          <text x={tx} y={ty + 1} fill="var(--on-accent)" fontSize="11" fontWeight="700" textAnchor="middle">{kMil(p.v)}</text>
        </svg>
      </div>
      {lo < 0 && <span className="hint">A marca é o pior dia: abaixo da linha lilás (R$ 0) o caixa fica negativo.</span>}
    </>
  );
}
