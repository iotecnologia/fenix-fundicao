// RNC — Relatório de Não Conformidade. Substitui "GERAÇÃO DE R.N.C" + as 100 abas "RNC (n)".
// Novo: escolhendo a O.P, cliente, desenho, liga e peso vêm sozinhos; a RNC pode lançar o refugo na O.P;
// o peso perdido entra no % de refugo do Custo Mensal.
import { useState } from 'react';
import type { Rnc } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, BuscaLista, Campo, CampoNum, Contador, OrigemPlanilha, Registro, Segmentado, SeletorMes, Tag, TituloPagina, Vazio, useEdita, useRascunho } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { Imprimir } from '../componentes/Folha';
import { DocRnc } from '../componentes/Documentos';
import { BarrasH } from '../componentes/Graficos';
import { useAbrir } from '../componentes/useAbrir';
import { MOTIVOS_RNC, pesoRnc } from '../regras/qualidade';
import { custoMes } from '../regras/custo';
import { mesDe, noMes, proximoNumero } from '../regras/periodo';
import { br, brCurto, hoje } from '../util/datas';
import { kg, kgP, n0, pct, semAcento, soma } from '../util/formato';

type Filtro = 'todas' | 'aberta' | 'encerrada';

export function Rncs() {
  const { base } = useDados();
  const hj = hoje();
  const edita = useEdita('rnc');
  const [abrir, setAbrir] = useAbrir();
  const [mes, setMes] = useState(mesDe(hj));
  const [f, setF] = useState<Filtro>('todas');
  const [t, setT] = useState('');
  const cli = (id: string) => base.clientes.find((c) => c.id === id)?.nome ?? '';
  const doMes = base.rncs.filter((r) => noMes(r.data, mes)).reverse();
  const q = semAcento(t);
  const vis = doMes.filter((r) => (f === 'todas' || r.status === f) && (!q || semAcento(`${r.numero} ${r.desenho} ${cli(r.clienteId)} ${r.motivo}`).includes(q)));
  const c = custoMes(base, mes);
  const motivos = MOTIVOS_RNC.map((m) => ({ rotulo: m, valor: soma(doMes.filter((r) => r.motivo === m), pesoRnc) })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor);
  const sel = abrir === 'novo' ? null : base.rncs.find((r) => r.id === abrir);
  const abertasTodas = base.rncs.filter((r) => r.status === 'aberta').length;
  return (
    <>
      <TituloPagina titulo="RNC · Não Conformidade" sub={<OrigemPlanilha aba="GERAÇÃO DE R.N.C + abas RNC (1…100)" />}>
        <SeletorMes mes={mes} setMes={setMes} atual={mesDe(hj)} />
        <BotaoIcone icone="mais" titulo={edita ? 'Nova RNC' : 'Seu perfil só consulta'} pri disabled={!edita} onClick={() => setAbrir('novo')} />
      </TituloPagina>
      <div className="contadores c4">
        <Contador icone="alerta" valor={doMes.length} rot="RNC no mês" />
        <Contador icone="peca" valor={n0(soma(doMes, (r) => r.quantidade))} rot="peças perdidas" />
        <Contador icone="balanca" valor={kg(c.refugoKg)} rot={`perdido · ${pct(c.refugoPct, 2)} do metal bruto`} />
        <Contador icone="relogio" valor={abertasTodas} rot="RNC abertas (todas)" cls={abertasTodas ? 'alerta' : ''} />
      </div>
      <div className="grade2">
        <div className="pilha">
          <div className="barra sem-marg">
            <BuscaLista valor={t} setValor={setT} dica="Buscar por RNC, desenho, cliente ou motivo" />
            <Segmentado valor={f} setValor={setF} opcoes={[{ v: 'todas', nome: 'Todas', n: doMes.length }, { v: 'aberta', nome: 'Abertas', n: doMes.filter((r) => r.status === 'aberta').length }, { v: 'encerrada', nome: 'Encerradas', n: doMes.filter((r) => r.status === 'encerrada').length }]} />
          </div>
          <div className="bloco">
            {vis.length === 0 ? <Vazio>Nenhuma RNC.</Vazio> : (
              <table className="tab">
                <thead><tr><th>RNC</th><th>Data</th><th>Cliente</th><th>Desenho</th><th className="dir">Peças</th><th className="dir">Peso perdido</th><th>Motivo</th><th>Situação</th></tr></thead>
                <tbody>{vis.map((r) => (
                  <tr key={r.id} className="clic" onClick={() => setAbrir(r.id)}>
                    <td className="mono">{r.numero}</td><td className="mono">{brCurto(r.data)}</td><td>{cli(r.clienteId)}</td><td>{r.desenho}</td>
                    <td className="dir mono">{r.quantidade}</td><td className="dir mono">{kgP(pesoRnc(r))}</td><td className="mut">{r.motivo}</td>
                    <td>{r.status === 'aberta' ? <Tag cls="t-at">aberta</Tag> : <Tag cls="t-fim">encerrada</Tag>}</td>
                  </tr>))}</tbody>
              </table>
            )}
          </div>
        </div>
        <div className="pilha">
          <Bloco titulo={<><Icone n="grafico" /> Peso perdido por motivo (kg)</>}>
            <div className="pad">{motivos.length ? <BarrasH dados={motivos} fmt={(v) => n0(v)} /> : <Vazio>Sem perdas no mês.</Vazio>}</div>
          </Bloco>
        </div>
      </div>
      {(sel || abrir === 'novo') && <RegistroRnc rnc={sel ?? undefined} fechar={() => setAbrir(null)} />}
    </>
  );
}

function RegistroRnc({ rnc, fechar }: { rnc?: Rnc; fechar: () => void }) {
  const { base, acoes } = useDados();
  const hj = hoje();
  const edita = useEdita('rnc');
  const novo = !rnc;
  const inicial: Rnc = rnc ?? { id: acoes.novoId('rnc'), numero: proximoNumero(base.rncs, hj), data: hj, clienteId: base.clientes[0].id, desenho: '', ligaId: 'gg20', quantidade: 1, pesoUnitKg: 0, motivo: MOTIVOS_RNC[0], acaoCorretiva: '', status: 'aberta' };
  const { r, setR, mudar, editando, setEditando, erro, setErro, descartar } = useRascunho(inicial, novo);
  const [lancarNaOP, setLancarNaOP] = useState(true);
  const [imprimir, setImprimir] = useState(false);
  const ed = !editando;
  const opsRecentes = [...base.ops].reverse().slice(0, 80);
  const escolherOP = (id: string) => {
    const o = base.ops.find((x) => x.id === id);
    if (!o) return setR({ ...r, opId: undefined });
    setR({ ...r, opId: o.id, clienteId: o.clienteId, desenho: o.desenho, ligaId: o.ligaId, pesoUnitKg: o.pesoBrutoKg });
  };
  const salvar = () => {
    if (!r.desenho.trim()) return setErro('Informe o desenho da peça.');
    if (!(r.quantidade > 0) || !(r.pesoUnitKg > 0)) return setErro('Informe as peças perdidas e o peso bruto unitário.');
    acoes.salvar('rncs', r);
    if (novo && r.opId && lancarNaOP) {
      const o = base.ops.find((x) => x.id === r.opId)!;
      acoes.salvar('ops', { ...o, refugos: [...o.refugos, { data: r.data, quantidade: r.quantidade, causa: r.motivo }] });
    }
    setErro(''); setEditando(false);
    if (novo) fechar();
  };
  return (
    <Registro titulo={novo ? 'Nova RNC' : <>RNC <span className="mono">{r.numero}</span></>} novo={novo} edita={edita} editando={editando} setEditando={setEditando}
      salvar={salvar} descartar={novo ? fechar : descartar} fechar={fechar} erro={erro} imprimir={novo ? undefined : () => setImprimir(true)}
      cabecalho={!novo && (r.status === 'aberta' ? <Tag cls="t-at">aberta</Tag> : <Tag cls="t-fim">encerrada</Tag>)}
      acoesExtra={!novo && r.status === 'aberta' && <BotaoIcone icone="check" titulo="Encerrar RNC" cls="verde" disabled={!edita || editando} onClick={() => { const n = { ...r, status: 'encerrada' as const }; setR(n); acoes.salvar('rncs', n); }} />}>
      <div className="form-grade">
        <Campo rot="Número da RNC"><input value={r.numero} disabled /></Campo>
        <Campo rot="Data de entrada"><input type="date" value={r.data} disabled={ed} onChange={(e) => mudar('data', e.target.value)} /></Campo>
        <Campo rot="O.P de origem" c={2} dica="Escolhendo a O.P, os dados da peça vêm sozinhos">
          <select value={r.opId ?? ''} disabled={ed} onChange={(e) => escolherOP(e.target.value)}>
            <option value="">— sem O.P —</option>
            {opsRecentes.map((o) => <option key={o.id} value={o.id}>{o.numero} · {o.desenho}</option>)}
          </select>
        </Campo>
        <Campo rot="Cliente" c={2}><select value={r.clienteId} disabled={ed} onChange={(e) => mudar('clienteId', e.target.value)}>{base.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
        <Campo rot="Desenho" c={2}><input value={r.desenho} disabled={ed} onChange={(e) => mudar('desenho', e.target.value)} /></Campo>
        <Campo rot="Liga perdida" c={2}><select value={r.ligaId} disabled={ed} onChange={(e) => mudar('ligaId', e.target.value)}>{base.ligas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></Campo>
        <Campo rot="Peças perdidas"><CampoNum valor={r.quantidade} mudar={(v) => mudar('quantidade', Math.round(v ?? 0))} disabled={ed} /></Campo>
        <Campo rot="Peso bruto unitário"><CampoNum valor={r.pesoUnitKg} mudar={(v) => mudar('pesoUnitKg', v ?? 0)} disabled={ed} sufixo="kg" /></Campo>
        <Campo rot="Motivo da perda" c={2}><input value={r.motivo} disabled={ed} onChange={(e) => mudar('motivo', e.target.value)} list="motivos-rnc" /></Campo>
        <Campo rot="Peso total perdido" c={2}><input value={kg(pesoRnc(r))} disabled /></Campo>
        <Campo rot="Ação corretiva" c={4}><textarea rows={3} value={r.acaoCorretiva} disabled={ed} onChange={(e) => mudar('acaoCorretiva', e.target.value)} /></Campo>
      </div>
      <datalist id="motivos-rnc">{MOTIVOS_RNC.map((m) => <option key={m} value={m} />)}</datalist>
      {novo && r.opId && <label className="chk-linha topo-sec"><input type="checkbox" checked={lancarNaOP} onChange={(e) => setLancarNaOP(e.target.checked)} /><span>Lançar estas peças como refugo na O.P<small>A O.P passa a pedir {r.quantidade} peça(s) a mais no forno.</small></span></label>}
      {!novo && r.opId && <p className="nota">O.P de origem: {base.ops.find((o) => o.id === r.opId)?.numero} · aberta em {br(base.ops.find((o) => o.id === r.opId)?.data ?? r.data)}</p>}
      {imprimir && <Imprimir aoTerminar={() => setImprimir(false)}><DocRnc r={r} base={base} /></Imprimir>}
    </Registro>
  );
}
