"use client";

import { useMemo, useState } from "react";
import { definirContarEstimados } from "@/lib/actions";
import {
  ehEmprestimo620, ehFixa, fimDoPlano, mesesComLancamento, mesesDeFatura, primeiroDeficit, projecaoFinal, razao,
  restante, saldoReal, valorFatura, faturaDoMes,
} from "@/lib/calc";
import { brl, brl0, fmtD, hoje, nomeMes } from "@/lib/format";
import { GRUPOS } from "@/lib/seed";
import { useCaixa } from "@/lib/store";
import type { Evento, Linha } from "@/lib/types";
import { useDialogos } from "./Dialogos";
import { Grafico } from "./Grafico";
import { PorDia, situacao } from "./Movimentos";
import { Hero, ICONE_GRUPO, P, Svg } from "./ui";

export type Aba = "resumo" | "calendario" | "contas" | "dividas";
type Ir = (a: Aba) => void;

const par = (itens: Linha[]) => itens.map((r) => ({ e: r.e, r }));

/* ───────── Resumo ───────── */
export function Resumo({ ir, esconder, alternarEsconder }: { ir: Ir; esconder: boolean; alternarEsconder: () => void }) {
  const { S, update } = useCaixa();
  const { abrirEvento, abrirSaldo, abrirEmprestimo } = useDialogos();
  const hojeIso = hoje();
  const L = useMemo(() => razao(S), [S]);
  const real = saldoReal(S);
  const pOn = projecaoFinal(S, true), pOff = projecaoFinal(S, false);
  const fim = S.contarEstimados ? pOn : pOff;
  const dg = primeiroDeficit(L);
  const fimPlano = fimDoPlano(S, hojeIso);
  const fimRotulo = fmtD(fimPlano);
  const dev = (gs: string[]) => S.debts.filter((d) => gs.includes(d.grupo)).reduce((t, d) => t + restante(S, d), 0);
  const urgentes = dev(["atraso", "juros"]), atrasadas = dev(["atraso"]), juros = dev(["juros"]), calma = dev(["familia"]);
  const aConfirmar = S.events.filter((e) => e.est && e.tipo === "in").reduce((t, e) => t + e.valor, 0);
  const vencidas = L.filter((r) => !r.e.pago && r.e.tipo === "out" && r.e.date <= hojeIso);
  const proximas = L.filter((r) => !r.e.pago && r.e.date >= hojeIso).slice(0, 8);
  const hr = new Date().getHours(), oi = hr < 12 ? "Bom dia" : hr < 18 ? "Boa tarde" : "Boa noite";
  const emp = S.debts.find(ehEmprestimo620);
  const primeiro = S.events.reduce((m, e) => (e.date < m ? e.date : m), hojeIso);
  const comSaldo = real !== 0 || S.saldoDefinido;

  return (
    <>
      <div className="hello">
        <div className="hello-t"><small>{oi}</small><h1>João e Giovana</h1></div>
        <button className="eye" type="button" aria-label={esconder ? "Mostrar valores" : "Esconder valores"} aria-pressed={esconder} onClick={alternarEsconder}><Svg d={P.eye} /></button>
      </div>

      <section className="wallet">
        <div className="w-top">
          <span>Na conta hoje</span>
          <button className="btn sm ghost" type="button" onClick={abrirSaldo} style={{ padding: "2px 10px", fontSize: 11, height: 24, borderRadius: "var(--r-md)", background: "rgba(255,255,255,.18)", border: 0, color: "#fff" }}>Ajustar saldo</button>
        </div>
        <div className="w-val num">
          {comSaldo
            ? <><span className="cur">R$</span>{brl0(real).replace(/^(-?)R\$\s?/, "$1")}</>
            : <button type="button" onClick={abrirSaldo} style={{ background: "none", border: 0, color: "#fff", fontSize: 22, fontWeight: 700, textDecoration: "underline", padding: 0 }}>Definir saldo em conta</button>}
        </div>
        <div className={`w-pill ${dg ? "bad" : "ok"}`}>
          <Svg d={dg ? P.alert : P.check} />{dg ? "Vai faltar dinheiro em " + fmtD(dg.inicio) : `Caixa coberto até ${fimRotulo}`}
        </div>
        <div className="w-row">
          <div><small>Fecha {nomeMes(fimPlano.slice(0, 7)).toLowerCase()} com</small><b className="num">{brl0(fim)}</b></div>
          <div><small>Dívidas urgentes</small><b className="num">{brl0(urgentes)}</b></div>
        </div>
      </section>

      <div className="quick">
        <button className="q" type="button" onClick={() => abrirEvento(null, { tipo: "out" })}><span className="qi out"><Svg d={P.out} /></span><span>Saída</span></button>
        <button className="q" type="button" onClick={() => abrirEvento(null, { tipo: "in" })}><span className="qi in"><Svg d={P.in} /></span><span>Entrada</span></button>
        <button className="q" type="button" onClick={() => ir("contas")}><span className="qi"><Svg d={P.list} /></span><span>Contas</span></button>
        <button className="q" type="button" onClick={() => ir("dividas")}><span className="qi"><Svg d={P.card} /></span><span>Dívidas</span></button>
      </div>

      {emp?.pendenteInfo && (
        <button className="banner-pendente" type="button" onClick={abrirEmprestimo} style={{ border: 0, textAlign: "left", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Svg d={P.info} size={20} sw={2.5} />
            <div><div style={{ fontSize: 13, fontWeight: 700 }}>Parcela de R$ 620 pendente de informação</div><div style={{ fontSize: 11, opacity: 0.9 }}>Falta confirmar parcelas restantes e prazo final</div></div>
          </div>
          <span className="chip bad" style={{ fontWeight: 700, fontSize: 11 }}>Completar</span>
        </button>
      )}

      <div className="card">
        <Hero icone={P.wallet} titulo="O que está acontecendo" meta="Resumo em português claro" />
        <div className="sect">
          {dg
            ? <div className="sit bad"><b>Vai faltar dinheiro.</b> A partir de {fmtD(dg.inicio)} as contas passam do que entrou. No pior dia ({fmtD(dg.piorDia)}) faltam <b className="num">{brl0(dg.falta)}</b>{dg.volta ? `, e o caixa volta ao positivo em ${fmtD(dg.volta)}` : ` e o caixa não volta ao positivo até ${fimRotulo}`}.</div>
            : <div className="sit ok"><b>Tudo coberto.</b> Pelo que está lançado, o caixa não fica negativo até {fimRotulo}.</div>}
          {aConfirmar > 0 && !S.contarEstimados && (
            <span className="hint">Esta conta só usa dinheiro confirmado. Ainda não entram {brl0(aConfirmar)} a confirmar{pOn - pOff > 0 ? ` — com eles você fecharia o ano com ${brl0(pOn)}` : ""}.</span>
          )}
          <label className="switch"><input type="checkbox" checked={S.contarEstimados} onChange={(e) => update(definirContarEstimados, e.target.checked)} /><span>Considerar também o que ainda não está confirmado (parcela dos cartões)</span></label>
          <div className="minis">
            <button className="mini" type="button" onClick={() => ir("dividas")}><small>Atrasadas</small><b className="num">{brl0(atrasadas)}</b></button>
            <button className="mini" type="button" onClick={() => ir("dividas")}><small>Cheque especial</small><b className="num">{brl0(juros)}</b></button>
            <button className="mini" type="button" onClick={() => ir("dividas")}><small>Sem prazo</small><b className="num">{brl0(calma)}</b></button>
          </div>
        </div>
      </div>

      <div className="card">
        <Hero icone={P.cal} titulo="Como o caixa evolui" meta="Cada degrau é uma entrada ou saída" />
        <div className="sect"><Grafico L={L} saldoInicial={S.saldoInicial} inicio={primeiro} fim={fimPlano} /></div>
      </div>

      {vencidas.length > 0 && <div><div className="sec-t">Venceu e ainda não marquei como pago</div><PorDia itens={par(vencidas)} /></div>}

      <div>
        <div className="sec-t">Próximos movimentos</div>
        {proximas.length ? <PorDia itens={par(proximas)} /> : <div className="empty">Nada planejado daqui pra frente.</div>}
        <span className="hint" style={{ display: "block", marginTop: 8 }}>Toque numa linha para editar. O círculo marca como pago ou recebido.</span>
      </div>
    </>
  );
}

/* ───────── Calendário ───────── */
export function Calendario() {
  const { S } = useCaixa();
  const { abrirEvento } = useDialogos();
  const L = useMemo(() => razao(S), [S]);
  const hojeIso = hoje();
  const meses = mesesComLancamento(S);
  const [escolhido, setMes] = useState<string | null>(null);
  const mes = escolhido && (escolhido === "all" || meses.includes(escolhido)) ? escolhido : meses.includes(hojeIso.slice(0, 7)) ? hojeIso.slice(0, 7) : meses[0] ?? "all";
  const linhas = L.filter((r) => mes === "all" || r.e.date.startsWith(mes));
  const on = linhas.filter((r) => r.on);
  const entra = on.filter((r) => r.e.tipo === "in").reduce((t, r) => t + r.e.valor, 0);
  const sai = on.filter((r) => r.e.tipo === "out").reduce((t, r) => t + r.e.valor, 0);
  const fica = on.length ? on[on.length - 1].after : S.saldoInicial;

  return (
    <>
      <div className="card">
        <Hero icone={P.cal} titulo="Calendário" meta="Tudo que entra e sai, mês a mês" />
        <div className="sect">
          <div className="chips scroll">
            {[...meses, "all"].map((m) => <button key={m} type="button" className={`chip big ${m === mes ? "p" : ""}`} onClick={() => setMes(m)}>{m === "all" ? "Tudo" : nomeMes(m)}</button>)}
          </div>
          <div className="minis">
            <div className="mini"><small>Entra</small><b className="num pos">{brl0(entra)}</b></div>
            <div className="mini"><small>Sai</small><b className="num">{brl0(sai)}</b></div>
            <div className="mini"><small>Fica</small><b className={`num ${fica < 0 ? "neg" : ""}`}>{brl0(fica)}</b></div>
          </div>
        </div>
      </div>
      <div className="cal-movs" style={{ padding: 0 }}>
        <div className="only-m">{linhas.length ? <PorDia itens={par(linhas)} /> : <div className="empty">Sem lançamentos neste período.</div>}</div>
        <div className="tbl-wrap only-d">
          <table>
            <thead><tr><th>Data</th><th>Descrição</th><th className="r">Entrada</th><th className="r">Saída</th><th className="r">Saldo anterior</th><th className="r">Saldo após</th><th>Situação</th></tr></thead>
            <tbody>
              {linhas.length === 0 && <tr><td colSpan={7} className="empty">Sem lançamentos neste período.</td></tr>}
              {linhas.map((r, i) => {
                const e = r.e, antes = linhas[i - 1];
                const cab = mes === "all" && (!antes || antes.e.date.slice(0, 7) !== e.date.slice(0, 7));
                const { texto, cl } = situacao(e, r, hojeIso);
                return (
                  <FragmentoLinha key={e.id} cab={cab ? `${nomeMes(e.date.slice(0, 7))} ${e.date.slice(0, 4)}` : null}>
                    <tr className={`${e.pago ? "done" : ""} ${e.est ? "est" : ""} ${r.on ? "" : "off"} ${e.date === hojeIso ? "today" : ""}`} onClick={() => abrirEvento(e.id)} style={{ cursor: "pointer" }}>
                      <td className="num">{fmtD(e.date)}</td>
                      <td className="desc"><div className="d-main">{e.desc}</div><div className="d-sub">{e.cat}{e.debt ? " · abate dívida" : ""}</div></td>
                      <td className="r num pos">{e.tipo === "in" ? brl(e.valor) : ""}</td>
                      <td className="r num">{e.tipo === "out" ? brl(e.valor) : ""}</td>
                      <td className="r num" style={{ color: "var(--text-muted)" }}>{brl(r.before)}</td>
                      <td className={`r num ${r.after < 0 ? "neg" : ""}`}><b>{brl(r.after)}</b></td>
                      <td><span className={`chip ${cl}`}>{!r.on && !e.pago && !e.atrasar ? "Não confirmado" : texto}</span></td>
                    </tr>
                  </FragmentoLinha>
                );
              })}
            </tbody>
          </table>
        </div>
        <span className="hint" style={{ display: "block", marginTop: 8 }}>Toque numa linha para editar.</span>
      </div>
    </>
  );
}

function FragmentoLinha({ cab, children }: { cab: string | null; children: React.ReactNode }) {
  return <>{cab && <tr className="month-row"><td colSpan={7}>{cab}</td></tr>}{children}</>;
}

/* ───────── Contas (fixas e esporádicas) ───────── */
export function Contas() {
  const { S } = useCaixa();
  const { abrirEvento } = useDialogos();
  const meses = mesesComLancamento(S);
  const [escolhido, setMes] = useState("all");
  const mes = escolhido === "all" || meses.includes(escolhido) ? escolhido : "all";
  const [aba, setAba] = useState<"fixas" | "esporadicas">("fixas");

  const doMes = S.events.filter((e) => mes === "all" || e.date.startsWith(mes));
  const fixas = doMes.filter(ehFixa), esporadicas = doMes.filter((e) => !ehFixa(e));
  const soma = (l: Evento[], t: "in" | "out") => l.filter((e) => e.tipo === t).reduce((s, e) => s + e.valor, 0);
  const fixasIn = soma(fixas, "in"), fixasOut = soma(fixas, "out");
  const lista = [...(aba === "fixas" ? fixas : esporadicas)].sort((a, b) => a.date.localeCompare(b.date));
  const periodo = mes === "all" ? "Todas as contas" : nomeMes(mes);

  return (
    <>
      <div className="card">
        <Hero icone={P.list} titulo="Contas" meta="Separação inteligente entre contas fixas e esporádicas" />
        <div className="sect">
          <div className="chips scroll" style={{ marginBottom: 10 }}>
            <button type="button" className={`chip big ${aba === "fixas" ? "p" : ""}`} onClick={() => setAba("fixas")}>Contas Fixas ({fixas.length})</button>
            <button type="button" className={`chip big ${aba === "esporadicas" ? "p" : ""}`} onClick={() => setAba("esporadicas")}>Contas Esporádicas ({esporadicas.length})</button>
          </div>
          <div className="chips scroll" style={{ marginBottom: 12 }}>
            {["all", ...meses].map((m) => <button key={m} type="button" className={`chip ${m === mes ? "p" : ""}`} onClick={() => setMes(m)}>{m === "all" ? "Todas as contas" : nomeMes(m)}</button>)}
          </div>
          <div className="minis">
            {aba === "fixas" ? (
              <>
                <div className="mini"><small>Entradas fixas</small><b className="num pos">{brl0(fixasIn)}</b></div>
                <div className="mini"><small>Gastos fixos</small><b className="num">{brl0(fixasOut)}</b></div>
                <div className="mini"><small>Balanço fixo</small><b className={`num ${fixasIn - fixasOut < 0 ? "neg" : ""}`}>{brl0(fixasIn - fixasOut)}</b></div>
              </>
            ) : (
              <>
                <div className="mini"><small>Total esporádico</small><b className="num">{brl0(soma(esporadicas, "out"))}</b></div>
                <div className="mini"><small>Lançamentos</small><b>{esporadicas.length} itens</b></div>
                <div className="mini"><small>Período</small><b>{mes === "all" ? "Geral" : nomeMes(mes)}</b></div>
              </>
            )}
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <span className="hint">{aba === "fixas" ? "Compromissos essenciais que se repetem todo mês com seus prazos." : "Gastos avulsos, imprevistos ou compras pontuais."}</span>
            <span className="sp" />
            <button className="btn sm" type="button" onClick={() => abrirEvento(null, { fixa: aba === "fixas", cat: aba === "fixas" ? "Moradia" : "Outros" })}>{aba === "fixas" ? "+ Nova conta fixa" : "+ Nova conta esporádica"}</button>
          </div>
        </div>
      </div>
      <div className="cal-movs" style={{ padding: 0 }}>
        <div className="sec-t" style={{ marginTop: 6 }}>Lançamentos de {aba === "fixas" ? "Contas Fixas" : "Contas Esporádicas"} ({periodo})</div>
        {lista.length ? <PorDia itens={lista.map((e) => ({ e, r: null }))} /> : <div className="empty">Nenhuma conta cadastrada nesta categoria para o período.</div>}
        <span className="hint" style={{ display: "block", marginTop: 8 }}>Arraste para o lado para deixar atrasar sem excluir do planejamento. Toque para editar.</span>
      </div>
    </>
  );
}

/* ───────── Dívidas e cartões ───────── */
export function Dividas() {
  const { S } = useCaixa();
  const { abrirDivida, pagarDivida, abrirEmprestimo, abrirCartoes } = useDialogos();
  const [m1, m2] = mesesDeFatura(hoje());
  const total = S.debts.reduce((t, d) => t + d.valor, 0), falta = S.debts.reduce((t, d) => t + restante(S, d), 0);
  const ordem = ["atraso", "juros", "cartao", "familia", "outro"];

  return (
    <>
      <div className="card">
        <Hero icone={P.card} titulo="Dívidas & Cartões" meta={`Quitado ${brl0(total - falta)} de ${brl0(total)} · restam ${brl0(falta)}`} />
        <div className="sect">
          <div className="row">
            <span className="hint">Cada saída ligada a uma dívida abate o saldo automaticamente.</span>
            <span className="sp" />
            <button className="btn sm ghost" type="button" onClick={() => abrirDivida(null)}>+ Nova dívida</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="hero" style={{ paddingBottom: 0 }}><div><h2 style={{ fontSize: 17 }}>Cartões & Futuras Faturas</h2><div className="meta">Ajuste e planeje as próximas faturas</div></div></div>
        <div className="sect">
          <div className="grid">
            {S.cartoes.map((c) => {
              const f1 = faturaDoMes(S, c, m1), v2 = valorFatura(S, c, m2);
              return (
                <div key={c.key} className="debt" style={{ marginBottom: 8 }}>
                  <div className="row"><h4 className="dh"><Svg d={P.card} /><span>{c.nome}</span></h4><span className="sp" /><span className="chip">Dia {String(c.diaVenc).padStart(2, "0")}</span></div>
                  <div className="row" style={{ marginTop: 4, gap: 8 }}>
                    <div className="fatura-box"><small>Fatura {nomeMes(m1)}</small><div className="num">{brl0(valorFatura(S, c, m1))} {f1?.pago && <span className="chip ok" style={{ fontSize: 10 }}>Paga</span>}</div></div>
                    <div className="fatura-box"><small>Fatura {nomeMes(m2)}</small><div className="num">{v2 > 0 ? brl0(v2) : <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>A definir</span>}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn sm ghost" type="button" onClick={abrirCartoes} style={{ width: "100%", marginTop: 6 }}>Planejar futuras faturas dos cartões</button>
        </div>
      </div>

      {ordem.map((g) => {
        const ds = S.debts.filter((d) => d.grupo === g);
        if (!ds.length) return null;
        return (
          <div className="card" key={g}>
            <div className="hero" style={{ paddingBottom: 0 }}><div><h2 style={{ fontSize: 17 }}>{GRUPOS[g]}</h2><div className="meta">{brl0(ds.reduce((t, d) => t + restante(S, d), 0))} em aberto</div></div></div>
            <div className="sect">
              <div className="grid">
                {ds.map((d) => {
                  const l = restante(S, d), pct = d.valor ? Math.round((1 - l / d.valor) * 100) : 100, pend = !!d.pendenteInfo;
                  return (
                    <div key={d.id} className={`debt ${pend ? "card-alerta-pendente" : ""}`}>
                      <div className="row">
                        <h4 className="dh"><Svg d={ICONE_GRUPO[d.grupo] ?? P.dots} /><span>{d.nome}</span></h4><span className="sp" />
                        {pend ? <span className="chip bad" style={{ fontWeight: 700 }}>FALTA INFORMAÇÃO</span> : l === 0 ? <span className="chip ok">Quitada</span> : null}
                      </div>
                      <div className={`amt num ${l === 0 ? "pos" : ""}`}>{brl(l)}</div>
                      <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i className={l === 0 ? "ok" : ""} style={{ width: `${pct}%` }} /></div>
                      <div className="hint" style={pend ? { color: "var(--danger)", fontWeight: 600 } : undefined}>
                        {pend ? "Atenção: Defina parcelas restantes e prazo final desta conta fixa." : `${pct}% pago de ${brl(d.valor)}${d.nota ? " · " + d.nota : ""}`}
                      </div>
                      <div className="row" style={{ marginTop: 8 }}>
                        {pend ? <button className="btn sm danger" type="button" onClick={abrirEmprestimo}>Preencher dados do empréstimo</button>
                          : <button className="btn sm" type="button" onClick={() => pagarDivida(d.id)}>Registrar pagamento</button>}
                        <button className="btn sm ghost" type="button" onClick={() => abrirDivida(d.id)}>Editar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
