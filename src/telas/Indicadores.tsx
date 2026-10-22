// Indicadores (BI) — novo. A planilha era um arquivo por mês; com o histórico contínuo dá para ver a tendência.
import { useDados } from '../componentes/Dados';
import { Bloco, Contador, TituloPagina } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { Barras, BarrasAgrupadas, BarrasH } from '../componentes/Graficos';
import { custoMes, totalFaturado } from '../regras/custo';
import { pesoRnc } from '../regras/qualidade';
import { resumoMes } from '../regras/insumos';
import { mesCurto, mesDe, somaMes, ultimosMeses } from '../regras/periodo';
import { hoje } from '../util/datas';
import { moeda, n0, n1, pct, rkg, soma } from '../util/formato';

export function Indicadores() {
  const { base } = useDados();
  const hj = hoje();
  const meses = ultimosMeses(somaMes(mesDe(hj), -1), 6); // 6 meses fechados
  const cm = meses.map((m) => ({ m, c: custoMes(base, m), f: totalFaturado(base, m) }));
  const ini = meses[0] + '-01', fim = meses[meses.length - 1] + '-31';
  const fat6 = base.faturamento.filter((n) => n.data >= ini && n.data <= fim);
  const porCli = base.clientes.map((c) => ({ rotulo: c.nome, valor: soma(fat6.filter((n) => n.clienteId === c.id), (n) => n.quantidadeKg * n.precoKg) })).filter((x) => x.valor).sort((a, b) => b.valor - a.valor).slice(0, 8);
  const rnc6 = base.rncs.filter((r) => r.data >= ini && r.data <= fim);
  const porMotivo = [...new Set(rnc6.map((r) => r.motivo))].map((mt) => ({ rotulo: mt, valor: soma(rnc6.filter((r) => r.motivo === mt), pesoRnc) })).sort((a, b) => b.valor - a.valor).slice(0, 7);
  const insumos = base.insumos.map((i) => ({ rotulo: i.nome, valor: soma(meses, (m) => resumoMes(i, base.movimentos, m).gastoUtilizado) })).sort((a, b) => b.valor - a.valor).slice(0, 8);
  const u = cm[cm.length - 1], a = cm[cm.length - 2];
  // variação contra o mês anterior: em % para valores; em pontos percentuais (p.p.) para indicadores que já são %
  const varr = (x: number, y: number, menorMelhor = false, pp = false) => {
    if (!y) return null;
    const d = pp ? x - y : (x - y) / y; const melhor = menorMelhor ? d < 0 : d > 0;
    const txt = pp ? `${n1(Math.abs(d) * 100)} p.p.` : pct(Math.abs(d));
    return <em className={'var ' + (Math.abs(d) < 0.0005 ? 'neutro' : melhor ? 'melhor' : 'pior')} title="contra o mês anterior">{d >= 0 ? '▲' : '▼'} {txt}</em>;
  };
  const kfmt = (v: number) => (v >= 1000 ? `${n0(v / 1000)} mil` : n0(v));
  return (
    <>
      <TituloPagina titulo="Indicadores" sub={`Últimos 6 meses fechados · ${mesCurto(meses[0])} a ${mesCurto(meses[meses.length - 1])}`} />
      <div className="contadores c6">
        <Contador icone="carteira" valor={<>{rkg(u.c.custoKg)}{varr(u.c.custoKg, a.c.custoKg, true)}</>} rot={`custo/kg · ${mesCurto(u.m)}`} />
        <Contador icone="peca" valor={<>{n1(u.c.metalLimpo / 1000)} t{varr(u.c.metalLimpo, a.c.metalLimpo)}</>} rot="metal limpo" />
        <Contador icone="grafico" valor={<>{pct(u.c.rendimento)}{varr(u.c.rendimento, a.c.rendimento, false, true)}</>} rot="rendimento metálico" />
        <Contador icone="alerta" valor={<>{pct(u.c.refugoPct, 2)}{varr(u.c.refugoPct, a.c.refugoPct, true, true)}</>} rot="refugo" />
        <Contador icone="dinheiro" valor={<>{moeda(u.f.valor).replace(/,\d\d$/, '')}{varr(u.f.valor, a.f.valor)}</>} rot="faturado" />
        <Contador icone="orcamento" valor={<>{rkg(u.f.kg ? u.f.valor / u.f.kg : 0)}</>} rot="preço médio faturado" />
      </div>
      <div className="grade-bi">
        <Bloco titulo={<><Icone n="carteira" /> Custo por kg fabricado (R$)</>}><div className="pad"><Barras fmt={(v) => n1(v)} dados={cm.map((x) => ({ rotulo: mesCurto(x.m), valor: x.c.custoKg }))} /></div></Bloco>
        <Bloco titulo={<><Icone n="dinheiro" /> Faturado × custo total (R$)</>}><div className="pad"><BarrasAgrupadas series={['Faturado', 'Custo total']} fmt={(v) => moeda(v).replace(/,\d\d$/, '')} fmtEixo={kfmt} grupos={cm.map((x) => ({ rotulo: mesCurto(x.m), valores: [x.f.valor, x.c.custoTotal] }))} /></div></Bloco>
        <Bloco titulo={<><Icone n="peca" /> Metal limpo produzido (kg)</>}><div className="pad"><Barras fmt={kfmt} dados={cm.map((x) => ({ rotulo: mesCurto(x.m), valor: x.c.metalLimpo, nota: `${x.c.corridas} corridas` }))} /></div></Bloco>
        <Bloco titulo={<><Icone n="alerta" /> Refugo (% do metal bruto)</>}><div className="pad"><Barras fmt={(v) => `${n1(v)}%`} dados={cm.map((x) => ({ rotulo: mesCurto(x.m), valor: +(x.c.refugoPct * 100).toFixed(2) }))} /></div></Bloco>
        <Bloco titulo={<><Icone n="predio" /> Faturado por cliente · 6 meses</>}><div className="pad"><BarrasH dados={porCli} fmt={(v) => moeda(v).replace(/,\d\d$/, '')} /></div></Bloco>
        <Bloco titulo={<><Icone n="caixa" /> Insumos que mais pesam no custo · 6 meses</>}><div className="pad"><BarrasH dados={insumos} fmt={(v) => moeda(v).replace(/,\d\d$/, '')} /></div></Bloco>
        <Bloco className="bi-largo" titulo={<><Icone n="alerta" /> Peso perdido por motivo de RNC · 6 meses (kg)</>}><div className="pad"><BarrasH dados={porMotivo} fmt={(v) => n0(v)} /></div></Bloco>
      </div>
    </>
  );
}
