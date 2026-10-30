export const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const DSEM = ["dom","seg","ter","qua","qui","sex","sáb"];

export const brl = (v: number) =>
  (v < 0 ? "-" : "") + "R$ " + Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const brl0 = (v: number) => (v < 0 ? "-" : "") + "R$ " + Math.abs(Math.round(v)).toLocaleString("pt-BR");
export const kMil = (v: number) => (v < 0 ? "−" : "") + "R$ " + (Math.abs(v) / 1000).toFixed(1).replace(".", ",") + " mil";

export const iso = (d: Date) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const hoje = () => iso(new Date());
export const fmtD = (s: string) => s.slice(8, 10) + "/" + s.slice(5, 7);
export const nomeMes = (ym: string) => MESES[+ym.slice(5, 7) - 1];
export const uid = () => "x" + Math.random().toString(36).slice(2, 9);

/** Soma `n` meses a uma data ISO, mantendo o dia (ou o último dia do mês, se o mês for mais curto). */
export function somaMeses(date: string, n: number, diaAlvo?: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  const ny = Math.floor(idx / 12), nm = (idx % 12) + 1;
  const ultimo = new Date(ny, nm, 0).getDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(diaAlvo ?? d, ultimo)).padStart(2, "0")}`;
}

export function rotuloDia(d: string, hojeIso = hoje()): string {
  const dif = Math.round((new Date(d + "T12:00:00").getTime() - new Date(hojeIso + "T12:00:00").getTime()) / 864e5);
  const base = DSEM[new Date(d + "T12:00:00").getDay()] + ", " + fmtD(d);
  return dif === 0 ? "Hoje · " + fmtD(d) : dif === 1 ? "Amanhã · " + fmtD(d) : dif === -1 ? "Ontem · " + fmtD(d) : base;
}
