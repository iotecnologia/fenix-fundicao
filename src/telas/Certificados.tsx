// Certificados de Qualidade — substitui "GERAÇÃO DE CERTIFICADO" (1 e 2) + as 200 abas "CQ (n)".
// Novo: escolhendo a nota fiscal e a corrida, a química vem da ficha do forno (não é redigitada) e é conferida
// contra a norma; as propriedades mecânicas são conferidas contra a liga.
import { useState } from 'react';
import type { Certificado, Mecanica } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, BuscaLista, Campo, CampoNum, Contador, OrigemPlanilha, Registro, SeletorMes, Tag, TituloPagina, Vazio, useEdita, useRascunho } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { Imprimir } from '../componentes/Folha';
import { DocCertificado } from '../componentes/Documentos';
import { useAbrir } from '../componentes/useAbrir';
import { MECANICA, conferirCertificado } from '../regras/qualidade';
import { textoFaixa } from '../regras/forno';
import { mesDe, noMes, proximoNumero } from '../regras/periodo';
import { br, brCurto, hoje } from '../util/datas';
import { n2, semAcento } from '../util/formato';

export function Certificados() {
  const { base } = useDados();
  const hj = hoje();
  const edita = useEdita('certificados');
  const [abrir, setAbrir] = useAbrir();
  const [mes, setMes] = useState(mesDe(hj));
  const [t, setT] = useState('');
  const cli = (id: string) => base.clientes.find((c) => c.id === id)?.nome ?? '';
  const doMes = base.certificados.filter((c) => noMes(c.data, mes)).reverse().map((c) => ({ c, cf: conferirCertificado(c, base) }));
  const q = semAcento(t);
  const vis = doMes.filter(({ c }) => !q || semAcento(`${c.numero} ${c.notaFiscal} ${cli(c.clienteId)}`).includes(q));
  const semCq = base.faturamento.filter((n) => noMes(n.data, mes) && !base.certificados.some((c) => c.notaFiscal === n.notaFiscal));
  const sel = abrir === 'novo' ? null : base.certificados.find((c) => c.id === abrir);
  return (
    <>
      <TituloPagina titulo="Certificados de Qualidade" sub={<OrigemPlanilha aba="GERAÇÃO DE CERTIFICADO + abas CQ (1…200)" />}>
        <SeletorMes mes={mes} setMes={setMes} atual={mesDe(hj)} />
        <BotaoIcone icone="mais" titulo={edita ? 'Novo certificado' : 'Seu perfil só consulta'} pri disabled={!edita} onClick={() => setAbrir('novo')} />
      </TituloPagina>
      <div className="contadores c4">
        <Contador icone="escudo" valor={doMes.length} rot="certificados no mês" />
        <Contador icone="check" valor={doMes.filter((x) => x.cf.ok).length} rot="conformes" />
        <Contador icone="alerta" valor={doMes.filter((x) => !x.cf.ok).length} rot="com resultado fora" cls={doMes.some((x) => !x.cf.ok) ? 'alerta' : ''} />
        <Contador icone="nota" valor={semCq.length} rot="notas do mês sem certificado" />
      </div>
      <div className="barra"><BuscaLista valor={t} setValor={setT} dica="Buscar por certificado, nota fiscal ou cliente" /></div>
      <div className="bloco">
        {vis.length === 0 ? <Vazio>Nenhum certificado.</Vazio> : (
          <table className="tab">
            <thead><tr><th>Certificado</th><th>Data</th><th>Cliente</th><th>Nota fiscal</th><th>Corrida</th><th>Material</th><th>Resultado</th></tr></thead>
            <tbody>{vis.map(({ c, cf }) => (
              <tr key={c.id} className="clic" onClick={() => setAbrir(c.id)}>
                <td className="mono">{c.numero}</td><td className="mono">{brCurto(c.data)}</td><td>{cli(c.clienteId)}</td><td className="mono">{c.notaFiscal}</td>
                <td className="mono">{cf.ficha?.numero}</td><td className="mut">{cf.liga?.nome} · {cf.liga?.norma}</td>
                <td>{cf.ok ? <Tag cls="t-ok">conforme</Tag> : <Tag cls="t-no">fora da norma</Tag>}</td>
              </tr>))}</tbody>
          </table>
        )}
      </div>
      {(sel || abrir === 'novo') && <RegistroCq cq={sel ?? undefined} fechar={() => setAbrir(null)} />}
    </>
  );
}

function RegistroCq({ cq, fechar }: { cq?: Certificado; fechar: () => void }) {
  const { base, acoes } = useDados();
  const hj = hoje();
  const edita = useEdita('certificados');
  const novo = !cq;
  const nf0 = [...base.faturamento].reverse().find((n) => !base.certificados.some((c) => c.notaFiscal === n.notaFiscal)) ?? base.faturamento[base.faturamento.length - 1];
  const inicial: Certificado = cq ?? { id: acoes.novoId('cq'), numero: proximoNumero(base.certificados, hj), data: hj, clienteId: nf0.clienteId, notaFiscal: nf0.notaFiscal, fichaId: '', ligaId: nf0.ligaId, itens: [], mecanica: {}, metalografia: '' };
  const { r, setR, mudar, editando, setEditando, erro, setErro, descartar } = useRascunho(inicial, novo);
  const [imprimir, setImprimir] = useState(false);
  const ed = !editando;
  const cf = conferirCertificado(r, base);
  const notas = [...base.faturamento].reverse().slice(0, 60);
  const corridas = [...base.fichas].reverse().filter((f) => f.ligaId === r.ligaId).slice(0, 40);
  const escolherNota = (nf: string) => {
    const n = base.faturamento.find((x) => x.notaFiscal === nf);
    if (!n) return;
    // corrida sugerida: a última que fundiu peças deste cliente nesta liga
    const ff = [...base.fichas].reverse().find((f) => f.ligaId === n.ligaId && f.pecas.some((p) => base.ops.find((o) => o.id === p.opId)?.clienteId === n.clienteId));
    const itens = ff ? [...new Set(ff.pecas.map((p) => base.ops.find((o) => o.id === p.opId)).filter((o) => o?.clienteId === n.clienteId).map((o) => o!.desenho))] : [];
    setR({ ...r, notaFiscal: nf, clienteId: n.clienteId, ligaId: n.ligaId, fichaId: ff?.id ?? '', itens });
  };
  const salvar = () => {
    if (!r.fichaId) return setErro('Escolha a corrida (ficha do forno) de onde vem a química.');
    const itens = r.itens.map((x) => x.trim()).filter(Boolean);
    if (!itens.length) return setErro('Informe ao menos um item fabricado.');
    acoes.salvar('certificados', { ...r, itens });
    setR({ ...r, itens });
    setErro(''); setEditando(false);
    if (novo) fechar();
  };
  const tt = r.tratamento;
  return (
    <Registro titulo={novo ? 'Novo certificado de qualidade' : <>Certificado <span className="mono">{r.numero}</span></>} novo={novo} edita={edita} editando={editando} setEditando={setEditando}
      salvar={salvar} descartar={novo ? fechar : descartar} fechar={fechar} erro={erro} imprimir={novo ? undefined : () => setImprimir(true)}
      cabecalho={r.fichaId && (cf.ok ? <Tag cls="t-ok">material conforme</Tag> : <Tag cls="t-no">resultado fora da especificação</Tag>)}>
      <div className="form-grade">
        <Campo rot="Nº do certificado"><input value={r.numero} disabled /></Campo>
        <Campo rot="Data"><input type="date" value={r.data} disabled={ed} onChange={(e) => mudar('data', e.target.value)} /></Campo>
        <Campo rot="Nota fiscal" c={2}><select value={r.notaFiscal} disabled={ed} onChange={(e) => escolherNota(e.target.value)}>{notas.map((n) => <option key={n.id} value={n.notaFiscal}>NF {n.notaFiscal} · {base.clientes.find((c) => c.id === n.clienteId)?.nome} · {br(n.data)}</option>)}</select></Campo>
        <Campo rot="Cliente" c={2}><input value={base.clientes.find((c) => c.id === r.clienteId)?.nome ?? ''} disabled /></Campo>
        <Campo rot="Corrida (ficha do forno)" c={2}><select value={r.fichaId} disabled={ed} onChange={(e) => mudar('fichaId', e.target.value)}><option value="">— escolher —</option>{corridas.map((f) => <option key={f.id} value={f.id}>{f.numero} · {br(f.data)}</option>)}</select></Campo>
        <Campo rot="Itens fabricados (um por linha)" c={4}><textarea rows={2} value={r.itens.join('\n')} disabled={ed} onChange={(e) => mudar('itens', e.target.value.split('\n'))} /></Campo>
      </div>
      <Bloco className="topo-sec" titulo={<><Icone n="tubo" /> Composição química (%) · {cf.liga?.norma}</>} extra={<span className="mut peq">vem da ficha do forno {cf.ficha?.numero ?? ''}</span>}>
        {!cf.ficha ? <Vazio>Escolha a corrida.</Vazio> : (
          <div className="quimica">{cf.quimica.map((q) => <div key={q.elemento} className={q.valor === undefined ? '' : q.ok ? 'ok' : 'fora'}><b>{q.elemento}</b><small>{textoFaixa(q.faixa)}</small><span className="mono val">{q.valor !== undefined ? n2(q.valor) : '—'}</span></div>)}</div>
        )}
      </Bloco>
      <div className="g2 topo-sec">
        <Bloco titulo={<><Icone n="balanca" /> Propriedades mecânicas</>}>
          <table className="tab tab-mini">
            <thead><tr><th>Propriedade</th><th className="dir">Especificada</th><th className="dir">Encontrada</th><th /></tr></thead>
            <tbody>{MECANICA.filter((m) => cf.liga?.mecanica[m.chave] || r.mecanica[m.chave] !== undefined).map((m) => {
              const x = cf.mecanica.find((y) => y.chave === m.chave);
              return (
                <tr key={m.chave}><td>{m.nome} <small className="mut">{m.unidade}</small></td><td className="dir mono">{textoFaixa(cf.liga?.mecanica[m.chave], 0)}</td>
                  <td className="dir">{ed ? <span className="mono">{r.mecanica[m.chave]?.toLocaleString('pt-BR') ?? '—'}</span> : <CampoNum valor={r.mecanica[m.chave]} mudar={(v) => mudar('mecanica', { ...r.mecanica, [m.chave]: v } as Mecanica)} />}</td>
                  <td>{x?.valor !== undefined && (x.ok ? <Tag cls="t-ok">ok</Tag> : <Tag cls="t-no">fora</Tag>)}</td></tr>
              );
            })}</tbody>
          </table>
        </Bloco>
        <Bloco titulo={<><Icone n="termometro" /> Tratamento térmico e metalografia</>}>
          <div className="form-grade c2 pad">
            <label className="chk-linha c2"><input type="checkbox" checked={!!tt} disabled={ed} onChange={(e) => mudar('tratamento', e.target.checked ? { data: r.data, empresa: '', tipo: '', certificado: '' } : undefined)} /><span>Peças com tratamento térmico</span></label>
            {tt && <>
              <Campo rot="Data"><input type="date" value={tt.data} disabled={ed} onChange={(e) => mudar('tratamento', { ...tt, data: e.target.value })} /></Campo>
              <Campo rot="Nº do certificado"><input value={tt.certificado} disabled={ed} onChange={(e) => mudar('tratamento', { ...tt, certificado: e.target.value })} /></Campo>
              <Campo rot="Empresa"><input value={tt.empresa} disabled={ed} onChange={(e) => mudar('tratamento', { ...tt, empresa: e.target.value })} /></Campo>
              <Campo rot="Tipo"><input value={tt.tipo} disabled={ed} onChange={(e) => mudar('tratamento', { ...tt, tipo: e.target.value })} /></Campo>
            </>}
            <Campo rot="Metalografia (descritivo)" c={2}><textarea rows={2} value={r.metalografia} disabled={ed} onChange={(e) => mudar('metalografia', e.target.value)} /></Campo>
          </div>
        </Bloco>
      </div>
      {imprimir && <Imprimir aoTerminar={() => setImprimir(false)}><DocCertificado c={r} base={base} /></Imprimir>}
    </Registro>
  );
}
