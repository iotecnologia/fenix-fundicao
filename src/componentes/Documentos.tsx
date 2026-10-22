// Os documentos impressos — substituem as ~1.100 abas copiadas da planilha (ORÇAMENTO (n), OP (n), FF (n), RNC (n), CQ (n)).
// Cada documento é gerado do registro; não existe mais limite de 100/200 por mês.
import type { BaseFenix, Certificado, FichaForno, Orcamento, OrdemProducao, Rnc } from '../tipos/modelos';
import { Assinaturas, Documento, Pares, Secao } from './Folha';
import { br } from '../util/datas';
import { kg, kgP, moeda, n1, n2, pct } from '../util/formato';
import { totaisOrcamento } from '../regras/orcamento';
import { pesosOP, progressoOP } from '../regras/producao';
import { cargaNominal, conferirQuimica, pesosFicha, rendimento, tempoCorrida, textoFaixa } from '../regras/forno';
import { conferirCertificado, pesoRnc } from '../regras/qualidade';
import { hoje } from '../util/datas';

const nomeCli = (b: BaseFenix, id: string) => b.clientes.find((c) => c.id === id);
const nomeLiga = (b: BaseFenix, id: string) => b.ligas.find((l) => l.id === id);

export function DocOrcamento({ o, base }: { o: Orcamento; base: BaseFenix }) {
  const c = nomeCli(base, o.clienteId), l = nomeLiga(base, o.ligaId);
  const t = totaisOrcamento(o);
  return (
    <Documento empresa={base.empresa} titulo="Orçamento" numero={o.numero}>
      <Pares itens={[['Orçamento nº', o.numero], ['Data', br(o.data)], ['Validade', `${o.validadeDias} dias`], ['Cliente', c?.nome], ['CNPJ', c?.cnpj], ['Contato', `${c?.contato ?? ''} · ${c?.telefone ?? ''}`]]} />
      <Secao titulo={`Material orçado: ${l?.nome ?? ''} (${l?.norma ?? ''})`}>
        <table className="doc-tab">
          <thead><tr><th>Item</th><th>Identificação</th><th className="n">Peso (kg)</th><th className="n">Quantidade</th><th className="n">Preço/kg</th><th className="n">Valor total</th></tr></thead>
          <tbody>
            {o.itens.map((i, k) => <tr key={k}><td>{String(k + 1).padStart(3, '0')}</td><td>{i.identificacao}</td><td className="n">{n1(i.pesoKg)}</td><td className="n">{i.quantidade}</td><td className="n">{moeda(o.precoKg)}</td><td className="n">{moeda(o.precoKg * i.pesoKg * i.quantidade)}</td></tr>)}
            <tr className="doc-total"><td colSpan={2}>Total</td><td className="n">{n1(t.pesoTotal)} kg</td><td className="n">{t.pecas} pç</td><td /><td className="n">{moeda(t.valor)}</td></tr>
          </tbody>
        </table>
      </Secao>
      <Pares col={2} itens={[['Forma de pagamento', o.formaPagamento], ['Prazo de entrega', o.prazoEntrega]]} />
      {o.observacao && <Secao titulo="Observação"><p>{o.observacao}</p></Secao>}
      <p className="doc-nota">Preço por kg de peça limpa (peso líquido). Impostos inclusos conforme legislação vigente.</p>
    </Documento>
  );
}

export function DocOP({ op, base }: { op: OrdemProducao; base: BaseFenix }) {
  const c = nomeCli(base, op.clienteId), l = nomeLiga(base, op.ligaId);
  const p = pesosOP(op), pr = progressoOP(op, base, hoje());
  const corridas = base.fichas.filter((f) => f.pecas.some((x) => x.opId === op.id));
  return (
    <Documento empresa={base.empresa} titulo="Ordem de Produção" numero={op.numero}>
      <Pares itens={[['Data de entrada', br(op.data)], ['Número da O.P', op.numero], ['Cliente', c?.nome], ['Desenho / modelo', op.desenho], ['Material', `${l?.nome} · ${l?.norma}`], ['Quantidade', `${op.quantidade} pç`],
        ['Peso líquido peça', kgP(op.pesoLiquidoKg)], ['Peso bruto peça', kgP(op.pesoBrutoKg)], ['Data prevista', br(op.dataPrevista)], ['Data efetiva', op.dataEfetiva ? br(op.dataEfetiva) : ''], ['Peso líquido total', kg(p.liqTotal)], ['Peso bruto total', kg(p.brutoTotal)]]} />
      <Secao titulo="Peças fundidas (das fichas do forno)">
        {corridas.length === 0 ? <p>Nenhuma corrida apontada ainda.</p> : (
          <table className="doc-tab">
            <thead><tr><th>Ficha do forno</th><th>Data</th><th className="n">Peças</th></tr></thead>
            <tbody>{corridas.map((f) => <tr key={f.id}><td>{f.numero}</td><td>{br(f.data)}</td><td className="n">{f.pecas.filter((x) => x.opId === op.id).reduce((t, x) => t + x.pecas, 0)}</td></tr>)}
              <tr className="doc-total"><td colSpan={2}>Fundidas · boas · faltam</td><td className="n">{pr.fundidas} · {pr.boas} · {pr.faltam}</td></tr></tbody>
          </table>
        )}
      </Secao>
      <Secao titulo="Refugo da O.P">
        <table className="doc-tab">
          <thead><tr><th>Data</th><th className="n">Quantidade</th><th className="n">Líquido perdido</th><th className="n">Bruto perdido</th><th>Causa</th></tr></thead>
          <tbody>
            {op.refugos.length === 0 && <tr><td colSpan={5}>Sem refugo.</td></tr>}
            {op.refugos.map((r, k) => <tr key={k}><td>{br(r.data)}</td><td className="n">{r.quantidade}</td><td className="n">{kgP(r.quantidade * op.pesoLiquidoKg)}</td><td className="n">{kgP(r.quantidade * op.pesoBrutoKg)}</td><td>{r.causa}</td></tr>)}
          </tbody>
        </table>
        <Pares col={4} itens={[['Líquido refugado', kg(p.liqRefugado)], ['Bruto refugado', kg(p.brutoRefugado)], ['Líquido refugado %', pct(p.pctLiqRefugado)], ['Bruto refugado %', pct(p.pctBrutoRefugado)]]} />
      </Secao>
      <Assinaturas nomes={[['', 'PCP'], ['', 'Encarregado de produção']]} />
    </Documento>
  );
}

export function DocFicha({ f, base }: { f: FichaForno; base: BaseFenix }) {
  const l = nomeLiga(base, f.ligaId)!, forno = base.fornos.find((x) => x.id === f.fornoId);
  const p = pesosFicha(f, base), nom = cargaNominal(f, base);
  const conf = conferirQuimica(f.quimica, l);
  const ins = (id: string) => base.insumos.find((i) => i.id === id);
  const tempo = tempoCorrida(f);
  return (
    <Documento empresa={base.empresa} titulo="Apontamento de Corrida · Ficha do Forno" numero={f.numero}>
      <Pares col={4} itens={[['Data', br(f.data)], ['Corrida', f.numero], ['Posição do dia', `${f.posicao}ª corrida`], ['Forno', forno?.nome], ['Liga', l.nome], ['Refratário', `${f.usoRefratario}º uso`], ['Carga nominal', kg(nom)], ['Carga efetiva', kg(p.bruto)]]} />
      <Secao titulo={`Composição química (%) · especificada ${l.norma} × encontrada`}>
        <table className="doc-tab">
          <thead><tr><th>Elemento</th>{conf.map((c) => <th key={c.elemento} className="n">{c.elemento}</th>)}</tr></thead>
          <tbody>
            <tr><td>Especificada</td>{conf.map((c) => <td key={c.elemento} className="n">{textoFaixa(c.faixa)}</td>)}</tr>
            <tr><td>Encontrada</td>{conf.map((c) => <td key={c.elemento} className="n">{c.valor !== undefined ? n2(c.valor) : '—'}{c.ok ? '' : ' (fora)'}</td>)}</tr>
          </tbody>
        </table>
      </Secao>
      <Secao titulo="Insumos da carga (kg)">
        <table className="doc-tab">
          <thead><tr><th>Insumo</th><th className="n">Carga</th><th className="n">Correção</th><th className="n">Total</th></tr></thead>
          <tbody>
            <tr><td>Retorno (canais e massalotes)</td><td className="n">{n1(f.retornoKg)}</td><td className="n">—</td><td className="n">{n1(f.retornoKg)}</td></tr>
            {f.carga.map((c) => <tr key={c.insumoId}><td>{ins(c.insumoId)?.nome}</td><td className="n">{n1(c.carga)}</td><td className="n">{c.correcao ? n1(c.correcao) : '—'}</td><td className="n">{n1(c.carga + c.correcao)}</td></tr>)}
          </tbody>
        </table>
      </Secao>
      <Pares col={4} itens={[['Início', f.horaInicio], ['Final', f.horaFim], ['Tempo total', tempo ? `${Math.floor(tempo / 60)}h${String(tempo % 60).padStart(2, '0')}` : ''], ['Temperatura', `${f.temperatura} °C (${textoFaixa(l.temperatura, 0)})`]]} />
      <Secao titulo="Apontamento de peças fundidas">
        <table className="doc-tab">
          <thead><tr><th>O.P</th><th>Cliente</th><th>Desenho / modelo</th><th className="n">Bruto (kg)</th><th className="n">Limpa (kg)</th><th className="n">Peças</th></tr></thead>
          <tbody>{f.pecas.map((x) => { const op = base.ops.find((o) => o.id === x.opId); return <tr key={x.opId}><td>{op?.numero}</td><td>{nomeCli(base, op?.clienteId ?? '')?.nome}</td><td>{op?.desenho}</td><td className="n">{n1(op?.pesoBrutoKg ?? 0)}</td><td className="n">{n1(op?.pesoLiquidoKg ?? 0)}</td><td className="n">{x.pecas}</td></tr>; })}</tbody>
        </table>
      </Secao>
      <Pares col={4} itens={[['Peso bruto da carga', kg(p.bruto)], ['Peso líquido da carga', kg(p.liquido)], ['Rendimento', pct(rendimento(p.liquido, p.bruto))], ['Visto', f.visto]]} />
    </Documento>
  );
}

export function DocRnc({ r, base }: { r: Rnc; base: BaseFenix }) {
  const op = base.ops.find((o) => o.id === r.opId);
  return (
    <Documento empresa={base.empresa} titulo="Relatório de Não Conformidade" numero={r.numero}>
      <Pares itens={[['Data de entrada', br(r.data)], ['Número da RNC', r.numero], ['O.P', op?.numero ?? ''], ['Cliente', nomeCli(base, r.clienteId)?.nome], ['Desenho', r.desenho], ['Liga perdida', nomeLiga(base, r.ligaId)?.nome],
        ['Peças perdidas', `${r.quantidade} pç`], ['Peso bruto unitário', kgP(r.pesoUnitKg)], ['Peso total perdido', kg(pesoRnc(r))]]} />
      <Secao titulo="Motivo da perda"><p>{r.motivo}</p></Secao>
      <Secao titulo="Ação corretiva"><p>{r.acaoCorretiva || '—'}</p></Secao>
      <Pares col={2} itens={[['Situação', r.status === 'aberta' ? 'Aberta' : 'Encerrada'], ['Emitido em', br(hoje())]]} />
      <Assinaturas nomes={[['', 'Qualidade'], ['', 'Produção']]} />
    </Documento>
  );
}

export function DocCertificado({ c, base }: { c: Certificado; base: BaseFenix }) {
  const cf = conferirCertificado(c, base);
  const cli = nomeCli(base, c.clienteId);
  return (
    <Documento empresa={base.empresa} titulo="Certificado de Qualidade" numero={c.numero}>
      <Secao titulo="Identificação do cliente">
        <Pares itens={[['Nº do certificado', c.numero], ['Nº nota fiscal', c.notaFiscal], ['Data', br(c.data)], ['Cliente', cli?.nome], ['Corrida', cf.ficha?.numero ?? ''], ['Material / norma', `${cf.liga?.nome ?? ''} · ${cf.liga?.norma ?? ''}`]]} />
        <Pares col={2} itens={c.itens.map((i, k) => [`Item ${String(k + 1).padStart(2, '0')}`, i] as [string, string])} />
      </Secao>
      <Secao titulo={`Composição química (%) conforme ${cf.liga?.norma ?? ''}`}>
        <table className="doc-tab">
          <thead><tr><th /> {cf.quimica.map((q) => <th key={q.elemento} className="n">{q.elemento}</th>)}</tr></thead>
          <tbody>
            <tr><td>Especificada</td>{cf.quimica.map((q) => <td key={q.elemento} className="n">{textoFaixa(q.faixa)}</td>)}</tr>
            <tr><td>Encontrada</td>{cf.quimica.map((q) => <td key={q.elemento} className="n">{q.valor !== undefined ? n2(q.valor) : '—'}</td>)}</tr>
          </tbody>
        </table>
      </Secao>
      <Secao titulo="Propriedades mecânicas">
        <table className="doc-tab">
          <thead><tr><th>Propriedade</th><th className="n">Especificada</th><th className="n">Encontrada</th></tr></thead>
          <tbody>{cf.mecanica.map((m) => <tr key={m.chave}><td>{m.nome} ({m.unidade})</td><td className="n">{textoFaixa(m.faixa, 0)}</td><td className="n">{m.valor?.toLocaleString('pt-BR') ?? '—'}</td></tr>)}</tbody>
        </table>
      </Secao>
      <Secao titulo="Tratamento térmico">
        {c.tratamento ? <Pares col={4} itens={[['Data', br(c.tratamento.data)], ['Empresa', c.tratamento.empresa], ['Tipo', c.tratamento.tipo], ['Nº do certificado', c.tratamento.certificado]]} /> : <p>Não se aplica.</p>}
      </Secao>
      <Secao titulo="Metalografia"><p>{c.metalografia || '—'}</p></Secao>
      <p className="doc-nota">Resultado: {cf.ok ? 'material conforme a especificação.' : 'há resultado fora da especificação — liberado sob concessão do cliente.'}</p>
      <Assinaturas nomes={[[base.empresa.responsavelTecnico.nome, `Setor de fundição · ${base.empresa.responsavelTecnico.registro} · ${br(c.data)}`]]} />
    </Documento>
  );
}

