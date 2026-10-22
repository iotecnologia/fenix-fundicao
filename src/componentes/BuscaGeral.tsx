// Busca no topo: número de O.P, orçamento, ficha, RNC, certificado, nota fiscal, cliente ou desenho.
// Enter ou clique abre a página com o registro já aberto (?abrir=id).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDados } from './Dados';
import { Icone } from './Icone';
import { useSessao } from '../acesso/Sessao';
import { podeAbrir } from '../acesso/paginas';
import { semAcento } from '../util/formato';
import { br } from '../util/datas';

interface Achado { tipo: string; pagina: string; id: string; titulo: string; sub: string }

export function BuscaGeral() {
  const { base } = useDados();
  const s = useSessao();
  const nav = useNavigate();
  const [t, setT] = useState('');
  const [aberta, setAberta] = useState(false);
  const perfil = s.usuario!.perfil;
  const q = semAcento(t);
  const cli = (id: string) => base.clientes.find((c) => c.id === id)?.nome ?? '';
  const res: Achado[] = [];
  if (q.length >= 2) {
    const tem = (...l: string[]) => l.some((x) => semAcento(x).includes(q));
    const add = (a: Achado) => { if (podeAbrir(a.pagina, perfil) && res.length < 9) res.push(a); };
    for (const o of [...base.ops].reverse()) if (tem(o.numero, o.desenho, cli(o.clienteId))) add({ tipo: 'O.P', pagina: 'ops', id: o.id, titulo: `O.P ${o.numero} · ${o.desenho}`, sub: `${cli(o.clienteId)} · ${o.quantidade} pç · entrega ${br(o.dataPrevista)}` });
    for (const o of [...base.orcamentos].reverse()) if (tem(o.numero, cli(o.clienteId))) add({ tipo: 'Orçamento', pagina: 'orcamentos', id: o.id, titulo: `Orçamento ${o.numero}`, sub: `${cli(o.clienteId)} · ${br(o.data)}` });
    for (const f of [...base.fichas].reverse()) if (tem(f.numero)) add({ tipo: 'Ficha', pagina: 'fichas', id: f.id, titulo: `Ficha do forno ${f.numero}`, sub: `${br(f.data)} · ${base.ligas.find((l) => l.id === f.ligaId)?.nome}` });
    for (const r of [...base.rncs].reverse()) if (tem(r.numero, r.desenho)) add({ tipo: 'RNC', pagina: 'rnc', id: r.id, titulo: `RNC ${r.numero}`, sub: `${cli(r.clienteId)} · ${r.motivo}` });
    for (const c of [...base.certificados].reverse()) if (tem(c.numero, c.notaFiscal)) add({ tipo: 'CQ', pagina: 'certificados', id: c.id, titulo: `Certificado ${c.numero}`, sub: `${cli(c.clienteId)} · NF ${c.notaFiscal}` });
    for (const n of [...base.faturamento].reverse()) if (tem(n.notaFiscal)) add({ tipo: 'NF', pagina: 'faturamento', id: n.id, titulo: `Nota fiscal ${n.notaFiscal}`, sub: `${cli(n.clienteId)} · ${br(n.data)}` });
    for (const c of base.clientes) if (tem(c.nome, c.cnpj)) add({ tipo: 'Cliente', pagina: 'clientes', id: c.id, titulo: c.nome, sub: `${c.cidade} · ${c.segmento}` });
  }
  const abrir = (a: Achado) => { setT(''); setAberta(false); nav(`/${a.pagina}?abrir=${a.id}`); };
  return (
    <div className="busca-geral">
      <Icone n="busca" />
      <input
        type="text" value={t} placeholder="Buscar O.P, orçamento, ficha, RNC, nota, cliente ou desenho…" aria-label="Busca geral"
        onChange={(e) => { setT(e.target.value); setAberta(true); }} onFocus={() => setAberta(true)} onBlur={() => setTimeout(() => setAberta(false), 150)}
        onKeyDown={(e) => { if (e.key === 'Enter' && res[0]) abrir(res[0]); if (e.key === 'Escape') { setT(''); (e.target as HTMLInputElement).blur(); } }}
      />
      {aberta && q.length >= 2 && (
        <div className="busca-res">
          {res.length ? res.map((a) => (
            <button type="button" key={a.pagina + a.id} onMouseDown={(e) => { e.preventDefault(); abrir(a); }}>
              <b><span className="busca-tipo">{a.tipo}</span>{a.titulo}</b><small>{a.sub}</small>
            </button>
          )) : <div className="vazio">Nada encontrado.</div>}
        </div>
      )}
    </div>
  );
}
