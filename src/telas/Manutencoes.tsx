// Manutenção — substitui a aba "MANUTENÇÃO" (compra de equipamento e combustível).
import { useState } from 'react';
import type { Manutencao } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, Campo, CampoNum, Contador, OrigemPlanilha, Registro, Segmentado, SeletorMes, Tag, TituloPagina, Vazio, useEdita, useRascunho } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { BarrasH } from '../componentes/Graficos';
import { useAbrir } from '../componentes/useAbrir';
import { mesDe, noMes } from '../regras/periodo';
import { br, brCurto, hoje } from '../util/datas';
import { moeda, soma } from '../util/formato';

const TIPOS: Record<Manutencao['tipo'], string> = { manutencao: 'Manutenção', compra: 'Compra de equipamento', combustivel: 'Combustível' };
type Filtro = 'todas' | Manutencao['tipo'];

export function Manutencoes() {
  const { base } = useDados();
  const hj = hoje();
  const edita = useEdita('manutencao');
  const [abrir, setAbrir] = useAbrir();
  const [mes, setMes] = useState(mesDe(hj));
  const [f, setF] = useState<Filtro>('todas');
  const doMes = base.manutencoes.filter((m) => noMes(m.data, mes)).reverse();
  const vis = doMes.filter((m) => f === 'todas' || m.tipo === f);
  const fora = base.manutencoes.filter((m) => m.tipo === 'manutencao' && !m.dataRetorno);
  const porEq = [...new Set(doMes.map((m) => m.equipamento))].map((e) => ({ rotulo: e, valor: soma(doMes.filter((m) => m.equipamento === e), (m) => m.valor) })).sort((a, b) => b.valor - a.valor);
  const sel = abrir === 'novo' ? null : base.manutencoes.find((m) => m.id === abrir);
  return (
    <>
      <TituloPagina titulo="Manutenção e Combustível" sub={<OrigemPlanilha aba="MANUTENÇÃO" />}>
        <SeletorMes mes={mes} setMes={setMes} atual={mesDe(hj)} />
        <BotaoIcone icone="mais" titulo={edita ? 'Lançar manutenção / compra' : 'Seu perfil só consulta'} pri disabled={!edita} onClick={() => setAbrir('novo')} />
      </TituloPagina>
      <div className="contadores c4">
        <Contador icone="dinheiro" valor={moeda(soma(doMes, (m) => m.valor))} rot="custo no mês (vai ao Custo Mensal)" />
        <Contador icone="ferramenta" valor={moeda(soma(doMes.filter((m) => m.tipo === 'manutencao'), (m) => m.valor))} rot="manutenção" />
        <Contador icone="fogo" valor={moeda(soma(doMes.filter((m) => m.tipo === 'combustivel'), (m) => m.valor))} rot="combustível" />
        <Contador icone="relogio" valor={fora.length} rot="equipamentos fora (sem retorno)" cls={fora.length ? 'alerta' : ''} />
      </div>
      <div className="grade2">
        <div className="pilha">
          <div className="barra sem-marg"><Segmentado valor={f} setValor={setF} opcoes={[{ v: 'todas', nome: 'Todas', n: doMes.length }, ...(Object.keys(TIPOS) as Manutencao['tipo'][]).map((k) => ({ v: k, nome: TIPOS[k], n: doMes.filter((m) => m.tipo === k).length }))]} /></div>
          <div className="bloco">
            {vis.length === 0 ? <Vazio>Nada lançado.</Vazio> : (
              <table className="tab">
                <thead><tr><th>Entrada</th><th>Equipamento</th><th>Motivo</th><th>Previsto</th><th>Retorno</th><th>Fornecedor</th><th className="dir">Valor</th></tr></thead>
                <tbody>{vis.map((m) => (
                  <tr key={m.id} className="clic" onClick={() => setAbrir(m.id)}>
                    <td className="mono">{brCurto(m.data)}</td><td>{m.equipamento}</td><td className="mut">{m.motivo}</td>
                    <td className="mono">{m.dataPrevista ? brCurto(m.dataPrevista) : '—'}</td>
                    <td>{m.tipo !== 'manutencao' ? <span className="mut">—</span> : m.dataRetorno ? <span className="mono">{brCurto(m.dataRetorno)}</span> : <Tag cls={m.dataPrevista && m.dataPrevista < hj ? 't-no' : 't-at'}>fora</Tag>}</td>
                    <td className="mut">{m.fornecedor}</td><td className="dir mono">{moeda(m.valor)}</td>
                  </tr>))}</tbody>
              </table>
            )}
          </div>
        </div>
        <div className="pilha">
          <Bloco titulo={<><Icone n="ferramenta" /> Por equipamento no mês</>}><div className="pad">{porEq.length ? <BarrasH dados={porEq} fmt={(v) => moeda(v).replace(/,\d\d$/, '')} /> : <Vazio>—</Vazio>}</div></Bloco>
          {fora.length > 0 && <Bloco titulo={<><Icone n="relogio" /> Aguardando retorno</>}>
            <ul className="lista-cat">{fora.map((m) => <li key={m.id}><span>{m.equipamento}<small className="mut"> · desde {br(m.data)}</small></span><b>{m.dataPrevista ? `prev. ${brCurto(m.dataPrevista)}` : ''}</b></li>)}</ul>
          </Bloco>}
        </div>
      </div>
      {(sel || abrir === 'novo') && <RegistroMan m={sel ?? undefined} fechar={() => setAbrir(null)} />}
    </>
  );
}

function RegistroMan({ m, fechar }: { m?: Manutencao; fechar: () => void }) {
  const { acoes } = useDados();
  const edita = useEdita('manutencao');
  const novo = !m;
  const inicial: Manutencao = m ?? { id: acoes.novoId('mn'), data: hoje(), equipamento: '', tipo: 'manutencao', motivo: '', valor: 0, fornecedor: '' };
  const { r, mudar, editando, setEditando, erro, setErro, descartar } = useRascunho(inicial, novo);
  const ed = !editando;
  const salvar = () => {
    if (!r.equipamento.trim()) return setErro('Informe o equipamento.');
    if (!(r.valor > 0)) return setErro('Informe o valor.');
    acoes.salvar('manutencoes', r); setErro(''); setEditando(false); if (novo) fechar();
  };
  return (
    <Registro titulo={novo ? 'Lançar manutenção / compra' : r.equipamento} novo={novo} edita={edita} editando={editando} setEditando={setEditando} salvar={salvar} descartar={novo ? fechar : descartar} fechar={fechar} erro={erro}>
      <div className="form-grade">
        <Campo rot="Data de entrada"><input type="date" value={r.data} disabled={ed} onChange={(e) => mudar('data', e.target.value)} /></Campo>
        <Campo rot="Tipo"><select value={r.tipo} disabled={ed} onChange={(e) => mudar('tipo', e.target.value as Manutencao['tipo'])}>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
        <Campo rot="Equipamento" c={2}><input value={r.equipamento} disabled={ed} onChange={(e) => mudar('equipamento', e.target.value)} /></Campo>
        <Campo rot="Motivo" c={4}><input value={r.motivo} disabled={ed} onChange={(e) => mudar('motivo', e.target.value)} /></Campo>
        <Campo rot="Data prevista"><input type="date" value={r.dataPrevista ?? ''} disabled={ed} onChange={(e) => mudar('dataPrevista', e.target.value || undefined)} /></Campo>
        <Campo rot="Data de retorno"><input type="date" value={r.dataRetorno ?? ''} disabled={ed} onChange={(e) => mudar('dataRetorno', e.target.value || undefined)} /></Campo>
        <Campo rot="Preço total"><CampoNum valor={r.valor} mudar={(v) => mudar('valor', v ?? 0)} disabled={ed} casas={2} sufixo="R$" /></Campo>
        <Campo rot="Fornecedor"><input value={r.fornecedor} disabled={ed} onChange={(e) => mudar('fornecedor', e.target.value)} /></Campo>
      </div>
    </Registro>
  );
}
