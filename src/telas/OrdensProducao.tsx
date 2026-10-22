// Ordens de Produção — substitui "GERAÇÃO DE O.P" + as 200 abas "OP (n)".
// Novo: o progresso (fundidas, boas, faltam) vem das Fichas do Forno; a O.P avisa sozinha quando atrasa.
import { useState } from 'react';
import type { OrdemProducao, RefugoOP } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, BuscaLista, Campo, CampoNum, Contador, OrigemPlanilha, Registro, Segmentado, Tag, TituloPagina, Vazio, useEdita, useRascunho } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { Imprimir } from '../componentes/Folha';
import { DocOP } from '../componentes/Documentos';
import { useAbrir } from '../componentes/useAbrir';
import { STATUS_OP, pesosOP, progressoOP } from '../regras/producao';
import { mesDe, proximoNumero } from '../regras/periodo';
import { MOTIVOS_RNC } from '../regras/qualidade';
import { br, brCurto, hoje, somaDias } from '../util/datas';
import { kg, kgP, n0, pct, semAcento, soma } from '../util/formato';

type Filtro = 'abertas' | 'atrasadas' | 'concluidas' | 'todas';

export function OrdensProducao() {
  const { base } = useDados();
  const hj = hoje();
  const edita = useEdita('ops');
  const [abrir, setAbrir] = useAbrir();
  const [f, setF] = useState<Filtro>('abertas');
  const [t, setT] = useState('');
  const cli = (id: string) => base.clientes.find((c) => c.id === id)?.nome ?? '';
  const liga = (id: string) => base.ligas.find((l) => l.id === id)?.nome ?? '';
  const linhas = [...base.ops].reverse().map((o) => ({ o, p: progressoOP(o, base, hj) }));
  const mes = mesDe(hj);
  const filtro = (x: Filtro) => linhas.filter(({ p }) => x === 'abertas' ? p.status !== 'concluida' : x === 'atrasadas' ? p.status === 'atrasada' : x === 'concluidas' ? p.status === 'concluida' : true);
  const q = semAcento(t);
  const vis = filtro(f).filter(({ o }) => !q || semAcento(`${o.numero} ${o.desenho} ${cli(o.clienteId)} ${liga(o.ligaId)}`).includes(q));
  if (f === 'abertas') vis.sort((a, b) => a.o.dataPrevista.localeCompare(b.o.dataPrevista));
  const abertas = filtro('abertas');
  const aFundirKg = soma(abertas, ({ o, p }) => p.faltam * o.pesoBrutoKg);
  const concluidasMes = linhas.filter(({ o }) => o.dataEfetiva?.startsWith(mes)).length;
  const sel = abrir === 'novo' ? null : base.ops.find((o) => o.id === abrir);

  return (
    <>
      <TituloPagina titulo="Ordens de Produção" sub={<OrigemPlanilha aba="GERAÇÃO DE O.P + abas OP (1…200)" />}>
        <BotaoIcone icone="mais" titulo={edita ? 'Nova O.P' : 'Seu perfil só consulta'} pri disabled={!edita} onClick={() => setAbrir('novo')} />
      </TituloPagina>
      <div className="contadores c4">
        <Contador icone="lista" valor={abertas.length} rot="O.P em aberto" />
        <Contador icone="alerta" valor={filtro('atrasadas').length} rot="atrasadas" cls={filtro('atrasadas').length ? 'negativo' : ''} />
        <Contador icone="fogo" valor={kg(aFundirKg)} rot="peso bruto a fundir" />
        <Contador icone="check" valor={concluidasMes} rot="concluídas no mês" />
      </div>
      <div className="barra">
        <BuscaLista valor={t} setValor={setT} dica="Buscar por O.P, desenho, cliente ou liga" />
        <Segmentado valor={f} setValor={setF} opcoes={[
          { v: 'abertas', nome: 'Em aberto', n: abertas.length }, { v: 'atrasadas', nome: 'Atrasadas', n: filtro('atrasadas').length },
          { v: 'concluidas', nome: 'Concluídas', n: filtro('concluidas').length }, { v: 'todas', nome: 'Todas', n: linhas.length }]} />
      </div>
      <div className="bloco">
        {vis.length === 0 ? <Vazio>Nenhuma O.P neste filtro.</Vazio> : (
          <table className="tab">
            <thead><tr><th>O.P</th><th>Entrada</th><th>Cliente</th><th>Desenho</th><th>Liga</th><th className="dir">Qtde</th><th>Progresso</th><th>Entrega</th><th>Situação</th></tr></thead>
            <tbody>
              {vis.slice(0, 120).map(({ o, p }) => (
                <tr key={o.id} className="clic" onClick={() => setAbrir(o.id)}>
                  <td className="mono">{o.numero}</td><td className="mono">{brCurto(o.data)}</td><td>{cli(o.clienteId)}</td><td>{o.desenho}</td><td className="mut">{liga(o.ligaId)}</td>
                  <td className="dir mono">{o.quantidade}</td>
                  <td><Progresso v={p.pct} rot={`${p.boas}/${o.quantidade}`} /></td>
                  <td className="mono">{br(o.dataEfetiva ?? o.dataPrevista)}</td>
                  <td><Tag cls={STATUS_OP[p.status].cls}>{STATUS_OP[p.status].nome}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {(sel || abrir === 'novo') && <RegistroOP op={sel ?? undefined} fechar={() => setAbrir(null)} />}
    </>
  );
}

export function Progresso({ v, rot }: { v: number; rot?: string }) {
  return <div className="prog" title={pct(v, 0)}><div className="prog-trilho"><i style={{ width: `${Math.round(v * 100)}%` }} className={v >= 1 ? 'cheio' : ''} /></div>{rot && <small className="mono">{rot}</small>}</div>;
}

function RegistroOP({ op, fechar }: { op?: OrdemProducao; fechar: () => void }) {
  const { base, acoes } = useDados();
  const hj = hoje();
  const edita = useEdita('ops');
  const novo = !op;
  const inicial: OrdemProducao = op ?? {
    id: acoes.novoId('op'), numero: proximoNumero(base.ops, hj), data: hj, clienteId: base.clientes[0].id, desenho: '', ligaId: 'gg20',
    quantidade: 0, pesoLiquidoKg: 0, pesoBrutoKg: 0, dataPrevista: somaDias(hj, 21), refugos: [],
  };
  const { r, setR, mudar, editando, setEditando, erro, setErro, descartar } = useRascunho(inicial, novo);
  const [imprimir, setImprimir] = useState(false);
  const p = pesosOP(r), pr = progressoOP(r, base, hj);
  const corridas = base.fichas.filter((f) => f.pecas.some((x) => x.opId === r.id));
  const orc = base.orcamentos.find((o) => o.id === r.orcamentoId);
  const ed = !editando;
  const salvar = () => {
    if (!r.desenho.trim()) return setErro('Informe o desenho / modelo.');
    if (!(r.quantidade > 0)) return setErro('Informe a quantidade de peças.');
    if (!(r.pesoLiquidoKg > 0) || !(r.pesoBrutoKg > 0)) return setErro('Informe o peso líquido e o peso bruto da peça.');
    if (r.pesoBrutoKg < r.pesoLiquidoKg) return setErro('O peso bruto (com canais e massalotes) não pode ser menor que o líquido.');
    acoes.salvar('ops', r);
    setErro(''); setEditando(false);
    if (novo) fechar();
  };
  const mudaRef = (i: number, v: Partial<RefugoOP>) => setR({ ...r, refugos: r.refugos.map((x, k) => (k === i ? { ...x, ...v } : x)) });
  const concluir = () => { const n = { ...r, dataEfetiva: hj }; setR(n); acoes.salvar('ops', n); };
  return (
    <Registro
      titulo={novo ? 'Nova ordem de produção' : <>O.P <span className="mono">{r.numero}</span></>} novo={novo} edita={edita} editando={editando} setEditando={setEditando}
      salvar={salvar} descartar={novo ? fechar : descartar} fechar={fechar} erro={erro} imprimir={novo ? undefined : () => setImprimir(true)}
      cabecalho={!novo && <><Tag cls={STATUS_OP[pr.status].cls}>{STATUS_OP[pr.status].nome}</Tag>{orc && <span className="mut peq">do orçamento {orc.numero}</span>}</>}
      acoesExtra={!novo && !r.dataEfetiva && pr.faltam === 0 && <BotaoIcone icone="check" titulo="Concluir O.P (todas as peças boas fundidas)" cls="verde" disabled={!edita || editando} onClick={concluir} />}
    >
      <div className="form-grade">
        <Campo rot="Número da O.P"><input value={r.numero} disabled /></Campo>
        <Campo rot="Data de entrada"><input type="date" value={r.data} disabled={ed} onChange={(e) => mudar('data', e.target.value)} /></Campo>
        <Campo rot="Cliente" c={2}><select value={r.clienteId} disabled={ed} onChange={(e) => mudar('clienteId', e.target.value)}>{base.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
        <Campo rot="Desenho / modelo" c={2}><input value={r.desenho} disabled={ed} onChange={(e) => mudar('desenho', e.target.value)} placeholder="Ex.: DES-1042 · Polia 400 mm" /></Campo>
        <Campo rot="Material (liga)" c={2}><select value={r.ligaId} disabled={ed} onChange={(e) => mudar('ligaId', e.target.value)}>{base.ligas.map((l) => <option key={l.id} value={l.id}>{l.nome} · {l.norma}</option>)}</select></Campo>
        <Campo rot="Quantidade (pç)"><CampoNum valor={r.quantidade} mudar={(v) => mudar('quantidade', Math.round(v ?? 0))} disabled={ed} /></Campo>
        <Campo rot="Peso líquido da peça"><CampoNum valor={r.pesoLiquidoKg} mudar={(v) => mudar('pesoLiquidoKg', v ?? 0)} disabled={ed} sufixo="kg" /></Campo>
        <Campo rot="Peso bruto da peça" dica="Peça + canais e massalotes"><CampoNum valor={r.pesoBrutoKg} mudar={(v) => mudar('pesoBrutoKg', v ?? 0)} disabled={ed} sufixo="kg" /></Campo>
        <Campo rot="Data prevista"><input type="date" value={r.dataPrevista} disabled={ed} onChange={(e) => mudar('dataPrevista', e.target.value)} /></Campo>
        <Campo rot="Data efetiva"><input type="date" value={r.dataEfetiva ?? ''} disabled={ed} onChange={(e) => mudar('dataEfetiva', e.target.value || undefined)} /></Campo>
      </div>
      <div className="resumo-linha">
        <div><span>Peso líquido total</span><b>{kg(p.liqTotal)}</b></div>
        <div><span>Peso bruto total</span><b>{kg(p.brutoTotal)}</b></div>
        <div><span>Fundidas · boas</span><b>{pr.fundidas} · {pr.boas}</b></div>
        <div><span>Faltam fundir</span><b>{pr.faltam} pç</b></div>
        <div><span>Bruto refugado</span><b>{kg(p.brutoRefugado)} <small>{pct(p.pctBrutoRefugado)}</small></b></div>
      </div>
      <div className="g2 topo-sec">
        <Bloco titulo={<><Icone n="fogo" /> Corridas com peças desta O.P</>}>
          {corridas.length === 0 ? <Vazio>Ainda não entrou no forno.</Vazio> : (
            <table className="tab tab-mini"><thead><tr><th>Ficha</th><th>Data</th><th className="dir">Peças</th></tr></thead>
              <tbody>{corridas.map((f) => <tr key={f.id}><td className="mono">{f.numero}</td><td className="mono">{br(f.data)}</td><td className="dir mono">{soma(f.pecas.filter((x) => x.opId === r.id), (x) => x.pecas)}</td></tr>)}</tbody></table>
          )}
        </Bloco>
        <Bloco titulo={<><Icone n="alerta" /> Refugo da O.P</>} extra={editando && <BotaoIcone icone="mais" titulo="Lançar refugo" cls="peq" onClick={() => setR({ ...r, refugos: [...r.refugos, { data: hj, quantidade: 1, causa: MOTIVOS_RNC[0] }] })} />}>
          {r.refugos.length === 0 ? <Vazio>Sem refugo.</Vazio> : (
            <table className="tab tab-mini"><thead><tr><th>Data</th><th className="dir">Qtde</th><th className="dir">Bruto</th><th>Causa</th>{editando && <th />}</tr></thead>
              <tbody>{r.refugos.map((x, i) => (
                <tr key={i}>
                  <td>{editando ? <input type="date" value={x.data} onChange={(e) => mudaRef(i, { data: e.target.value })} /> : <span className="mono">{br(x.data)}</span>}</td>
                  <td className="dir">{editando ? <CampoNum valor={x.quantidade} mudar={(v) => mudaRef(i, { quantidade: Math.round(v ?? 0) })} /> : <span className="mono">{x.quantidade}</span>}</td>
                  <td className="dir mono">{kgP(x.quantidade * r.pesoBrutoKg)}</td>
                  <td>{editando ? <input value={x.causa} onChange={(e) => mudaRef(i, { causa: e.target.value })} list="causas" /> : x.causa}</td>
                  {editando && <td><BotaoIcone icone="x" titulo="Tirar" cls="peq" onClick={() => setR({ ...r, refugos: r.refugos.filter((_, k) => k !== i) })} /></td>}
                </tr>))}</tbody></table>
          )}
          <datalist id="causas">{MOTIVOS_RNC.map((m) => <option key={m} value={m} />)}</datalist>
        </Bloco>
      </div>
      {!novo && <p className="nota">Peças fundidas: {n0(pr.fundidas)} de {n0(r.quantidade)} · as peças entram pela Ficha do Forno (apontamento da corrida).</p>}
      {imprimir && <Imprimir aoTerminar={() => setImprimir(false)}><DocOP op={r} base={base} /></Imprimir>}
    </Registro>
  );
}
