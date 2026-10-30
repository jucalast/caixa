import { describe, expect, it } from "vitest";
import { pagarFatura } from "./actions";
import { faturaDoMes, mesesDeFatura, primeiroDeficit, projecaoFinal, razao, restante, saldoReal } from "./calc";
import { migrar } from "./migrate";
import { seed } from "./seed";
import { somaMeses } from "./format";
import type { Estado, Evento } from "./types";

const ev = (o: Partial<Evento>): Evento => ({ id: Math.random().toString(), date: "2026-11-01", desc: "x", tipo: "out", valor: 100, cat: "Outros", pago: false, est: false, ...o });
const estado = (events: Evento[], saldo = 0): Estado => ({ ...seed(), saldoInicial: saldo, events, debts: [], cartoes: [] });

describe("razao", () => {
  it("entrada vem antes da saída no mesmo dia", () => {
    const s = estado([ev({ tipo: "out", valor: 50 }), ev({ tipo: "in", valor: 30 })], 20);
    expect(razao(s).map((r) => r.after)).toEqual([50, 0]);
  });
  it("ignora o que foi deixado atrasar e o não confirmado", () => {
    const s = estado([ev({ atrasar: true, valor: 40 }), ev({ est: true, valor: 60 })], 100);
    expect(razao(s).at(-1)!.after).toBe(100);
    expect(projecaoFinal(s, true)).toBe(40);
    expect(projecaoFinal(s, false)).toBe(100);
  });
});

describe("saldoReal / restante", () => {
  it("só conta o que foi marcado como pago", () => {
    const s = estado([ev({ pago: true, valor: 30 }), ev({ valor: 70 })], 100);
    expect(saldoReal(s)).toBe(70);
  });
  it("abate a dívida pelos pagamentos ligados a ela", () => {
    const s = estado([ev({ pago: true, valor: 300, debt: "d" }), ev({ valor: 200, debt: "d" })]);
    expect(restante(s, { id: "d", nome: "d", valor: 1000, grupo: "outro" })).toBe(700);
  });
});

describe("primeiroDeficit", () => {
  it("acha início, pior dia e volta", () => {
    const s = estado([ev({ date: "2026-11-01", valor: 150 }), ev({ date: "2026-11-02", valor: 100 }), ev({ date: "2026-11-03", tipo: "in", valor: 500 })], 100);
    expect(primeiroDeficit(razao(s))).toEqual({ inicio: "2026-11-01", piorDia: "2026-11-02", falta: 150, volta: "2026-11-03" });
  });
  it("devolve null quando o caixa não fica negativo", () => {
    expect(primeiroDeficit(razao(estado([ev({ valor: 10 })], 100)))).toBeNull();
  });
});

describe("faturaDoMes", () => {
  it("casa por nome sem tratar o nome como regex", () => {
    const c = { key: "x", nome: "Cartão (Pro)+", diaVenc: 5, faturas: {} };
    const s = estado([ev({ cat: "Cartão", date: "2026-11-05", desc: "Fatura cartão (pro)+", valor: 10 })]);
    expect(faturaDoMes(s, c, "2026-11")?.valor).toBe(10);
  });
  it("prefere a chave do cartão quando o lançamento a tem", () => {
    const c = { key: "a", nome: "Nubank", diaVenc: 5, faturas: {} };
    const s = estado([ev({ cat: "Cartão", date: "2026-11-05", desc: "Nubank", cartao: "b", valor: 1 }), ev({ cat: "Cartão", date: "2026-11-05", desc: "outro", cartao: "a", valor: 2 })]);
    expect(faturaDoMes(s, c, "2026-11")?.valor).toBe(2);
  });
});

describe("datas", () => {
  it("somaMeses respeita meses curtos e vira o ano", () => {
    expect(somaMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(somaMeses("2026-12-15", 1)).toBe("2027-01-15");
    expect(somaMeses("2026-01-31", 2, 31)).toBe("2026-03-31");
  });
  it("mesesDeFatura vira o ano", () => {
    expect(mesesDeFatura("2026-12-10")).toEqual(["2026-12", "2027-01"]);
  });
});

describe("migrar", () => {
  it("não muta a entrada e completa estados antigos", () => {
    const antigo = { events: [ev({ desc: "Faculdade", cat: "Faculdade", fixa: true })], debts: [] } as unknown as Estado;
    const novo = migrar(antigo);
    expect(antigo.events[0].prazo).toBeUndefined();
    expect(novo.events[0].prazo).toBe("24 meses");
    expect(novo.debts.some((d) => d.id === "d_emp620")).toBe(true);
    expect(novo.cartoes.length).toBe(3);
  });
});

describe("pagarFatura", () => {
  const base = () => {
    const s = estado([
      ev({ id: "f1", cat: "Cartão", date: "2026-11-20", desc: "Fatura cartão Caixa", valor: 900, cartao: "caixa" }),
    ]);
    s.cartoes = [{ key: "caixa", nome: "Cartão Caixa", diaVenc: 20, faturas: {} }];
    return s;
  };
  it("pagamento parcial cria a fatura do mês seguinte com o resto", () => {
    const s = base();
    pagarFatura(s, "f1", 300);
    expect(s.events.find((e) => e.id === "f1")).toMatchObject({ pago: true, valor: 300 });
    expect(s.events.find((e) => e.id !== "f1")).toMatchObject({ date: "2026-12-20", valor: 600, cartao: "caixa", pago: false });
  });
  it("soma o resto na fatura já existente do mês seguinte", () => {
    const s = base();
    s.events.push(ev({ id: "f2", cat: "Cartão", date: "2026-12-20", desc: "Fatura dez", valor: 100, cartao: "caixa" }));
    pagarFatura(s, "f1", 300);
    expect(s.events.find((e) => e.id === "f2")!.valor).toBe(700);
    expect(s.events).toHaveLength(2);
  });
  it("valor integral só marca como paga", () => {
    const s = base();
    pagarFatura(s, "f1", "total");
    expect(s.events).toHaveLength(1);
    expect(s.events[0].pago).toBe(true);
  });
});
