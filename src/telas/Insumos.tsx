// Insumos — substitui as 4 abas "CONSUMO DE …" + as ~260 abas por insumo (I.R.F, I.M.F, E.P.I, I.E.L).
// Estoque contínuo (sem digitar a sobra do mês anterior), unidade própria por insumo, alerta de estoque mínimo,
// e baixa automática dos insumos da carga pela Ficha do Forno.
import { useState } from 'react';
import type { GrupoInsumo, Insumo, MovInsumo } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { BotaoIcone, BuscaLista, Campo, CampoNum, Contador, OrigemPlanilha, Registro, Segmentado, SeletorMes, Tag, TituloPagina, Vazio, useEdita, useRascunho, Bloco } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { useAbrir } from '../componentes/useAbrir';
import { GRUPOS_INSUMO, resumoMes, saldo, situacaoEstoque } from '../regras/insumos';
import { mesDe, noMes } from '../regras/periodo';
import { br, brCurto, hoje } from '../util/datas';
import { moeda, n0, n1, semAcento, soma } from '../util/formato';

const fmtQ = (i: Insumo, v: number) => (i.unidade === 'kg' || i.unidade === 'L' ? n1(v) : n0(v));
const SIT = { ok: { nome: 'ok', cls: 't-ok' }, baixo: { nome: 'abaixo do mínimo', cls: 't-at' }, zerado: { nome: 'sem estoque', cls: 't-no' } };

export function Insumos() {
  const { base } = useDados();
  const hj = hoje();
  const edita = useEdita('insumos');
  const [abrir, setAbrir] = useAbrir();
  const [mes, setMes] = useState(mesDe(hj));
  const [g, setG] = useState<GrupoInsumo>('IFR');
  const [soAlerta, setSoAlerta] = useState(false);
  const [t, setT] = useState('');
  const todos = base.insumos.map((i) => ({ i, s: saldo(i.id, base.movimentos), r: resumoMes(i, base.movimentos, mes) }));
  const doGrupo = todos.filter((x) => x.i.grupo === g);
  const q = semAcento(t);
  const vis = doGrupo.filter((x) => (!soAlerta || situacaoEstoque(x.i, x.s) !== 'ok') && (!q || semAcento(`${x.i.codigo} ${x.i.nome}`).includes(q)));
  const alertas = todos.filter((x) => situacaoEstoque(x.i, x.s) !== 'ok');
  const sel = abrir === 'novo' ? null : base.insumos.find((i) => i.id === abrir);
  return (
    <>
      <TituloPagina titulo="Insumos" sub={<OrigemPlanilha aba="CONSUMO DE I.F.R / I.M.F / E.P.I / I.E.L + abas por insumo" />}>
        <SeletorMes mes={mes} setMes={setMes} atual={mesDe(hj)} />
        <BotaoIcone icone="mais" titulo={edita ? 'Novo insumo' : 'Seu perfil só consulta'} pri disabled={!edita} onClick={() => setAbrir('novo')} />
      </TituloPagina>
      <div className="contadores c4">
        <Contador icone="saida" valor={moeda(soma(doGrupo, (x) => x.r.gastoUtilizado))} rot={`utilizado no mês · ${GRUPOS_INSUMO[g].curto}`} />
        <Contador icone="entrada" valor={moeda(soma(doGrupo, (x) => x.r.gastoCompra))} rot={`comprado no mês · ${GRUPOS_INSUMO[g].curto}`} />
        <Contador icone="caixa" valor={moeda(soma(todos, (x) => x.s * x.i.preco))} rot="valor em estoque (todos)" />
        <Contador icone="alerta" valor={alertas.length} rot="abaixo do mínimo (todos)" cls={alertas.length ? 'alerta' : ''} />
      </div>
      <div className="barra">
        <BuscaLista valor={t} setValor={setT} dica="Buscar por código ou insumo" />
        <Segmentado valor={g} setValor={setG} opcoes={(Object.keys(GRUPOS_INSUMO) as GrupoInsumo[]).map((k) => ({ v: k, nome: GRUPOS_INSUMO[k].curto, n: todos.filter((x) => x.i.grupo === k).length, dica: GRUPOS_INSUMO[k].nome }))} />
        <label className="chk-linha"><input type="checkbox" checked={soAlerta} onChange={(e) => setSoAlerta(e.target.checked)} /><span>Só abaixo do mínimo</span></label>
      </div>
      <div className="bloco">
        {vis.length === 0 ? <Vazio>Nenhum insumo.</Vazio> : (
          <table className="tab">
            <thead><tr><th>Código</th><th>Insumo</th><th>Unid.</th><th className="dir">Estoque</th><th className="dir">Mínimo</th><th className="dir">Utilizado</th><th className="dir">Gasto utilizado</th><th className="dir">Comprado</th><th className="dir">Gasto compra</th><th>Situação</th></tr></thead>
            <tbody>{vis.map(({ i, s, r }) => { const st = situacaoEstoque(i, s); return (
              <tr key={i.id} className="clic" onClick={() => setAbrir(i.id)}>
                <td className="mono">{i.codigo}</td><td>{i.nome}{i.carga && <small className="mut"> · carga do forno</small>}</td><td className="mut">{i.unidade}</td>
                <td className="dir mono">{fmtQ(i, s)}</td><td className="dir mono mut">{fmtQ(i, i.estoqueMinimo)}</td>
                <td className="dir mono">{r.utilizado ? fmtQ(i, r.utilizado) : '—'}</td><td className="dir mono">{r.gastoUtilizado ? moeda(r.gastoUtilizado) : '—'}</td>
                <td className="dir mono">{r.comprado ? fmtQ(i, r.comprado) : '—'}</td><td className="dir mono">{r.gastoCompra ? moeda(r.gastoCompra) : '—'}</td>
                <td>{st !== 'ok' ? <Tag cls={SIT[st].cls}>{SIT[st].nome}</Tag> : <span className="mut peq">ok</span>}</td>
              </tr>); })}</tbody>
          </table>
        )}
      </div>
      {(sel || abrir === 'novo') && <RegistroInsumo insumo={sel ?? undefined} grupo={g} mes={mes} fechar={() => setAbrir(null)} />}
    </>
  );
}

function RegistroInsumo({ insumo, grupo, mes, fechar }: { insumo?: Insumo; grupo: GrupoInsumo; mes: string; fechar: () => void }) {
  const { base, acoes } = useDados();
  const hj = hoje();
  const edita = useEdita('insumos');
  const novo = !insumo;
  const proxCod = () => { const n = Math.max(0, ...base.insumos.filter((i) => i.grupo === grupo).map((i) => Number(i.codigo.slice(4)))) + 1; return `${grupo}-${String(n).padStart(4, '0')}`; };
  const cod = insumo?.codigo ?? proxCod();
  const inicial: Insumo = insumo ?? { id: cod.toLowerCase(), codigo: cod, grupo, nome: '', unidade: 'un', preco: 0, estoqueMinimo: 0 };
  const { r, mudar, editando, setEditando, erro, setErro, descartar } = useRascunho(inicial, novo);
  const [lanc, setLanc] = useState<null | MovInsumo['tipo']>(null);
  const [mov, setMov] = useState({ data: hj, quantidade: undefined as number | undefined, valorUnit: r.preco as number | undefined, notaFiscal: '', fornecedor: '', origem: '' });
  const ed = !editando;
  const movsMes = base.movimentos.filter((m) => m.insumoId === r.id && noMes(m.data, mes) && m.tipo !== 'saldo_inicial');
  const ret = movsMes.filter((m) => m.tipo === 'retirada'), comp = movsMes.filter((m) => m.tipo === 'compra');
  const s = saldo(r.id, base.movimentos);
  const rm = resumoMes(r, base.movimentos, mes);
  const salvar = () => {
    if (!r.nome.trim()) return setErro('Informe o nome do insumo.');
    acoes.salvar('insumos', r); setErro(''); setEditando(false); if (novo) fechar();
  };
  const lancar = () => {
    if (!lanc || !(mov.quantidade && mov.quantidade > 0)) return setErro('Informe a quantidade.');
    if (lanc === 'retirada' && mov.quantidade > s) return setErro(`Estoque atual é ${fmtQ(r, s)} ${r.unidade}: não dá para retirar ${fmtQ(r, mov.quantidade)}.`);
    acoes.salvar('movimentos', { id: acoes.novoId('m'), insumoId: r.id, data: mov.data, tipo: lanc, quantidade: mov.quantidade, valorUnit: lanc === 'compra' ? mov.valorUnit ?? r.preco : r.preco, notaFiscal: mov.notaFiscal || undefined, fornecedor: mov.fornecedor || undefined, origem: mov.origem || undefined });
    if (lanc === 'compra' && mov.valorUnit) acoes.salvar('insumos', { ...r, preco: mov.valorUnit });
    setLanc(null); setErro(''); setMov({ ...mov, quantidade: undefined, notaFiscal: '', origem: '' });
  };
  return (
    <Registro titulo={novo ? 'Novo insumo' : <><span className="mono">{r.codigo}</span> · {r.nome}</>} novo={novo} edita={edita} editando={editando} setEditando={setEditando} salvar={salvar} descartar={novo ? fechar : descartar} fechar={fechar} erro={erro}
      cabecalho={!novo && <><Tag cls={SIT[situacaoEstoque(r, s)].cls}>{SIT[situacaoEstoque(r, s)].nome}</Tag><span className="mut peq">estoque {fmtQ(r, s)} {r.unidade}</span></>}
      acoesExtra={!novo && <>
        <BotaoIcone icone="saida" titulo="Lançar retirada" disabled={!edita || editando} onClick={() => setLanc('retirada')} />
        <BotaoIcone icone="entrada" titulo="Lançar compra" disabled={!edita || editando} onClick={() => setLanc('compra')} />
      </>}>
      <div className="form-grade">
        <Campo rot="Código"><input value={r.codigo} disabled /></Campo>
        <Campo rot="Insumo" c={3}><input value={r.nome} disabled={ed} onChange={(e) => mudar('nome', e.target.value)} /></Campo>
        <Campo rot="Unidade"><select value={r.unidade} disabled={ed} onChange={(e) => mudar('unidade', e.target.value)}>{['kg', 'L', 'un', 'par', 'pct', 'cx'].map((u) => <option key={u}>{u}</option>)}</select></Campo>
        <Campo rot="Preço atual"><CampoNum valor={r.preco} mudar={(v) => mudar('preco', v ?? 0)} disabled={ed} casas={2} sufixo="R$" /></Campo>
        <Campo rot="Estoque mínimo"><CampoNum valor={r.estoqueMinimo} mudar={(v) => mudar('estoqueMinimo', v ?? 0)} disabled={ed} sufixo={r.unidade} /></Campo>
        <Campo rot="Grupo"><input value={GRUPOS_INSUMO[r.grupo].curto} disabled /></Campo>
      </div>
      {lanc && (
        <div className="lanc topo-sec">
          <b>{lanc === 'retirada' ? 'Lançar retirada' : 'Lançar compra'}</b>
          <div className="form-grade">
            <Campo rot="Data"><input type="date" value={mov.data} onChange={(e) => setMov({ ...mov, data: e.target.value })} /></Campo>
            <Campo rot="Quantidade"><CampoNum valor={mov.quantidade} mudar={(v) => setMov({ ...mov, quantidade: v })} sufixo={r.unidade} /></Campo>
            {lanc === 'compra' ? <>
              <Campo rot="Valor unitário"><CampoNum valor={mov.valorUnit} mudar={(v) => setMov({ ...mov, valorUnit: v })} casas={2} sufixo="R$" /></Campo>
              <Campo rot="Nota fiscal"><input value={mov.notaFiscal} onChange={(e) => setMov({ ...mov, notaFiscal: e.target.value })} /></Campo>
              <Campo rot="Fornecedor" c={4}><input value={mov.fornecedor} onChange={(e) => setMov({ ...mov, fornecedor: e.target.value })} /></Campo>
            </> : <Campo rot="Setor / motivo" c={2}><input value={mov.origem} onChange={(e) => setMov({ ...mov, origem: e.target.value })} placeholder="Ex.: Moldagem" /></Campo>}
          </div>
          <div className="rodape-modal"><button type="button" className="btn2" onClick={() => setLanc(null)}>Voltar</button><button type="button" className="btn2 pri" onClick={lancar}><Icone n="salvar" /> Lançar</button></div>
        </div>
      )}
      {!novo && (
        <>
          <div className="resumo-linha topo-sec">
            <div><span>Utilizado no mês</span><b>{fmtQ(r, rm.utilizado)} {r.unidade}</b></div>
            <div><span>Gasto utilizado</span><b>{moeda(rm.gastoUtilizado)}</b></div>
            <div><span>Comprado no mês</span><b>{fmtQ(r, rm.comprado)} {r.unidade}</b></div>
            <div><span>Gasto compra</span><b>{moeda(rm.gastoCompra)}</b></div>
          </div>
          <div className="g2 topo-sec">
            <Bloco titulo={<><Icone n="saida" /> Retiradas do mês</>} extra={<span className="mut peq">{ret.length}</span>}>
              {ret.length === 0 ? <Vazio>Nenhuma retirada.</Vazio> : <div className="rolagem"><table className="tab tab-mini"><thead><tr><th>Data</th><th className="dir">Qtde</th><th className="dir">Valor</th><th>Origem</th></tr></thead>
                <tbody>{[...ret].reverse().map((m) => <tr key={m.id}><td className="mono">{brCurto(m.data)}</td><td className="dir mono">{fmtQ(r, m.quantidade)}</td><td className="dir mono">{moeda(m.quantidade * m.valorUnit)}</td><td className="mut">{m.origem ?? '—'}</td></tr>)}</tbody></table></div>}
            </Bloco>
            <Bloco titulo={<><Icone n="entrada" /> Compras do mês</>} extra={<span className="mut peq">{comp.length}</span>}>
              {comp.length === 0 ? <Vazio>Nenhuma compra.</Vazio> : <div className="rolagem"><table className="tab tab-mini"><thead><tr><th>Data</th><th className="dir">Qtde</th><th className="dir">Valor</th><th>NF · fornecedor</th></tr></thead>
                <tbody>{[...comp].reverse().map((m) => <tr key={m.id}><td className="mono">{br(m.data)}</td><td className="dir mono">{fmtQ(r, m.quantidade)}</td><td className="dir mono">{moeda(m.quantidade * m.valorUnit)}</td><td className="mut">{m.notaFiscal} · {m.fornecedor}</td></tr>)}</tbody></table></div>}
            </Bloco>
          </div>
        </>
      )}
    </Registro>
  );
}
