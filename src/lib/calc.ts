import type { Cartao, Divida, Estado, Evento, Linha } from "./types";

export { ehFixa, ehEmprestimo620 } from "./migrate";

export const assinado = (e: Evento) => (e.tipo === "in" ? e.valor : -e.valor);

/** Entra na conta do caixa? Fora: o que o casal deixou atrasar e o que ainda não é confirmado (se o interruptor estiver desligado). */
export const conta = (s: Estado, e: Evento) => !(e.atrasar && !e.pago) && (!e.est || s.contarEstimados);

export const ordenados = (s: Estado) =>
  [...s.events].sort((a, b) => a.date.localeCompare(b.date) || (a.tipo === b.tipo ? 0 : a.tipo === "in" ? -1 : 1));

/** Saldo corrido de todos os lançamentos em ordem de data (entrada antes de saída no mesmo dia). */
export function razao(s: Estado): Linha[] {
  let saldo = s.saldoInicial;
  return ordenados(s).map((e) => {
    const before = saldo;
    const on = conta(s, e);
    if (on) saldo += assinado(e);
    return { e, before, after: saldo, on };
  });
}

export const saldoReal = (s: Estado) =>
  s.saldoInicial + s.events.filter((e) => e.pago).reduce((t, e) => t + assinado(e), 0);

export const restante = (s: Estado, d: Divida) =>
  Math.max(0, d.valor - s.events.filter((e) => e.pago && e.debt === d.id).reduce((t, e) => t + e.valor, 0));

/** Saldo no fim do planejamento, com ou sem os valores ainda não confirmados. */
export function projecaoFinal(s: Estado, comEstimados: boolean) {
  return s.events.reduce(
    (b, e) => ((!e.est || comEstimados) && (!e.atrasar || e.pago) ? b + assinado(e) : b),
    s.saldoInicial,
  );
}

export interface Deficit { inicio: string; piorDia: string; falta: number; volta: string | null }

/** Primeiro trecho em que o caixa fica negativo: quando começa, o pior momento, quanto falta e quando volta ao positivo. */
export function primeiroDeficit(L: Linha[]): Deficit | null {
  const i = L.findIndex((r) => r.on && r.after < 0);
  if (i < 0) return null;
  let pior = L[i], volta: string | null = null;
  for (let j = i; j < L.length; j++) {
    if (!L[j].on) continue;
    if (L[j].after >= 0) { volta = L[j].e.date; break; }
    if (L[j].after < pior.after) pior = L[j];
  }
  return { inicio: L[i].e.date, piorDia: pior.e.date, falta: -pior.after, volta };
}

/** Último dia do planejamento: 31/12 do ano do último lançamento (ou do ano corrente, se não houver). */
export function fimDoPlano(s: Estado, hojeIso: string): string {
  const ultimo = s.events.reduce((m, e) => (e.date > m ? e.date : m), hojeIso);
  return ultimo.slice(0, 4) + "-12-31";
}

/** Fatura do cartão no mês ("YYYY-MM"): o lançamento no calendário, se existir. Casa pela chave do cartão ou, em dados antigos, pelo nome. */
export function faturaDoMes(s: Estado, c: Cartao, ym: string): Evento | undefined {
  const nome = c.nome.toLowerCase();
  return s.events.find(
    (e) => e.cat === "Cartão" && e.date.startsWith(ym) && (e.cartao ? e.cartao === c.key : e.desc.toLowerCase().includes(nome)),
  );
}

export const valorFatura = (s: Estado, c: Cartao, ym: string) => faturaDoMes(s, c, ym)?.valor ?? c.faturas?.[ym] ?? 0;

/** Os dois meses de fatura que a tela de cartões mostra: o mês corrente e o seguinte ("YYYY-MM"). */
export function mesesDeFatura(hojeIso: string): [string, string] {
  const [y, m] = hojeIso.split("-").map(Number);
  const fmt = (idx: number) => `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
  return [fmt(y * 12 + (m - 1)), fmt(y * 12 + m)];
}

export const mesesComLancamento = (s: Estado) => [...new Set(s.events.map((e) => e.date.slice(0, 7)))].sort();
