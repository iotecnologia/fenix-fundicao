// Folha de Pagamento — substitui a aba "FOLHA PAGAMENTO - PRÓ-LABORE".
// Total do mês = pagamento + (hora extra + encargos + outros), como na planilha [G4 = H4 + I4].
// Novo: cadastro de colaboradores; o mês novo pode ser copiado do anterior em um clique.
import { useState } from 'react';
import type { Colaborador, LancamentoFolha } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, Campo, CampoNum, Contador, OrigemPlanilha, Registro, SeletorMes, TituloPagina, Vazio, useEdita, useRascunho } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { Proporcao } from '../componentes/Graficos';
import { useAbrir } from '../componentes/useAbrir';
import { totalFolha } from '../regras/custo';
import { mesDe, nomeMesLongo, somaMes } from '../regras/periodo';
import { hoje } from '../util/datas';
import { moeda, soma } from '../util/formato';

export function FolhaPagamento() {
  const { base, acoes } = useDados();
  const hj = hoje();
  const edita = useEdita('folha');
  const [abrir, setAbrir] = useAbrir();
  const [mes, setMes] = useState(mesDe(hj));
  const doMes = base.folha.filter((f) => f.mes === mes).map((f) => ({ f, c: base.colaboradores.find((c) => c.id === f.colaboradorId)! })).filter((x) => x.c).sort((a, b) => a.c.setor.localeCompare(b.c.setor) || a.c.nome.localeCompare(b.c.nome));
  const tot = totalFolha(base, mes);
  const setores = [...new Set(doMes.map((x) => x.c.setor))].map((s) => ({ nome: s, valor: soma(doMes.filter((x) => x.c.setor === s), (x) => x.f.valor + x.f.horaExtra + x.f.encargos + x.f.outros) })).sort((a, b) => b.valor - a.valor);
  const copiarAnterior = () => {
    for (const f of base.folha.filter((x) => x.mes === somaMes(mes, -1))) acoes.salvar('folha', { ...f, id: acoes.novoId('fo'), mes, horaExtra: 0, outros: 0 });
  };
  const sel = abrir === 'novo' ? null : base.folha.find((f) => f.id === abrir);
  return (
    <>
      <TituloPagina titulo="Folha de Pagamento" sub={<OrigemPlanilha aba="FOLHA PAGAMENTO - PRÓ-LABORE" />}>
        <SeletorMes mes={mes} setMes={setMes} atual={mesDe(hj)} />
        <BotaoIcone icone="mais" titulo={edita ? 'Novo colaborador' : 'Seu perfil só consulta'} pri disabled={!edita} onClick={() => setAbrir('novo')} />
      </TituloPagina>
      <div className="contadores c4">
        <Contador icone="dinheiro" valor={moeda(tot.total)} rot="custo total do mês" />
        <Contador icone="carteira" valor={moeda(tot.pagamento)} rot="folha de pagamento" />
        <Contador icone="relogio" valor={moeda(tot.adicionais)} rot="hora extra, encargos e outros" />
        <Contador icone="usuarios" valor={doMes.length} rot="colaboradores no mês" />
      </div>
      <div className="grade2">
        <div className="bloco">
          {doMes.length === 0 ? <Vazio>Folha de {nomeMesLongo(mes)} ainda não lançada. {edita && <button type="button" className="btn2 peq" onClick={copiarAnterior}><Icone n="copiar" /> Copiar do mês anterior</button>}</Vazio> : (
            <table className="tab">
              <thead><tr><th>Colaborador</th><th>Cargo</th><th>Setor</th><th className="dir">Pagamento</th><th className="dir">Hora extra</th><th className="dir">Encargos</th><th className="dir">Outros</th><th className="dir">Total</th></tr></thead>
              <tbody>{doMes.map(({ f, c }) => (
                <tr key={f.id} className="clic" onClick={() => setAbrir(f.id)}>
                  <td>{c.nome}</td><td className="mut">{c.cargo}</td><td className="mut">{c.setor}</td>
                  <td className="dir mono">{moeda(f.valor)}</td><td className="dir mono">{f.horaExtra ? moeda(f.horaExtra) : '—'}</td><td className="dir mono">{moeda(f.encargos)}</td><td className="dir mono">{f.outros ? moeda(f.outros) : '—'}</td>
                  <td className="dir mono">{moeda(f.valor + f.horaExtra + f.encargos + f.outros)}</td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
        <Bloco titulo={<><Icone n="usuarios" /> Custo por setor</>}><div className="pad">{setores.length ? <Proporcao partes={setores.slice(0, 4).concat(setores.length > 4 ? [{ nome: 'Demais setores', valor: soma(setores.slice(4), (s) => s.valor) }] : [])} fmt={(v) => moeda(v).replace(/,\d\d$/, '')} /> : <Vazio>—</Vazio>}</div></Bloco>
      </div>
      {(sel || abrir === 'novo') && <RegistroFolha lanc={sel ?? undefined} mes={mes} fechar={() => setAbrir(null)} />}
    </>
  );
}

function RegistroFolha({ lanc, mes, fechar }: { lanc?: LancamentoFolha; mes: string; fechar: () => void }) {
  const { base, acoes } = useDados();
  const edita = useEdita('folha');
  const novo = !lanc;
  const col0: Colaborador = lanc ? base.colaboradores.find((c) => c.id === lanc.colaboradorId)! : { id: acoes.novoId('col'), nome: '', cargo: '', setor: 'Produção', salario: 0, ativo: true };
  const inicial = { col: col0, l: lanc ?? { id: acoes.novoId('fo'), mes, colaboradorId: col0.id, valor: 0, horaExtra: 0, encargos: 0, outros: 0 } };
  const { r, setR, editando, setEditando, erro, setErro, descartar } = useRascunho(inicial, novo);
  const ed = !editando;
  const mc = (v: Partial<Colaborador>) => setR({ ...r, col: { ...r.col, ...v } });
  const ml = (v: Partial<LancamentoFolha>) => setR({ ...r, l: { ...r.l, ...v } });
  const salvar = () => {
    if (!r.col.nome.trim()) return setErro('Informe o nome do colaborador.');
    if (!(r.l.valor > 0)) return setErro('Informe o valor do pagamento.');
    acoes.salvar('colaboradores', r.col); acoes.salvar('folha', r.l); setErro(''); setEditando(false); if (novo) fechar();
  };
  return (
    <Registro titulo={novo ? 'Novo colaborador' : r.col.nome} novo={novo} edita={edita} editando={editando} setEditando={setEditando} salvar={salvar} descartar={novo ? fechar : descartar} fechar={fechar} erro={erro} cabecalho={<span className="mut peq">folha de {nomeMesLongo(r.l.mes)}</span>}>
      <div className="form-grade">
        <Campo rot="Colaborador" c={2}><input value={r.col.nome} disabled={ed} onChange={(e) => mc({ nome: e.target.value })} /></Campo>
        <Campo rot="Cargo"><input value={r.col.cargo} disabled={ed} onChange={(e) => mc({ cargo: e.target.value })} /></Campo>
        <Campo rot="Setor"><input value={r.col.setor} disabled={ed} onChange={(e) => mc({ setor: e.target.value })} /></Campo>
        <Campo rot="Valor do pagamento"><CampoNum valor={r.l.valor} mudar={(v) => { ml({ valor: v ?? 0, encargos: novo ? +((v ?? 0) * 0.288).toFixed(2) : r.l.encargos }); }} disabled={ed} casas={2} sufixo="R$" /></Campo>
        <Campo rot="Hora extra"><CampoNum valor={r.l.horaExtra} mudar={(v) => ml({ horaExtra: v ?? 0 })} disabled={ed} casas={2} sufixo="R$" /></Campo>
        <Campo rot="Encargos" dica="Sugestão: 28,8% do pagamento"><CampoNum valor={r.l.encargos} mudar={(v) => ml({ encargos: v ?? 0 })} disabled={ed} casas={2} sufixo="R$" /></Campo>
        <Campo rot="Outros valores"><CampoNum valor={r.l.outros} mudar={(v) => ml({ outros: v ?? 0 })} disabled={ed} casas={2} sufixo="R$" /></Campo>
        <Campo rot="Total do colaborador no mês" c={4}><input value={moeda(r.l.valor + r.l.horaExtra + r.l.encargos + r.l.outros)} disabled /></Campo>
      </div>
    </Registro>
  );
}
