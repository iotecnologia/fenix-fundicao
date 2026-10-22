// Orçamentos — substitui "GERAÇÃO DE ORÇAMENTO" + as 200 abas "ORÇAMENTO (n)".
// A margem usa o custo por kg fabricado do último mês fechado (vem do Custo Mensal, como na planilha).
// Novo: digitar a margem desejada e o sistema achar o preço; aprovado → gera as O.P de cada item.
import { useState } from 'react';
import type { ItemOrcamento, Orcamento } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, BuscaLista, Campo, CampoNum, Contador, OrigemPlanilha, Registro, Segmentado, SeletorMes, Tag, TituloPagina, Vazio, useEdita, useRascunho } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { Imprimir } from '../componentes/Folha';
import { DocOrcamento } from '../componentes/Documentos';
import { useAbrir } from '../componentes/useAbrir';
import { STATUS_ORC, margemKg, precoParaMargem, totaisOrcamento } from '../regras/orcamento';
import { custoMes } from '../regras/custo';
import { mesDe, nomeMesLongo, noMes, proximoNumero, somaMes } from '../regras/periodo';
import { br, brCurto, hoje, somaDias } from '../util/datas';
import { kg, moeda, n1, pct, rkg, semAcento, soma } from '../util/formato';

type Filtro = 'todos' | Orcamento['status'];

export function Orcamentos() {
  const { base } = useDados();
  const hj = hoje();
  const edita = useEdita('orcamentos');
  const [abrir, setAbrir] = useAbrir();
  const [mes, setMes] = useState(mesDe(hj));
  const [f, setF] = useState<Filtro>('todos');
  const [t, setT] = useState('');
  const cli = (id: string) => base.clientes.find((c) => c.id === id)?.nome ?? '';
  const liga = (id: string) => base.ligas.find((l) => l.id === id)?.nome ?? '';
  const doMes = base.orcamentos.filter((o) => noMes(o.data, mes)).reverse().map((o) => ({ o, tt: totaisOrcamento(o) }));
  const q = semAcento(t);
  const vis = doMes.filter(({ o }) => (f === 'todos' || o.status === f) && (!q || semAcento(`${o.numero} ${cli(o.clienteId)} ${liga(o.ligaId)}`).includes(q)));
  const n = (s: Filtro) => doMes.filter(({ o }) => s === 'todos' || o.status === s).length;
  const decididos = doMes.filter(({ o }) => o.status !== 'aberto');
  const aprov = doMes.filter(({ o }) => o.status === 'aprovado');
  const sel = abrir === 'novo' ? null : base.orcamentos.find((o) => o.id === abrir);
  return (
    <>
      <TituloPagina titulo="Orçamentos" sub={<OrigemPlanilha aba="GERAÇÃO DE ORÇAMENTO + abas ORÇAMENTO (1…200)" />}>
        <SeletorMes mes={mes} setMes={setMes} atual={mesDe(hj)} />
        <BotaoIcone icone="mais" titulo={edita ? 'Novo orçamento' : 'Seu perfil só consulta'} pri disabled={!edita} onClick={() => setAbrir('novo')} />
      </TituloPagina>
      <div className="contadores c4">
        <Contador icone="orcamento" valor={doMes.length} rot="orçamentos no mês" />
        <Contador icone="dinheiro" valor={moeda(soma(doMes, (x) => x.tt.valor))} rot="valor orçado" />
        <Contador icone="check" valor={decididos.length ? pct(aprov.length / decididos.length, 0) : '—'} rot={`aprovação · ${moeda(soma(aprov, (x) => x.tt.valor))}`} />
        <Contador icone="grafico" valor={doMes.length ? pct(soma(doMes, (x) => x.tt.lucro) / Math.max(1, soma(doMes, (x) => x.tt.valor)), 1) : '—'} rot="margem média" />
      </div>
      <div className="barra">
        <BuscaLista valor={t} setValor={setT} dica="Buscar por número, cliente ou liga" />
        <Segmentado valor={f} setValor={setF} opcoes={[{ v: 'todos', nome: 'Todos', n: n('todos') }, { v: 'aberto', nome: 'Em aberto', n: n('aberto') }, { v: 'aprovado', nome: 'Aprovados', n: n('aprovado') }, { v: 'perdido', nome: 'Não aprovados', n: n('perdido') }]} />
      </div>
      <div className="bloco">
        {vis.length === 0 ? <Vazio>Nenhum orçamento.</Vazio> : (
          <table className="tab">
            <thead><tr><th>Orçamento</th><th>Data</th><th>Cliente</th><th>Liga</th><th className="dir">Peso</th><th className="dir">Preço/kg</th><th className="dir">Valor</th><th className="dir">Margem</th><th>Situação</th></tr></thead>
            <tbody>{vis.map(({ o, tt }) => (
              <tr key={o.id} className="clic" onClick={() => setAbrir(o.id)}>
                <td className="mono">{o.numero}</td><td className="mono">{brCurto(o.data)}</td><td>{cli(o.clienteId)}</td><td className="mut">{liga(o.ligaId)}</td>
                <td className="dir mono">{kg(tt.pesoTotal)}</td><td className="dir mono">{moeda(o.precoKg)}</td><td className="dir mono">{moeda(tt.valor)}</td>
                <td className={'dir mono ' + classeMargem(tt.margem)}>{pct(tt.margem)}</td>
                <td><Tag cls={STATUS_ORC[o.status].cls}>{STATUS_ORC[o.status].nome}</Tag></td>
              </tr>))}</tbody>
          </table>
        )}
      </div>
      {(sel || abrir === 'novo') && <RegistroOrc orc={sel ?? undefined} fechar={() => setAbrir(null)} />}
    </>
  );
}

const classeMargem = (m: number) => (m < 0 ? 'neg' : m < 0.15 ? 'baixa' : '');

function RegistroOrc({ orc, fechar }: { orc?: Orcamento; fechar: () => void }) {
  const { base, acoes } = useDados();
  const hj = hoje();
  const edita = useEdita('orcamentos');
  const editaOP = useEdita('ops');
  const novo = !orc;
  const mesRef = somaMes(mesDe(hj), -1);
  const custoRef = custoMes(base, mesRef).custoKg;
  const lg0 = base.ligas[1];
  const inicial: Orcamento = orc ?? {
    id: acoes.novoId('o'), numero: proximoNumero(base.orcamentos, hj, 4), data: hj, clienteId: base.clientes[0].id, ligaId: lg0.id,
    precoKg: lg0.precoBaseKg, impostoPct: 10.5, comissaoPct: 2, custoKgRef: custoRef, itens: [{ identificacao: '', pesoKg: 0, quantidade: 1 }],
    formaPagamento: '28 dias', prazoEntrega: '20 dias úteis', observacao: '', status: 'aberto', validadeDias: 15,
  };
  const { r, setR, mudar, editando, setEditando, erro, setErro, descartar } = useRascunho(inicial, novo);
  const [alvo, setAlvo] = useState<number | undefined>(30);
  const [imprimir, setImprimir] = useState(false);
  const ed = !editando;
  const tt = totaisOrcamento(r), m = margemKg(r);
  const opsGeradas = base.ops.filter((o) => o.orcamentoId === r.id);
  const mudaItem = (i: number, v: Partial<ItemOrcamento>) => setR({ ...r, itens: r.itens.map((x, k) => (k === i ? { ...x, ...v } : x)) });
  const vencido = r.status === 'aberto' && somaDias(r.data, r.validadeDias) < hj;
  const salvar = () => {
    const itens = r.itens.filter((i) => i.identificacao.trim() || i.pesoKg > 0);
    if (!itens.length) return setErro('Informe ao menos um item.');
    if (itens.some((i) => !(i.pesoKg > 0) || !(i.quantidade > 0))) return setErro('Todo item precisa de peso e quantidade.');
    if (!(r.precoKg > 0)) return setErro('Informe o preço por kg.');
    const n = { ...r, itens };
    acoes.salvar('orcamentos', n); setR(n);
    setErro(''); setEditando(false);
    if (novo) fechar();
  };
  const gerarOPs = () => {
    let numeros = [...base.ops];
    for (const it of r.itens) {
      const op = { id: acoes.novoId('op'), numero: proximoNumero(numeros, hj), data: hj, clienteId: r.clienteId, desenho: it.identificacao, ligaId: r.ligaId, quantidade: it.quantidade, pesoLiquidoKg: it.pesoKg, pesoBrutoKg: +(it.pesoKg / 0.68).toFixed(1), dataPrevista: somaDias(hj, 21), orcamentoId: r.id, refugos: [] };
      acoes.salvar('ops', op); numeros = [...numeros, op];
    }
  };
  return (
    <Registro titulo={novo ? 'Novo orçamento' : <>Orçamento <span className="mono">{r.numero}</span></>} novo={novo} edita={edita} editando={editando} setEditando={setEditando}
      salvar={salvar} descartar={novo ? fechar : descartar} fechar={fechar} erro={erro} imprimir={novo ? undefined : () => setImprimir(true)}
      cabecalho={!novo && <><Tag cls={STATUS_ORC[r.status].cls}>{STATUS_ORC[r.status].nome}</Tag>{vencido && <Tag cls="t-no">validade vencida</Tag>}{opsGeradas.length > 0 && <span className="mut peq">O.P {opsGeradas.map((o) => o.numero).join(', ')}</span>}</>}
      acoesExtra={!novo && r.status === 'aprovado' && opsGeradas.length === 0 && <BotaoIcone icone="lista" titulo="Gerar as O.P deste orçamento (uma por item)" cls="verde" disabled={!editaOP || editando} onClick={gerarOPs} />}>
      <div className="orc-grade">
        <div>
          <div className="form-grade orc-cab">
            <Campo rot="Orçamento nº"><input value={r.numero} disabled /></Campo>
            <Campo rot="Data"><input type="date" value={r.data} disabled={ed} onChange={(e) => mudar('data', e.target.value)} /></Campo>
            <Campo rot="Situação" c={2}><select value={r.status} disabled={ed} onChange={(e) => mudar('status', e.target.value as Orcamento['status'])}>{Object.entries(STATUS_ORC).map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}</select></Campo>
            <Campo rot="Cliente" c={2}><select value={r.clienteId} disabled={ed} onChange={(e) => mudar('clienteId', e.target.value)}>{base.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
            <Campo rot="Material orçado (liga)" c={2}><select value={r.ligaId} disabled={ed} onChange={(e) => { const l = base.ligas.find((x) => x.id === e.target.value)!; setR({ ...r, ligaId: l.id, precoKg: novo ? l.precoBaseKg : r.precoKg }); }}>{base.ligas.map((l) => <option key={l.id} value={l.id}>{l.nome} · {l.norma}</option>)}</select></Campo>
          </div>
          <Bloco className="topo-sec" titulo={<><Icone n="peca" /> Itens</>}>
            <table className="tab tab-mini">
              <thead><tr><th>Item</th><th>Identificação</th><th className="dir">Peso (kg)</th><th className="dir">Qtde</th><th className="dir">Valor</th>{editando && <th />}</tr></thead>
              <tbody>{r.itens.map((i, k) => (
                <tr key={k}>
                  <td className="mono">{String(k + 1).padStart(3, '0')}</td>
                  <td>{ed ? i.identificacao : <input value={i.identificacao} onChange={(e) => mudaItem(k, { identificacao: e.target.value })} placeholder="Desenho / descrição" />}</td>
                  <td className="dir">{ed ? <span className="mono">{n1(i.pesoKg)}</span> : <CampoNum valor={i.pesoKg} mudar={(v) => mudaItem(k, { pesoKg: v ?? 0 })} />}</td>
                  <td className="dir">{ed ? <span className="mono">{i.quantidade}</span> : <CampoNum valor={i.quantidade} mudar={(v) => mudaItem(k, { quantidade: Math.round(v ?? 0) })} />}</td>
                  <td className="dir mono">{moeda(r.precoKg * i.pesoKg * i.quantidade)}</td>
                  {editando && <td><BotaoIcone icone="x" titulo="Tirar item" cls="peq" onClick={() => setR({ ...r, itens: r.itens.filter((_, j) => j !== k) })} /></td>}
                </tr>))}</tbody>
            </table>
            {editando && <button type="button" className="ver-mais" onClick={() => setR({ ...r, itens: [...r.itens, { identificacao: '', pesoKg: 0, quantidade: 1 }] })}>+ item</button>}
          </Bloco>
          <div className="form-grade topo-sec">
            <Campo rot="Forma de pagamento" c={2}><input value={r.formaPagamento} disabled={ed} onChange={(e) => mudar('formaPagamento', e.target.value)} /></Campo>
            <Campo rot="Prazo de entrega"><input value={r.prazoEntrega} disabled={ed} onChange={(e) => mudar('prazoEntrega', e.target.value)} /></Campo>
            <Campo rot="Validade"><CampoNum valor={r.validadeDias} mudar={(v) => mudar('validadeDias', Math.round(v ?? 0))} disabled={ed} sufixo="dias" /></Campo>
            <Campo rot="Observação" c={4}><textarea rows={2} value={r.observacao} disabled={ed} onChange={(e) => mudar('observacao', e.target.value)} /></Campo>
          </div>
        </div>
        <aside className="orc-lado">
          <div className="form-grade c2">
            <Campo rot="Preço de venda"><CampoNum valor={r.precoKg} mudar={(v) => mudar('precoKg', v ?? 0)} disabled={ed} casas={2} sufixo="R$/kg" /></Campo>
            <Campo rot="Custo por kg" dica="Custo por kg fabricado do último mês fechado (Custo Mensal)"><input value={rkg(r.custoKgRef)} disabled /></Campo>
            <Campo rot="Imposto"><CampoNum valor={r.impostoPct} mudar={(v) => mudar('impostoPct', v ?? 0)} disabled={ed} sufixo="%" /></Campo>
            <Campo rot="Comissão"><CampoNum valor={r.comissaoPct} mudar={(v) => mudar('comissaoPct', v ?? 0)} disabled={ed} sufixo="%" /></Campo>
          </div>
          {editando && (
            <div className="alvo">
              <span>Quero margem de</span><CampoNum valor={alvo} mudar={setAlvo} sufixo="%" />
              <button type="button" className="btn2 peq" onClick={() => alvo !== undefined && mudar('precoKg', precoParaMargem(alvo / 100, r.impostoPct, r.comissaoPct, r.custoKgRef))} title="Calcula o preço por kg para atingir a margem"><Icone n="seta" /> achar preço</button>
            </div>
          )}
          <ul className="quebra">
            <li><span>Preço de venda</span><b className="mono">{rkg(r.precoKg)}</b></li>
            <li><span>− Imposto ({n1(r.impostoPct)}%)</span><b className="mono">{rkg(m.imposto)}</b></li>
            <li><span>− Comissão ({n1(r.comissaoPct)}%)</span><b className="mono">{rkg(m.comissao)}</b></li>
            <li><span>− Custo do kg fabricado</span><b className="mono">{rkg(r.custoKgRef)}</b></li>
            <li className={'tot ' + classeMargem(m.margem)}><span>= Lucro por kg</span><b className="mono">{rkg(m.lucro)} · {pct(m.margem)}</b></li>
          </ul>
          <div className="total-orc">
            <div><span>Total</span><b>{moeda(tt.valor)}</b></div>
            <small>{kg(tt.pesoTotal)} · {tt.pecas} peças · lucro {moeda(tt.lucro)}</small>
          </div>
          {novo && <p className="nota">Custo de referência: {nomeMesLongo(mesRef)} (último mês fechado).</p>}
          {!novo && r.status === 'aberto' && <p className="nota">Válido até {br(somaDias(r.data, r.validadeDias))}.</p>}
        </aside>
      </div>
      {imprimir && <Imprimir aoTerminar={() => setImprimir(false)}><DocOrcamento o={r} base={base} /></Imprimir>}
    </Registro>
  );
}
