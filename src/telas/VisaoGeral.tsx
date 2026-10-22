// Visão Geral — substitui o ÍNDICE da planilha. Cada perfil vê os números e as pendências do seu setor.
import { Link } from 'react-router-dom';
import { useDados } from '../componentes/Dados';
import { Bloco, Contador, Tag, TituloPagina, Vazio } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { Barras } from '../componentes/Graficos';
import { Progresso } from './OrdensProducao';
import { useSessao } from '../acesso/Sessao';
import { podeAbrir } from '../acesso/paginas';
import { custoMes, totalFaturado } from '../regras/custo';
import { pesosFicha, rendimento, situacaoFicha } from '../regras/forno';
import { abaixoDoMinimo } from '../regras/insumos';
import { STATUS_OP, progressoOP } from '../regras/producao';
import { mesDe, nomeMesLongo, somaMes } from '../regras/periodo';
import { br, brCurto, extenso, hoje, somaDias } from '../util/datas';
import { kg, moeda, n0, pct, rkg, soma } from '../util/formato';

export function VisaoGeral() {
  const { base } = useDados();
  const s = useSessao();
  const perfil = s.usuario!.perfil;
  const pode = (p: string) => podeAbrir(p, perfil);
  const hj = hoje(), mes = mesDe(hj), anterior = somaMes(mes, -1);
  const cAt = custoMes(base, mes), cAnt = custoMes(base, anterior);
  const fat = totalFaturado(base, mes);
  const ops = base.ops.map((o) => ({ o, p: progressoOP(o, base, hj) })).filter((x) => x.p.status !== 'concluida').sort((a, b) => a.o.dataPrevista.localeCompare(b.o.dataPrevista));
  const atrasadas = ops.filter((x) => x.p.status === 'atrasada');
  const hojeFichas = base.fichas.filter((f) => f.data === hj);
  const baixos = abaixoDoMinimo(base);
  const rncAbertas = base.rncs.filter((r) => r.status === 'aberta');
  const orcVencendo = base.orcamentos.filter((o) => o.status === 'aberto' && somaDias(o.data, o.validadeDias) <= somaDias(hj, 3));
  const semCq = base.faturamento.filter((n) => n.data >= somaDias(hj, -7) && !base.certificados.some((c) => c.notaFiscal === n.notaFiscal) && ['Mineração', 'Energia', 'Sucroenergético', 'Bombas e válvulas'].includes(base.clientes.find((c) => c.id === n.clienteId)?.segmento ?? ''));
  const fora = base.fichas.filter((f) => f.data >= somaDias(hj, -7)).filter((f) => !situacaoFicha(f, base).quimicaOk);
  const dias = Array.from({ length: 14 }, (_, i) => somaDias(hj, i - 13)).map((d) => ({ d, v: soma(base.fichas.filter((f) => f.data === d), (f) => pesosFicha(f, base).liquido) })).filter((x) => x.v > 0 || x.d === hj);
  const cli = (id: string) => base.clientes.find((c) => c.id === id)?.nome ?? '';

  return (
    <>
      <TituloPagina titulo="Visão Geral" sub={`${base.empresa.nome} · ${extenso(hj)}`} />
      <div className="contadores c6">
        <Contador icone="fogo" valor={hojeFichas.length} rot="corridas hoje" />
        <Contador icone="peca" valor={kg(cAt.metalLimpo)} rot={`metal limpo em ${nomeMesLongo(mes).split(' ')[0]}`} />
        <Contador icone="grafico" valor={pct(cAt.rendimento)} rot="rendimento metálico" />
        <Contador icone="alerta" valor={pct(cAt.refugoPct, 2)} rot="refugo no mês" />
        {pode('custo') || pode('orcamentos')
          ? <Contador icone="carteira" valor={rkg(cAnt.custoKg)} rot={`custo/kg · ${nomeMesLongo(anterior).split(' ')[0]} (fechado)`} />
          : <Contador icone="lista" valor={ops.length} rot="O.P em aberto" />}
        {pode('faturamento')
          ? <Contador icone="dinheiro" valor={moeda(fat.valor).replace(/,\d\d$/, '')} rot={`faturado no mês · ${fat.notas} notas`} />
          : <Contador icone="alerta" valor={atrasadas.length} rot="O.P atrasadas" cls={atrasadas.length ? 'negativo' : ''} />}
      </div>
      <div className="grade2">
        <div className="pilha">
          {pode('ops') && (
            <Bloco titulo={<><Icone n="lista" /> Próximas entregas</>} extra={<Link className="lk" to="/ops">ver todas as {ops.length} O.P</Link>}>
              {ops.length === 0 ? <Vazio>Nenhuma O.P em aberto.</Vazio> : (
                <table className="tab">
                  <thead><tr><th>O.P</th><th>Cliente</th><th>Desenho</th><th>Progresso</th><th>Entrega</th><th>Situação</th></tr></thead>
                  <tbody>{ops.slice(0, 8).map(({ o, p }) => (
                    <tr key={o.id}><td className="mono"><Link to={`/ops?abrir=${o.id}`}>{o.numero}</Link></td><td>{cli(o.clienteId)}</td><td className="mut">{o.desenho}</td>
                      <td><Progresso v={p.pct} rot={`${p.boas}/${o.quantidade}`} /></td><td className="mono">{br(o.dataPrevista)}</td><td><Tag cls={STATUS_OP[p.status].cls}>{STATUS_OP[p.status].nome}</Tag></td></tr>
                  ))}</tbody>
                </table>
              )}
            </Bloco>
          )}
          {pode('fichas') && (
            <Bloco titulo={<><Icone n="peca" /> Metal limpo por dia · últimas 2 semanas (kg)</>}>
              <div className="pad"><Barras fmt={(v) => n0(v)} destacarUltimo dados={dias.map((x) => ({ rotulo: brCurto(x.d), valor: Math.round(x.v), nota: x.d === hj ? 'hoje (parcial)' : undefined }))} /></div>
            </Bloco>
          )}
          {!pode('fichas') && pode('orcamentos') && (
            <Bloco titulo={<><Icone n="orcamento" /> Orçamentos recentes</>} extra={<Link className="lk" to="/orcamentos">ver todos</Link>}>
              <ul className="lista-cat">{[...base.orcamentos].reverse().slice(0, 8).map((o) => <li key={o.id}><span><Link to={`/orcamentos?abrir=${o.id}`}>{o.numero}</Link> · {cli(o.clienteId)}</span><b className="mono">{moeda(soma(o.itens, (i) => i.pesoKg * i.quantidade * o.precoKg))}</b></li>)}</ul>
            </Bloco>
          )}
        </div>
        <div className="pilha">
          <Bloco titulo={<><Icone n="check" /> Para fazer</>}>
            <ul className="tarefas">
              {pode('ops') && atrasadas.length > 0 && <><li className="t-cab">O.P atrasadas</li>{atrasadas.map(({ o, p }) => <li key={o.id}><Icone n="alerta" /><span className="tf-nome"><Link to={`/ops?abrir=${o.id}`}>{o.numero}</Link> · {o.desenho}<small>faltam {p.faltam} pç · era {brCurto(o.dataPrevista)}</small></span></li>)}</>}
              {pode('insumos') && baixos.length > 0 && <><li className="t-cab">Comprar (abaixo do mínimo)</li>{baixos.map(({ i, s: sd }) => <li key={i.id}><Icone n="caixa" /><span className="tf-nome"><Link to={`/insumos?abrir=${i.id}`}>{i.nome}</Link><small>{n0(sd)} de {n0(i.estoqueMinimo)} {i.unidade}</small></span></li>)}</>}
              {pode('rnc') && rncAbertas.length > 0 && <><li className="t-cab">RNC abertas</li>{rncAbertas.slice(0, 5).map((r) => <li key={r.id}><Icone n="alerta" /><span className="tf-nome"><Link to={`/rnc?abrir=${r.id}`}>{r.numero}</Link> · {r.motivo}<small>{cli(r.clienteId)}</small></span></li>)}</>}
              {pode('fichas') && fora.length > 0 && <><li className="t-cab">Corridas com química fora (7 dias)</li>{fora.map((f) => <li key={f.id}><Icone n="tubo" /><span className="tf-nome"><Link to={`/fichas?abrir=${f.id}`}>{f.numero}</Link> · {situacaoFicha(f, base).foraQuimica.join(', ')}<small>{br(f.data)}</small></span></li>)}</>}
              {pode('certificados') && semCq.length > 0 && <><li className="t-cab">Notas que pedem certificado</li>{semCq.map((n) => <li key={n.id}><Icone n="escudo" /><span className="tf-nome">NF {n.notaFiscal} · {cli(n.clienteId)}<small>{br(n.data)}</small></span></li>)}</>}
              {pode('orcamentos') && orcVencendo.length > 0 && <><li className="t-cab">Orçamentos vencendo / vencidos</li>{orcVencendo.slice(0, 6).map((o) => <li key={o.id}><Icone n="relogio" /><span className="tf-nome"><Link to={`/orcamentos?abrir=${o.id}`}>{o.numero}</Link> · {cli(o.clienteId)}<small>validade {br(somaDias(o.data, o.validadeDias))}</small></span></li>)}</>}
            </ul>
          </Bloco>
          {pode('fichas') && (
            <Bloco titulo={<><Icone n="fogo" /> Corridas de hoje</>} extra={<Link className="lk" to="/fichas?abrir=novo">nova corrida</Link>}>
              {hojeFichas.length === 0 ? <Vazio>Nenhuma corrida apontada hoje.</Vazio> : (
                <ul className="lista-cat">{hojeFichas.map((f) => { const p = pesosFicha(f, base); return <li key={f.id}><span><Link to={`/fichas?abrir=${f.id}`}>{f.numero}</Link> · {base.ligas.find((l) => l.id === f.ligaId)?.nome}<small className="mut"> {f.horaInicio}</small></span><b className="mono">{kg(p.liquido)} · {pct(rendimento(p.liquido, p.bruto), 0)}</b></li>; })}</ul>
              )}
            </Bloco>
          )}
        </div>
      </div>
    </>
  );
}
