// Ligas, normas e fornos — cadastro novo. Na planilha a especificação química e mecânica era digitada
// de novo em cada Ficha do Forno e em cada Certificado; agora fica na liga e as telas conferem sozinhas.
import { useState } from 'react';
import type { Elemento, Faixa, Forno, Liga } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, Campo, CampoNum, OrigemPlanilha, Registro, TituloPagina, useEdita, useRascunho } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { useAbrir } from '../componentes/useAbrir';
import { ELEMENTOS, textoFaixa } from '../regras/forno';
import { MECANICA } from '../regras/qualidade';
import { moeda, n0 } from '../util/formato';

const TIPOS: Record<Liga['tipo'], string> = { cinzento: 'Ferro fundido cinzento', nodular: 'Ferro fundido nodular', branco: 'Ferro fundido branco' };

export function LigasFornos() {
  const { base } = useDados();
  const edita = useEdita('ligas');
  const [abrir, setAbrir] = useAbrir();
  const [forno, setForno] = useState<Forno | 'novo' | null>(null);
  const sel = abrir === 'novo' ? null : base.ligas.find((l) => l.id === abrir);
  return (
    <>
      <TituloPagina titulo="Ligas e Fornos" sub={<OrigemPlanilha aba="— (antes digitado em cada FF e CQ)" />}>
        <BotaoIcone icone="mais" titulo={edita ? 'Nova liga' : 'Seu perfil só consulta'} pri disabled={!edita} onClick={() => setAbrir('novo')} />
      </TituloPagina>
      <div className="pilha">
        <Bloco titulo={<><Icone n="tubo" /> Ligas e normas</>}>
          <table className="tab">
            <thead><tr><th>Liga</th><th>Norma</th><th>Tipo</th><th>C (%)</th><th>Si (%)</th><th>Dureza (HB)</th><th>Vazamento (°C)</th><th className="dir">Preço base</th></tr></thead>
            <tbody>{base.ligas.map((l) => (
              <tr key={l.id} className="clic" onClick={() => setAbrir(l.id)}>
                <td>{l.nome}</td><td className="mut">{l.norma}</td><td className="mut">{TIPOS[l.tipo]}</td>
                <td className="mono">{textoFaixa(l.quimica.C)}</td><td className="mono">{textoFaixa(l.quimica.Si)}</td><td className="mono">{textoFaixa(l.mecanica.dureza, 0)}</td><td className="mono">{textoFaixa(l.temperatura, 0)}</td>
                <td className="dir mono">{moeda(l.precoBaseKg)}/kg</td>
              </tr>))}</tbody>
          </table>
        </Bloco>
        <Bloco titulo={<><Icone n="fogo" /> Fornos</>} extra={<BotaoIcone icone="mais" titulo="Novo forno" cls="peq" disabled={!edita} onClick={() => setForno('novo')} />}>
          <table className="tab">
            <thead><tr><th>Forno</th><th>Tipo</th><th className="dir">Capacidade</th><th className="dir">Corridas registradas</th></tr></thead>
            <tbody>{base.fornos.map((f) => (
              <tr key={f.id} className="clic" onClick={() => setForno(f)}><td>{f.nome}</td><td className="mut">{f.tipo}</td><td className="dir mono">{n0(f.capacidadeKg)} kg</td><td className="dir mono">{base.fichas.filter((x) => x.fornoId === f.id).length}</td></tr>
            ))}</tbody>
          </table>
        </Bloco>
      </div>
      {(sel || abrir === 'novo') && <RegistroLiga liga={sel ?? undefined} fechar={() => setAbrir(null)} />}
      {forno && <RegistroForno forno={forno === 'novo' ? undefined : forno} fechar={() => setForno(null)} />}
    </>
  );
}

function LinhaFaixa({ rot, fx, mudar, ed, casas }: { rot: string; fx?: Faixa; mudar: (f?: Faixa) => void; ed: boolean; casas?: number }) {
  const set = (k: 'min' | 'max', v?: number) => { const n = { ...fx, [k]: v }; mudar(n.min === undefined && n.max === undefined ? undefined : n); };
  return (
    <tr><td>{rot}</td>
      <td className="dir">{ed ? <span className="mono">{fx?.min?.toLocaleString('pt-BR') ?? '—'}</span> : <CampoNum valor={fx?.min} mudar={(v) => set('min', v)} casas={casas} />}</td>
      <td className="dir">{ed ? <span className="mono">{fx?.max?.toLocaleString('pt-BR') ?? '—'}</span> : <CampoNum valor={fx?.max} mudar={(v) => set('max', v)} casas={casas} />}</td></tr>
  );
}

function RegistroLiga({ liga, fechar }: { liga?: Liga; fechar: () => void }) {
  const { acoes } = useDados();
  const edita = useEdita('ligas');
  const novo = !liga;
  const inicial: Liga = liga ?? { id: acoes.novoId('lg'), nome: '', norma: '', tipo: 'cinzento', quimica: {}, mecanica: {}, temperatura: {}, precoBaseKg: 0 };
  const { r, setR, mudar, editando, setEditando, erro, setErro, descartar } = useRascunho(inicial, novo);
  const ed = !editando;
  const salvar = () => { if (!r.nome.trim()) return setErro('Informe o nome da liga.'); acoes.salvar('ligas', r); setErro(''); setEditando(false); if (novo) fechar(); };
  return (
    <Registro titulo={novo ? 'Nova liga' : r.nome} novo={novo} edita={edita} editando={editando} setEditando={setEditando} salvar={salvar} descartar={novo ? fechar : descartar} fechar={fechar} erro={erro}>
      <div className="form-grade">
        <Campo rot="Liga" c={2}><input value={r.nome} disabled={ed} onChange={(e) => mudar('nome', e.target.value)} /></Campo>
        <Campo rot="Norma"><input value={r.norma} disabled={ed} onChange={(e) => mudar('norma', e.target.value)} /></Campo>
        <Campo rot="Tipo"><select value={r.tipo} disabled={ed} onChange={(e) => mudar('tipo', e.target.value as Liga['tipo'])}>{Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Campo>
        <Campo rot="Preço base de venda"><CampoNum valor={r.precoBaseKg} mudar={(v) => mudar('precoBaseKg', v ?? 0)} disabled={ed} casas={2} sufixo="R$/kg" /></Campo>
      </div>
      <div className="g2 topo-sec">
        <Bloco titulo={<><Icone n="tubo" /> Composição química especificada (%)</>}>
          <table className="tab tab-mini"><thead><tr><th>Elemento</th><th className="dir">Mín.</th><th className="dir">Máx.</th></tr></thead>
            <tbody>{ELEMENTOS.map((e) => <LinhaFaixa key={e} rot={e} fx={r.quimica[e]} ed={ed} casas={3} mudar={(f) => setR({ ...r, quimica: { ...r.quimica, [e]: f } as Partial<Record<Elemento, Faixa>> })} />)}</tbody></table>
        </Bloco>
        <div className="pilha">
          <Bloco titulo={<><Icone n="balanca" /> Propriedades mecânicas</>}>
            <table className="tab tab-mini"><thead><tr><th>Propriedade</th><th className="dir">Mín.</th><th className="dir">Máx.</th></tr></thead>
              <tbody>{MECANICA.map((m) => <LinhaFaixa key={m.chave} rot={`${m.nome} (${m.unidade})`} fx={r.mecanica[m.chave]} ed={ed} mudar={(f) => setR({ ...r, mecanica: { ...r.mecanica, [m.chave]: f } })} />)}</tbody></table>
          </Bloco>
          <Bloco titulo={<><Icone n="termometro" /> Temperatura de vazamento (°C)</>}>
            <table className="tab tab-mini"><tbody><LinhaFaixa rot="Faixa" fx={r.temperatura} ed={ed} mudar={(f) => mudar('temperatura', f ?? {})} /></tbody></table>
          </Bloco>
        </div>
      </div>
    </Registro>
  );
}

function RegistroForno({ forno, fechar }: { forno?: Forno; fechar: () => void }) {
  const { acoes } = useDados();
  const edita = useEdita('ligas');
  const novo = !forno;
  const { r, mudar, editando, setEditando, erro, setErro, descartar } = useRascunho<Forno>(forno ?? { id: acoes.novoId('f'), nome: '', capacidadeKg: 500, tipo: 'Indução' }, novo);
  const ed = !editando;
  const salvar = () => { if (!r.nome.trim()) return setErro('Informe o nome do forno.'); acoes.salvar('fornos', r); setErro(''); setEditando(false); if (novo) fechar(); };
  return (
    <Registro titulo={novo ? 'Novo forno' : r.nome} novo={novo} edita={edita} editando={editando} setEditando={setEditando} salvar={salvar} descartar={novo ? fechar : descartar} fechar={fechar} erro={erro}>
      <div className="form-grade c3">
        <Campo rot="Forno"><input value={r.nome} disabled={ed} onChange={(e) => mudar('nome', e.target.value)} /></Campo>
        <Campo rot="Tipo"><input value={r.tipo} disabled={ed} onChange={(e) => mudar('tipo', e.target.value)} /></Campo>
        <Campo rot="Capacidade"><CampoNum valor={r.capacidadeKg} mudar={(v) => mudar('capacidadeKg', v ?? 0)} disabled={ed} sufixo="kg" /></Campo>
      </div>
    </Registro>
  );
}
