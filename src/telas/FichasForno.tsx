// Fichas do Forno (apontamento de corrida) — substitui "GERAÇÃO F.F" + as 200 abas "FF (n)".
// Novo: a química é conferida na hora contra a liga; as peças são apontadas por O.P; ao salvar,
// os insumos da carga saem do estoque sozinhos (antes era somado por fórmula em outra aba).
import { useState } from 'react';
import type { Elemento, FichaForno, ItemCarga } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, Campo, CampoNum, Contador, OrigemPlanilha, Registro, Segmentado, SeletorMes, Tag, TituloPagina, Vazio, useEdita, useRascunho } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { Imprimir } from '../componentes/Folha';
import { DocFicha } from '../componentes/Documentos';
import { useAbrir } from '../componentes/useAbrir';
import { cargaNominal, cargaSugerida, conferirQuimica, dentro, pesosFicha, rendimento, situacaoFicha, tempoCorrida, textoFaixa } from '../regras/forno';
import { opsParaCorrida, progressoOP } from '../regras/producao';
import { mesDe, noMes, proximoNumero } from '../regras/periodo';
import { Barras } from '../componentes/Graficos';
import { br, brCurto, hoje, hhmm, min } from '../util/datas';
import { kg, moeda, n0, n1, pct, soma } from '../util/formato';

type Filtro = 'todas' | 'fora';

export function FichasForno() {
  const { base } = useDados();
  const hj = hoje();
  const edita = useEdita('fichas');
  const [abrir, setAbrir] = useAbrir();
  const [mes, setMes] = useState(mesDe(hj));
  const [f, setF] = useState<Filtro>('todas');
  const liga = (id: string) => base.ligas.find((l) => l.id === id)?.nome ?? '';
  const forno = (id: string) => base.fornos.find((x) => x.id === id)?.nome.split('·')[0].trim() ?? '';
  const doMes = base.fichas.filter((x) => noMes(x.data, mes)).map((ff) => ({ ff, p: pesosFicha(ff, base), nom: cargaNominal(ff, base), s: situacaoFicha(ff, base) })).reverse();
  const fora = doMes.filter((x) => !x.s.quimicaOk || !x.s.temperaturaOk);
  const vis = f === 'fora' ? fora : doMes;
  const bruto = soma(doMes, (x) => x.p.bruto), liq = soma(doMes, (x) => x.p.liquido);
  const porDia = new Map<string, number>();
  for (const x of doMes) porDia.set(x.ff.data, (porDia.get(x.ff.data) ?? 0) + x.p.liquido);
  const sel = abrir === 'novo' ? null : base.fichas.find((x) => x.id === abrir);

  return (
    <>
      <TituloPagina titulo="Fichas do Forno" sub={<OrigemPlanilha aba="GERAÇÃO F.F + abas FF (1…200)" />}>
        <SeletorMes mes={mes} setMes={setMes} atual={mesDe(hj)} />
        <BotaoIcone icone="mais" titulo={edita ? 'Nova corrida' : 'Seu perfil só consulta'} pri disabled={!edita} onClick={() => setAbrir('novo')} />
      </TituloPagina>
      <div className="contadores c4">
        <Contador icone="fogo" valor={doMes.length} rot="corridas no mês" />
        <Contador icone="balanca" valor={kg(bruto)} rot="metal bruto (carga efetiva)" />
        <Contador icone="peca" valor={kg(liq)} rot="metal líquido (peças limpas)" />
        <Contador icone="grafico" valor={pct(rendimento(liq, bruto))} rot="rendimento metálico" />
      </div>
      <div className="grade2">
        <div className="pilha">
          <div className="barra sem-marg">
            <Segmentado valor={f} setValor={setF} opcoes={[{ v: 'todas', nome: 'Todas', n: doMes.length }, { v: 'fora', nome: 'Fora de especificação', n: fora.length, dica: 'Química ou temperatura fora da faixa da liga' }]} />
          </div>
          <div className="bloco">
            {vis.length === 0 ? <Vazio>Nenhuma corrida.</Vazio> : (
              <table className="tab">
                <thead><tr><th>Ficha</th><th>Data</th><th>Forno</th><th>Liga</th><th className="dir">Nominal</th><th className="dir">Efetiva</th><th className="dir">Líquido</th><th className="dir">Rend.</th><th>Química</th><th>Temp.</th></tr></thead>
                <tbody>
                  {vis.map(({ ff, p, nom, s }) => (
                    <tr key={ff.id} className="clic" onClick={() => setAbrir(ff.id)}>
                      <td className="mono">{ff.numero}</td><td className="mono">{brCurto(ff.data)} <span className="mut">{ff.posicao}ª</span></td><td className="mut">{forno(ff.fornoId)}</td><td>{liga(ff.ligaId)}</td>
                      <td className="dir mono">{n0(nom)}</td><td className="dir mono">{n0(p.bruto)}</td><td className="dir mono">{n0(p.liquido)}</td><td className="dir mono">{pct(rendimento(p.liquido, p.bruto), 0)}</td>
                      <td>{s.quimicaOk ? <Tag cls="t-ok">conforme</Tag> : <Tag cls="t-no" titulo="Elementos fora da faixa">{s.foraQuimica.join(', ')}</Tag>}</td>
                      <td>{s.temperaturaOk ? <span className="mono">{ff.temperatura}°</span> : <Tag cls="t-at">{ff.temperatura}°</Tag>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="pilha">
          <Bloco titulo={<><Icone n="peca" /> Metal líquido por dia (kg)</>}>
            <div className="pad"><Barras fmt={(v) => n0(v)} dados={[...porDia.entries()].reverse().slice(-12).map(([d, v]) => ({ rotulo: brCurto(d).slice(0, 2), valor: Math.round(v), nota: br(d) }))} /></div>
          </Bloco>
          <Bloco titulo={<><Icone n="tubo" /> Por liga no mês</>}>
            <ul className="lista-cat">
              {base.ligas.map((l) => ({ l, n: doMes.filter((x) => x.ff.ligaId === l.id) })).filter((x) => x.n.length).map((x) => (
                <li key={x.l.id}><span>{x.l.nome} <small className="mut">{x.n.length} corridas</small></span><b className="mono">{kg(soma(x.n, (y) => y.p.liquido))}</b></li>
              ))}
            </ul>
          </Bloco>
        </div>
      </div>
      {(sel || abrir === 'novo') && <RegistroFicha ficha={sel ?? undefined} fechar={() => setAbrir(null)} />}
    </>
  );
}

function RegistroFicha({ ficha, fechar }: { ficha?: FichaForno; fechar: () => void }) {
  const { base, acoes } = useDados();
  const hj = hoje();
  const edita = useEdita('fichas');
  const novo = !ficha;
  const inicial = (): FichaForno => {
    if (ficha) return ficha;
    const fila = base.ops.filter((o) => !o.dataEfetiva).sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
    const lg = base.ligas.find((l) => l.id === fila[0]?.ligaId) ?? base.ligas[1];
    const forno = base.fornos[base.fornos.length - 1];
    const ultima = [...base.fichas].reverse().find((x) => x.fornoId === forno.id);
    const sug = cargaSugerida(lg, Math.round(forno.capacidadeKg * 0.92));
    return {
      id: acoes.novoId('ff'), numero: proximoNumero(base.fichas, hj), data: hj, ligaId: lg.id, fornoId: forno.id,
      posicao: base.fichas.filter((x) => x.data === hj).length + 1, usoRefratario: (ultima?.usoRefratario ?? 0) + 1,
      ...sug, quimica: {}, horaInicio: hhmm(Math.max(7 * 60, min(new Date().toTimeString().slice(0, 5)) - 90)), horaFim: '', temperatura: 0, pecas: [], visto: '',
    };
  };
  const { r, setR, mudar, editando, setEditando, erro, setErro, descartar } = useRascunho(inicial(), novo);
  const [imprimir, setImprimir] = useState(false);
  const lg = base.ligas.find((l) => l.id === r.ligaId)!;
  const forno = base.fornos.find((x) => x.id === r.fornoId)!;
  const nom = cargaNominal(r, base), p = pesosFicha(r, base);
  const conf = conferirQuimica(r.quimica, lg);
  const ed = !editando;
  const ins = (id: string) => base.insumos.find((i) => i.id === id);
  const insCarga = base.insumos.filter((i) => i.carga);
  const custoCarga = soma(r.carga, (c) => (c.carga + c.correcao) * (ins(c.insumoId)?.preco ?? 0));
  const tempo = tempoCorrida(r);
  const opsDisp = opsParaCorrida(base, r.ligaId).filter((o) => !r.pecas.some((x) => x.opId === o.id) && progressoOP(o, base, hj).faltam > 0);
  const mudaCarga = (i: number, v: Partial<ItemCarga>) => setR({ ...r, carga: r.carga.map((x, k) => (k === i ? { ...x, ...v } : x)) });
  const salvar = () => {
    if (!r.pecas.length) return setErro('Aponte as peças fundidas (pelo menos uma O.P).');
    if (p.bruto > nom) return setErro(`O peso bruto das peças (${kg(p.bruto)}) passa da carga nominal (${kg(nom)}). Confira a carga ou as peças.`);
    if (nom > forno.capacidadeKg * 1.05) return setErro(`A carga nominal (${kg(nom)}) passa da capacidade do ${forno.nome}.`);
    if (!r.temperatura) return setErro('Informe a temperatura encontrada.');
    acoes.gravarFicha(r);
    setErro(''); setEditando(false);
    if (novo) fechar();
  };
  return (
    <Registro
      titulo={novo ? 'Nova corrida · ficha do forno' : <>Ficha do forno <span className="mono">{r.numero}</span></>} novo={novo} edita={edita} editando={editando} setEditando={setEditando}
      salvar={salvar} descartar={novo ? fechar : descartar} fechar={fechar} erro={erro} imprimir={novo ? undefined : () => setImprimir(true)}
      cabecalho={<>{conf.every((c) => c.ok) ? <Tag cls="t-ok">química conforme</Tag> : <Tag cls="t-no">química fora: {conf.filter((c) => !c.ok).map((c) => c.elemento).join(', ')}</Tag>}
        {r.temperatura > 0 && (dentro(r.temperatura, lg.temperatura) ? <Tag cls="t-ok">temperatura ok</Tag> : <Tag cls="t-at">temperatura fora</Tag>)}</>}
    >
      <div className="form-grade">
        <Campo rot="Corrida"><input value={r.numero} disabled /></Campo>
        <Campo rot="Data"><input type="date" value={r.data} disabled={ed} onChange={(e) => mudar('data', e.target.value)} /></Campo>
        <Campo rot="Posição do dia"><CampoNum valor={r.posicao} mudar={(v) => mudar('posicao', Math.round(v ?? 1))} disabled={ed} sufixo="ª" /></Campo>
        <Campo rot="Uso do refratário" dica="Nº de corridas no revestimento atual"><CampoNum valor={r.usoRefratario} mudar={(v) => mudar('usoRefratario', Math.round(v ?? 1))} disabled={ed} sufixo="º" /></Campo>
        <Campo rot="Forno" c={2}><select value={r.fornoId} disabled={ed} onChange={(e) => mudar('fornoId', e.target.value)}>{base.fornos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select></Campo>
        <Campo rot="Liga fundida" c={2}><select value={r.ligaId} disabled={ed || r.pecas.length > 0} onChange={(e) => mudar('ligaId', e.target.value)} title={r.pecas.length ? 'Tire as peças apontadas para trocar a liga' : ''}>{base.ligas.map((l) => <option key={l.id} value={l.id}>{l.nome} · {l.norma}</option>)}</select></Campo>
      </div>

      <Bloco className="topo-sec" titulo={<><Icone n="tubo" /> Composição química (%) · {lg.norma}</>}>
        <div className="quimica">
          {conf.map((c) => (
            <div key={c.elemento} className={c.valor === undefined ? '' : c.ok ? 'ok' : 'fora'}>
              <b>{c.elemento}</b>
              <small>{textoFaixa(c.faixa)}</small>
              <CampoNum valor={c.valor} disabled={ed} casas={3} mudar={(v) => setR({ ...r, quimica: { ...r.quimica, [c.elemento]: v } as Partial<Record<Elemento, number>> })} placeholder="—" />
            </div>
          ))}
        </div>
      </Bloco>

      <div className="g2 topo-sec">
        <Bloco titulo={<><Icone n="caixa" /> Insumos da carga (kg)</>} extra={editando && <button type="button" className="btn2 peq" title="Preenche a carga padrão da liga para a capacidade do forno" onClick={() => setR({ ...r, ...cargaSugerida(lg, Math.round(forno.capacidadeKg * 0.92)) })}><Icone n="limpar" /> Sugerir pela liga</button>}>
          <table className="tab tab-mini">
            <thead><tr><th>Insumo</th><th className="dir">Carga</th><th className="dir">Correção</th>{editando && <th />}</tr></thead>
            <tbody>
              <tr><td>Retorno <small className="mut">(canais e massalotes)</small></td><td className="dir">{ed ? <span className="mono">{n1(r.retornoKg)}</span> : <CampoNum valor={r.retornoKg} mudar={(v) => mudar('retornoKg', v ?? 0)} />}</td><td className="dir mut">—</td>{editando && <td />}</tr>
              {r.carga.map((c, i) => (
                <tr key={c.insumoId + i}>
                  <td>{editando ? <select value={c.insumoId} onChange={(e) => mudaCarga(i, { insumoId: e.target.value })}>{insCarga.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select> : <>{ins(c.insumoId)?.nome}{ins(c.insumoId)?.carga === 'auxiliar' && <small className="mut"> (não soma na carga)</small>}</>}</td>
                  <td className="dir">{ed ? <span className="mono">{n1(c.carga)}</span> : <CampoNum valor={c.carga} mudar={(v) => mudaCarga(i, { carga: v ?? 0 })} />}</td>
                  <td className="dir">{ed ? <span className="mono">{c.correcao ? n1(c.correcao) : '—'}</span> : <CampoNum valor={c.correcao} mudar={(v) => mudaCarga(i, { correcao: v ?? 0 })} />}</td>
                  {editando && <td><BotaoIcone icone="x" titulo="Tirar insumo" cls="peq" onClick={() => setR({ ...r, carga: r.carga.filter((_, k) => k !== i) })} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
          {editando && <button type="button" className="ver-mais" onClick={() => setR({ ...r, carga: [...r.carga, { insumoId: insCarga[0].id, carga: 0, correcao: 0 }] })}>+ insumo na carga</button>}
          <div className="rodape-bloco"><span>Carga nominal <b className="mono">{kg(nom)}</b></span><span>Custo dos insumos <b className="mono">{moeda(custoCarga)}</b></span></div>
        </Bloco>
        <div className="pilha">
          <Bloco titulo={<><Icone n="termometro" /> Gerenciamento da carga</>}>
            <div className="form-grade c3 pad">
              <Campo rot="Início"><input type="time" value={r.horaInicio} disabled={ed} onChange={(e) => mudar('horaInicio', e.target.value)} /></Campo>
              <Campo rot="Final"><input type="time" value={r.horaFim} disabled={ed} onChange={(e) => mudar('horaFim', e.target.value)} /></Campo>
              <Campo rot="Tempo total"><input value={tempo > 0 ? `${Math.floor(tempo / 60)}h${String(tempo % 60).padStart(2, '0')}` : ''} disabled /></Campo>
              <Campo rot={`Temperatura (${textoFaixa(lg.temperatura, 0)} °C)`} c={2}><CampoNum valor={r.temperatura || undefined} mudar={(v) => mudar('temperatura', Math.round(v ?? 0))} disabled={ed} sufixo="°C" /></Campo>
              <Campo rot="Visto"><input value={r.visto} disabled={ed} onChange={(e) => mudar('visto', e.target.value)} /></Campo>
            </div>
          </Bloco>
          <Bloco titulo={<><Icone n="balanca" /> Resumo da carga</>}>
            <div className="resumo-linha dentro">
              <div><span>Peso bruto</span><b>{kg(p.bruto)}</b></div>
              <div><span>Peso líquido</span><b>{kg(p.liquido)}</b></div>
              <div><span>Rendimento</span><b>{pct(rendimento(p.liquido, p.bruto))}</b></div>
            </div>
          </Bloco>
        </div>
      </div>

      <Bloco className="topo-sec" titulo={<><Icone n="peca" /> Apontamento de peças fundidas</>}
        extra={editando && opsDisp.length > 0 && (
          <select className="sel-add" value="" onChange={(e) => { if (e.target.value) { const o = base.ops.find((x) => x.id === e.target.value)!; setR({ ...r, pecas: [...r.pecas, { opId: o.id, pecas: Math.min(progressoOP(o, base, hj).faltam, Math.max(1, Math.floor((nom * 0.93 - p.bruto) / o.pesoBrutoKg))) }] }); } }}>
            <option value="">+ peças de uma O.P ({lg.nome})…</option>
            {opsDisp.map((o) => <option key={o.id} value={o.id}>{o.numero} · {o.desenho} · faltam {progressoOP(o, base, hj).faltam} pç</option>)}
          </select>
        )}>
        {r.pecas.length === 0 ? <Vazio>Nenhuma peça apontada.</Vazio> : (
          <table className="tab tab-mini">
            <thead><tr><th>O.P</th><th>Cliente</th><th>Desenho</th><th className="dir">Bruto (kg)</th><th className="dir">Limpa (kg)</th><th className="dir">Peças</th><th className="dir">Bruto total</th>{editando && <th />}</tr></thead>
            <tbody>{r.pecas.map((x, i) => {
              const o = base.ops.find((y) => y.id === x.opId);
              return (
                <tr key={x.opId}>
                  <td className="mono">{o?.numero}</td><td>{base.clientes.find((c) => c.id === o?.clienteId)?.nome}</td><td>{o?.desenho}</td>
                  <td className="dir mono">{n1(o?.pesoBrutoKg ?? 0)}</td><td className="dir mono">{n1(o?.pesoLiquidoKg ?? 0)}</td>
                  <td className="dir">{ed ? <span className="mono">{x.pecas}</span> : <CampoNum valor={x.pecas} mudar={(v) => setR({ ...r, pecas: r.pecas.map((y, k) => (k === i ? { ...y, pecas: Math.round(v ?? 0) } : y)) })} />}</td>
                  <td className="dir mono">{n0(x.pecas * (o?.pesoBrutoKg ?? 0))}</td>
                  {editando && <td><BotaoIcone icone="x" titulo="Tirar" cls="peq" onClick={() => setR({ ...r, pecas: r.pecas.filter((_, k) => k !== i) })} /></td>}
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </Bloco>
      {editando && <p className="nota"><Icone n="info" /> Ao salvar, os insumos da carga saem do estoque (retirada com origem “FF {r.numero}”) e as peças contam no progresso das O.P.</p>}
      {imprimir && <Imprimir aoTerminar={() => setImprimir(false)}><DocFicha f={r} base={base} /></Imprimir>}
    </Registro>
  );
}
