import { ID_EMPRESTIMO, cartoesPadrao, emprestimoPadrao, seed } from "./seed";
import type { Estado, Evento } from "./types";

const PRAZOS_PADRAO: Record<string, string> = {
  "Financiamento Indaiatuba": "360 meses",
  "Faculdade": "24 meses",
  "Parcela apto SP": "35 meses",
  "Parcela principal apto SP": "35 meses",
  "Parcela do empréstimo": "35 meses",
  "Aluguel apto SP": "30 meses",
};
const CATS_FIXAS = ["Moradia","Financiamento","Faculdade","Transporte","Casa","Empréstimo","Salário","Aluguel recebido"];

/** Conta fixa = recorrente. Lançamentos antigos sem a marca caem na regra por categoria. */
export const ehFixa = (e: Pick<Evento, "fixa" | "cat">) => (typeof e.fixa === "boolean" ? e.fixa : CATS_FIXAS.includes(e.cat));

export const ehEmprestimo620 = (d: { id: string; nome: string }) => d.id === ID_EMPRESTIMO || /empr[ée]stimo.*620/i.test(d.nome);

/** Aceita qualquer versão antiga do estado (localStorage ou nuvem) e devolve uma completa. Nunca muta a entrada. */
export function migrar(entrada: Partial<Estado> | null | undefined): Estado {
  if (!entrada) return seed();
  const s = structuredClone(entrada) as Estado;
  s.events ||= [];
  s.debts ||= [];
  if (s.saldoDefinido === undefined) s.saldoDefinido = typeof s.saldoInicial === "number" && s.saldoInicial > 0;
  s.saldoInicial = Number(s.saldoInicial) || 0;
  s.contarEstimados = !!s.contarEstimados;

  const emp = s.debts.find(ehEmprestimo620);
  if (!emp) s.debts.push(emprestimoPadrao());
  else if (emp.numParcelas || emp.prazo || emp.prazoFinal) {
    emp.pendenteInfo = false;
    emp.prazo ||= emp.numParcelas ? `${emp.numParcelas} meses` : "35 meses";
  }

  for (const e of s.events) {
    if (!ehFixa(e) || e.prazo) continue;
    const achado = Object.entries(PRAZOS_PADRAO).find(([k]) => e.desc?.includes(k));
    e.prazo = achado ? achado[1] : "Mensal";
  }

  s.cartoes ||= cartoesPadrao();
  s.salarioConfig ||= { brutoTotal: 6200, d1: "2026-11-20", d2: "2026-12-20" };
  return s;
}
