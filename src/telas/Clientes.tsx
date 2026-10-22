// Clientes — cadastro novo (na planilha o cliente era digitado de novo em cada orçamento, O.P, RNC, CQ e nota).
import { useState } from 'react';
import type { Cliente } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { BotaoIcone, BuscaLista, Campo, OrigemPlanilha, Registro, TituloPagina, Vazio, useEdita, useRascunho } from '../componentes/Comuns';
import { useAbrir } from '../componentes/useAbrir';
import { progressoOP } from '../regras/producao';
import { mesDe, somaMes } from '../regras/periodo';
import { hoje } from '../util/datas';
import { cnpjValido, mascaraCnpj, mascaraTelefone, moeda, semAcento, soma } from '../util/formato';

export function Clientes() {
  const { base } = useDados();
  const hj = hoje();
  const edita = useEdita('clientes');
  const [abrir, setAbrir] = useAbrir();
  const [t, setT] = useState('');
  const q = semAcento(t);
  const seisMeses = somaMes(mesDe(hj), -5) + '-01';
  const vis = base.clientes.filter((c) => !q || semAcento(`${c.nome} ${c.cnpj} ${c.cidade} ${c.segmento}`).includes(q)).map((c) => ({
    c,
    abertas: base.ops.filter((o) => o.clienteId === c.id && progressoOP(o, base, hj).status !== 'concluida').length,
    fat: soma(base.faturamento.filter((n) => n.clienteId === c.id && n.data >= seisMeses), (n) => n.quantidadeKg * n.precoKg),
  })).sort((a, b) => b.fat - a.fat);
  const sel = abrir === 'novo' ? null : base.clientes.find((c) => c.id === abrir);
  return (
    <>
      <TituloPagina titulo="Clientes" sub={<OrigemPlanilha aba="— (novo: antes digitado em cada documento)" />}>
        <BotaoIcone icone="mais" titulo={edita ? 'Novo cliente' : 'Seu perfil só consulta'} pri disabled={!edita} onClick={() => setAbrir('novo')} />
      </TituloPagina>
      <div className="barra"><BuscaLista valor={t} setValor={setT} dica="Buscar por nome, CNPJ, cidade ou segmento" /></div>
      <div className="bloco">
        {vis.length === 0 ? <Vazio>Nenhum cliente.</Vazio> : (
          <table className="tab">
            <thead><tr><th>Cliente</th><th>CNPJ</th><th>Segmento</th><th>Cidade</th><th>Contato</th><th className="dir">O.P em aberto</th><th className="dir">Faturado (6 meses)</th></tr></thead>
            <tbody>{vis.map(({ c, abertas, fat }) => (
              <tr key={c.id} className="clic" onClick={() => setAbrir(c.id)}>
                <td>{c.nome}</td><td className="mono mut">{c.cnpj}</td><td className="mut">{c.segmento}</td><td>{c.cidade}</td><td className="mut">{c.contato}</td>
                <td className="dir mono">{abertas || '—'}</td><td className="dir mono">{moeda(fat)}</td>
              </tr>))}</tbody>
          </table>
        )}
      </div>
      {(sel || abrir === 'novo') && <RegistroCliente cliente={sel ?? undefined} fechar={() => setAbrir(null)} />}
    </>
  );
}

function RegistroCliente({ cliente, fechar }: { cliente?: Cliente; fechar: () => void }) {
  const { base, acoes } = useDados();
  const edita = useEdita('clientes');
  const novo = !cliente;
  const inicial: Cliente = cliente ?? { id: acoes.novoId('c'), nome: '', cnpj: '', contato: '', telefone: '', cidade: 'Rondonópolis-MT', segmento: '' };
  const { r, mudar, editando, setEditando, erro, setErro, descartar } = useRascunho(inicial, novo);
  const ed = !editando;
  const salvar = () => {
    if (!r.nome.trim()) return setErro('Informe a razão social.');
    if (r.cnpj && !cnpjValido(r.cnpj)) return setErro('CNPJ inválido (confira os dígitos).');
    if (base.clientes.some((c) => c.id !== r.id && c.cnpj && c.cnpj === r.cnpj)) return setErro('Já existe cliente com este CNPJ.');
    acoes.salvar('clientes', r); setErro(''); setEditando(false); if (novo) fechar();
  };
  return (
    <Registro titulo={novo ? 'Novo cliente' : r.nome} novo={novo} edita={edita} editando={editando} setEditando={setEditando} salvar={salvar} descartar={novo ? fechar : descartar} fechar={fechar} erro={erro}>
      <div className="form-grade">
        <Campo rot="Razão social" c={3}><input value={r.nome} disabled={ed} onChange={(e) => mudar('nome', e.target.value)} /></Campo>
        <Campo rot="CNPJ"><input value={r.cnpj} disabled={ed} onChange={(e) => mudar('cnpj', mascaraCnpj(e.target.value))} placeholder="00.000.000/0000-00" /></Campo>
        <Campo rot="Segmento" c={2}><input value={r.segmento} disabled={ed} onChange={(e) => mudar('segmento', e.target.value)} /></Campo>
        <Campo rot="Cidade" c={2}><input value={r.cidade} disabled={ed} onChange={(e) => mudar('cidade', e.target.value)} /></Campo>
        <Campo rot="Contato" c={2}><input value={r.contato} disabled={ed} onChange={(e) => mudar('contato', e.target.value)} /></Campo>
        <Campo rot="Telefone" c={2}><input value={r.telefone} disabled={ed} onChange={(e) => mudar('telefone', mascaraTelefone(e.target.value))} /></Campo>
      </div>
    </Registro>
  );
}
