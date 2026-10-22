// Faturamento — substitui a aba "FATURAMENTO" (data, kg faturado, preço/kg, liga, nota fiscal, cliente).
import { useState } from 'react';
import type { NotaFaturada } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, BuscaLista, Campo, CampoNum, Contador, OrigemPlanilha, Registro, SeletorMes, TituloPagina, Vazio, useEdita, useRascunho } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { BarrasH, Proporcao } from '../componentes/Graficos';
import { useAbrir } from '../componentes/useAbrir';
import { totalFaturado } from '../regras/custo';
import { mesDe, noMes } from '../regras/periodo';
import { brCurto, hoje } from '../util/datas';
import { kg, moeda, rkg, semAcento, soma } from '../util/formato';

export function Faturamento() {
  const { base } = useDados();
  const hj = hoje();
  const edita = useEdita('faturamento');
  const [abrir, setAbrir] = useAbrir();
  const [mes, setMes] = useState(mesDe(hj));
  const [t, setT] = useState('');
  const cli = (id: string) => base.clientes.find((c) => c.id === id)?.nome ?? '';
  const liga = (id: string) => base.ligas.find((l) => l.id === id)?.nome ?? '';
  const doMes = base.faturamento.filter((n) => noMes(n.data, mes)).reverse();
  const q = semAcento(t);
  const vis = doMes.filter((n) => !q || semAcento(`${n.notaFiscal} ${cli(n.clienteId)}`).includes(q));
  const tot = totalFaturado(base, mes);
  const porCli = base.clientes.map((c) => ({ rotulo: c.nome, valor: soma(doMes.filter((n) => n.clienteId === c.id), (n) => n.quantidadeKg * n.precoKg) })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor).slice(0, 8);
  const porLiga = base.ligas.map((l) => ({ nome: l.nome, valor: soma(doMes.filter((n) => n.ligaId === l.id), (n) => n.quantidadeKg) })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor).slice(0, 4);
  const sel = abrir === 'novo' ? null : base.faturamento.find((n) => n.id === abrir);
  return (
    <>
      <TituloPagina titulo="Faturamento" sub={<OrigemPlanilha aba="FATURAMENTO" />}>
        <SeletorMes mes={mes} setMes={setMes} atual={mesDe(hj)} />
        <BotaoIcone icone="mais" titulo={edita ? 'Lançar nota' : 'Seu perfil só consulta'} pri disabled={!edita} onClick={() => setAbrir('novo')} />
      </TituloPagina>
      <div className="contadores c4">
        <Contador icone="dinheiro" valor={moeda(tot.valor)} rot="faturado no mês" />
        <Contador icone="balanca" valor={kg(tot.kg)} rot="peso faturado" />
        <Contador icone="orcamento" valor={rkg(tot.kg ? tot.valor / tot.kg : 0)} rot="preço médio" />
        <Contador icone="nota" valor={tot.notas} rot="notas fiscais" />
      </div>
      <div className="grade2">
        <div className="pilha">
          <div className="barra sem-marg"><BuscaLista valor={t} setValor={setT} dica="Buscar por nota fiscal ou cliente" /></div>
          <div className="bloco">
            {vis.length === 0 ? <Vazio>Nenhuma nota no mês.</Vazio> : (
              <table className="tab">
                <thead><tr><th>Data</th><th>Nota fiscal</th><th>Cliente</th><th>Liga</th><th className="dir">Peso</th><th className="dir">Preço/kg</th><th className="dir">Total</th></tr></thead>
                <tbody>{vis.map((n) => (
                  <tr key={n.id} className="clic" onClick={() => setAbrir(n.id)}>
                    <td className="mono">{brCurto(n.data)}</td><td className="mono">{n.notaFiscal}</td><td>{cli(n.clienteId)}</td><td className="mut">{liga(n.ligaId)}</td>
                    <td className="dir mono">{kg(n.quantidadeKg)}</td><td className="dir mono">{moeda(n.precoKg)}</td><td className="dir mono">{moeda(n.quantidadeKg * n.precoKg)}</td>
                  </tr>))}</tbody>
              </table>
            )}
          </div>
        </div>
        <div className="pilha">
          <Bloco titulo={<><Icone n="predio" /> Por cliente</>}><div className="pad">{porCli.length ? <BarrasH dados={porCli} fmt={(v) => moeda(v).replace(/,\d\d$/, '')} /> : <Vazio>—</Vazio>}</div></Bloco>
          <Bloco titulo={<><Icone n="tubo" /> Peso por liga</>}><div className="pad">{porLiga.length ? <Proporcao partes={porLiga} fmt={kg} /> : <Vazio>—</Vazio>}</div></Bloco>
        </div>
      </div>
      {(sel || abrir === 'novo') && <RegistroNota nota={sel ?? undefined} fechar={() => setAbrir(null)} />}
    </>
  );
}

function RegistroNota({ nota, fechar }: { nota?: NotaFaturada; fechar: () => void }) {
  const { base, acoes } = useDados();
  const edita = useEdita('faturamento');
  const novo = !nota;
  const proxNF = String(Math.max(0, ...base.faturamento.map((n) => Number(n.notaFiscal) || 0)) + 1);
  const inicial: NotaFaturada = nota ?? { id: acoes.novoId('nf'), data: hoje(), notaFiscal: proxNF, clienteId: base.clientes[0].id, ligaId: 'gg20', quantidadeKg: 0, precoKg: 0 };
  const { r, mudar, editando, setEditando, erro, setErro, descartar } = useRascunho(inicial, novo);
  const ed = !editando;
  const salvar = () => {
    if (!r.notaFiscal.trim()) return setErro('Informe o número da nota.');
    if (!(r.quantidadeKg > 0) || !(r.precoKg > 0)) return setErro('Informe o peso faturado e o preço por kg.');
    acoes.salvar('faturamento', r); setErro(''); setEditando(false); if (novo) fechar();
  };
  return (
    <Registro titulo={novo ? 'Lançar nota fiscal' : <>Nota fiscal <span className="mono">{r.notaFiscal}</span></>} novo={novo} edita={edita} editando={editando} setEditando={setEditando} salvar={salvar} descartar={novo ? fechar : descartar} fechar={fechar} erro={erro}>
      <div className="form-grade">
        <Campo rot="Data de entrada"><input type="date" value={r.data} disabled={ed} onChange={(e) => mudar('data', e.target.value)} /></Campo>
        <Campo rot="Nota fiscal"><input value={r.notaFiscal} disabled={ed} onChange={(e) => mudar('notaFiscal', e.target.value)} /></Campo>
        <Campo rot="Cliente" c={2}><select value={r.clienteId} disabled={ed} onChange={(e) => mudar('clienteId', e.target.value)}>{base.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Campo>
        <Campo rot="Liga fundida" c={2}><select value={r.ligaId} disabled={ed} onChange={(e) => mudar('ligaId', e.target.value)}>{base.ligas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></Campo>
        <Campo rot="Quantidade faturada"><CampoNum valor={r.quantidadeKg} mudar={(v) => mudar('quantidadeKg', v ?? 0)} disabled={ed} sufixo="kg" /></Campo>
        <Campo rot="Preço por kg"><CampoNum valor={r.precoKg} mudar={(v) => mudar('precoKg', v ?? 0)} disabled={ed} casas={2} sufixo="R$" /></Campo>
        <Campo rot="Preço total faturado" c={4}><input value={moeda(r.quantidadeKg * r.precoKg)} disabled /></Campo>
      </div>
    </Registro>
  );
}
