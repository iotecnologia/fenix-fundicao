// Custo Mensal — substitui a aba "CUSTO MENSAL" (custos da fundição para montagem de orçamento).
// Tudo vem dos outros módulos; só energia, água/esgoto e diversos são lançados aqui.
// Mostra o ponto a validar da planilha: o refugo somado por cima do custo já dividido pelo metal limpo.
import { useState } from 'react';
import type { CustoFixo } from '../tipos/modelos';
import { useDados } from '../componentes/Dados';
import { Bloco, BotaoIcone, Campo, CampoNum, OrigemPlanilha, Registro, SeletorMes, Tag, TituloPagina, useEdita, useRascunho } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { Proporcao } from '../componentes/Graficos';
import { custoMes } from '../regras/custo';
import { mesDe, nomeMesLongo, somaMes } from '../regras/periodo';
import { hoje } from '../util/datas';
import { kg, moeda, pct, rkg } from '../util/formato';

const ORIGEM: Record<string, string> = {
  energia: 'lançado aqui', agua: 'lançado aqui', diversos: 'lançado aqui',
  IFR: 'Insumos · retiradas (fichas do forno)', IMF: 'Insumos · retiradas', EPI: 'Insumos · retiradas', IEL: 'Insumos · retiradas',
  manutencao: 'Manutenção', folha: 'Folha de pagamento',
};

export function CustoMensal() {
  const { base } = useDados();
  const hj = hoje();
  const edita = useEdita('custo');
  const [mes, setMes] = useState(somaMes(mesDe(hj), -1));
  const [editar, setEditar] = useState(false);
  const c = custoMes(base, mes);
  const andamento = mes === mesDe(hj);
  const grupos = [
    { nome: 'Folha de pagamento', valor: c.linhas.find((l) => l.chave === 'folha')!.valor },
    { nome: 'Insumos (4 grupos)', valor: c.linhas.filter((l) => ['IFR', 'IMF', 'EPI', 'IEL'].includes(l.chave)).reduce((t, l) => t + l.valor, 0) },
    { nome: 'Energia, água e diversos', valor: c.linhas.filter((l) => ['energia', 'agua', 'diversos'].includes(l.chave)).reduce((t, l) => t + l.valor, 0) },
    { nome: 'Manutenção e combustível', valor: c.linhas.find((l) => l.chave === 'manutencao')!.valor },
  ];
  return (
    <>
      <TituloPagina titulo="Custo Mensal" sub={<><OrigemPlanilha aba="CUSTO MENSAL" /> {andamento && <Tag cls="t-at">mês em andamento · parcial</Tag>}</>}>
        <SeletorMes mes={mes} setMes={setMes} atual={mesDe(hj)} />
        <BotaoIcone icone="editar" titulo={edita ? 'Lançar energia, água e diversos' : 'Seu perfil só consulta'} disabled={!edita} onClick={() => setEditar(true)} />
      </TituloPagina>
      <div className="custo-topo">
        <div className="custo-kg">
          <span>Custo por kg fabricado · {nomeMesLongo(mes)}</span>
          <b>{rkg(c.custoKg)}</b>
          <small>(custos {moeda(c.custos)} + refugo {moeda(c.custoRefugo)}) ÷ metal limpo {kg(c.metalLimpo)}</small>
          <em>É este valor que o orçamento usa como custo de referência no mês seguinte.</em>
        </div>
        <div className="contadores c4 sem-marg">
          <div><Icone n="fogo" /><b>{c.corridas}</b><span>corridas</span></div>
          <div><Icone n="balanca" /><b>{kg(c.metalBruto)}</b><span>metal bruto</span></div>
          <div><Icone n="peca" /><b>{kg(c.metalLimpo)}</b><span>metal limpo</span></div>
          <div><Icone n="grafico" /><b>{pct(c.rendimento)}</b><span>rendimento metálico</span></div>
        </div>
      </div>
      <div className="grade2">
        <div className="pilha">
          <Bloco titulo={<><Icone n="carteira" /> Custos da fundição</>} extra={<span className="mut peq">{moeda(c.custos)}</span>}>
            <table className="tab">
              <thead><tr><th>Custo</th><th>De onde vem</th><th className="dir">Valor</th><th className="dir">R$/kg limpo</th></tr></thead>
              <tbody>
                {c.linhas.map((l) => <tr key={l.chave}><td>{l.nome}</td><td className="mut">{ORIGEM[l.chave]}</td><td className="dir mono">{moeda(l.valor)}</td><td className="dir mono mut">{c.metalLimpo ? moeda(l.valor / c.metalLimpo) : '—'}</td></tr>)}
                <tr className="linha-tot"><td>Total dos custos</td><td /><td className="dir mono">{moeda(c.custos)}</td><td className="dir mono">{rkg(c.custoKgSemRefugo)}</td></tr>
              </tbody>
            </table>
          </Bloco>
          <div className="aviso-validar">
            <Icone n="info" />
            <div>
              <b>Ponto a validar com a diretoria</b>
              <p>A planilha divide o custo pelo metal <em>limpo</em> (isso já carrega a perda em cada kg bom) e depois soma o custo do refugo por cima. A perda pode estar sendo contada duas vezes.</p>
              <p>Como a planilha: <b className="mono">{rkg(c.custoKg)}</b> · Sem somar o refugo: <b className="mono">{rkg(c.custoKgSemRefugo)}</b> · Diferença: <b className="mono">{rkg(c.custoKg - c.custoKgSemRefugo)}</b></p>
            </div>
          </div>
        </div>
        <div className="pilha">
          <Bloco titulo={<><Icone n="alerta" /> Refugo</>}>
            <div className="resumo-linha dentro">
              <div><span>Peso perdido (RNC)</span><b>{kg(c.refugoKg)}</b></div>
              <div><span>% do metal bruto</span><b>{pct(c.refugoPct, 2)}</b></div>
              <div><span>Custo do refugo</span><b>{moeda(c.custoRefugo)}</b></div>
            </div>
          </Bloco>
          <Bloco titulo={<><Icone n="grafico" /> Composição do custo</>}><div className="pad"><Proporcao partes={grupos} fmt={(v) => moeda(v).replace(/,\d\d$/, '')} /></div></Bloco>
        </div>
      </div>
      {editar && <RegistroFixo mes={mes} fechar={() => setEditar(false)} />}
    </>
  );
}

function RegistroFixo({ mes, fechar }: { mes: string; fechar: () => void }) {
  const { base, acoes } = useDados();
  const inicial: CustoFixo = base.custosFixos.find((c) => c.mes === mes) ?? { mes, energia: 0, agua: 0, diversos: 0 };
  const { r, mudar, editando, setEditando, descartar } = useRascunho(inicial, true);
  const salvar = () => { acoes.salvarFixo(r); setEditando(false); fechar(); };
  return (
    <Registro titulo={`Custos do mês · ${nomeMesLongo(mes)}`} novo edita editando={editando} setEditando={setEditando} salvar={salvar} descartar={() => { descartar(); fechar(); }} fechar={fechar}>
      <div className="form-grade c3">
        <Campo rot="Energia elétrica"><CampoNum valor={r.energia} mudar={(v) => mudar('energia', v ?? 0)} casas={2} sufixo="R$" /></Campo>
        <Campo rot="Água e esgoto"><CampoNum valor={r.agua} mudar={(v) => mudar('agua', v ?? 0)} casas={2} sufixo="R$" /></Campo>
        <Campo rot="Custos diversos"><CampoNum valor={r.diversos} mudar={(v) => mudar('diversos', v ?? 0)} casas={2} sufixo="R$" /></Campo>
      </div>
      <p className="nota">Os demais custos (insumos, manutenção e folha) vêm sozinhos das outras telas.</p>
    </Registro>
  );
}
