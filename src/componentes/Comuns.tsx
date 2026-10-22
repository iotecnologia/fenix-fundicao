// Peças pequenas reaproveitadas em várias telas (mesmo padrão do IO Clinic / Analiza).
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icone } from './Icone';
import { iniciais, campoNum, lerNum } from '../util/formato';
import { useSessao } from '../acesso/Sessao';
import { podeEditar } from '../acesso/paginas';
import { mesCurto, nomeMesLongo, somaMes } from '../regras/periodo';

export function TituloPagina({ titulo, sub, children }: { titulo: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="tit-pagina">
      <div><h1>{titulo}</h1>{sub && <p>{sub}</p>}</div>
      {children && <div className="acoes-pagina">{children}</div>}
    </div>
  );
}

export function Bloco({ titulo, extra, children, className }: { titulo: ReactNode; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={'bloco' + (className ? ' ' + className : '')}>
      <div className="bloco-cab"><h3>{titulo}</h3>{extra}</div>
      {children}
    </section>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="vazio">{children}</div>;
}

export function Tag({ cls, children, titulo }: { cls: string; children: ReactNode; titulo?: string }) {
  return <span className={'tag ' + cls} title={titulo}>{children}</span>;
}

export function Avatar({ nome }: { nome: string }) {
  return <div className="avatar">{iniciais(nome)}</div>;
}

/** Botão só com ícone; o nome aparece ao passar o mouse (title). */
export function BotaoIcone({ icone, titulo, onClick, pri, disabled, cls }: { icone: string; titulo: string; onClick?: () => void; pri?: boolean; disabled?: boolean; cls?: string }) {
  return (
    <button type="button" className={'btn2 ic' + (pri ? ' pri' : '') + (cls ? ' ' + cls : '')} title={titulo} aria-label={titulo} onClick={onClick} disabled={disabled}>
      <Icone n={icone} />
    </button>
  );
}

export function Modal({ titulo, fechar, children, largo }: { titulo: ReactNode; fechar: () => void; children: ReactNode; largo?: boolean }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [fechar]);
  return createPortal(
    <div className="modal-fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <div className={'modal' + (largo ? ' largo' : '')} role="dialog" aria-modal="true">
        <div className="modal-cab"><h2>{titulo}</h2><button type="button" className="icone-btn" onClick={fechar} title="Fechar" aria-label="Fechar"><Icone n="x" /></button></div>
        <div className="modal-corpo">{children}</div>
      </div>
    </div>,
    document.querySelector('.app') ?? document.body,
  );
}

/** O perfil logado pode criar/alterar nesta página? (os outros perfis só consultam) */
export function useEdita(pagina: string): boolean {
  const s = useSessao();
  return !!s.usuario && podeEditar(pagina, s.usuario.perfil);
}

/** Seletor de mês: ‹ Outubro 2026 › (últimos `meses` meses até o atual). */
export function SeletorMes({ mes, setMes, atual, meses = 6 }: { mes: string; setMes: (m: string) => void; atual: string; meses?: number }) {
  const primeiro = somaMes(atual, -(meses - 1));
  return (
    <div className="nav-data">
      <button type="button" className="icone-btn" title="Mês anterior" aria-label="Mês anterior" onClick={() => setMes(somaMes(mes, -1))} disabled={mes <= primeiro}><Icone n="esq" /></button>
      <select className="sel-mes" value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Mês" title="Escolher o mês">
        {Array.from({ length: meses }, (_, i) => somaMes(atual, -i)).map((m) => {
          const nome = nomeMesLongo(m).replace(' de ', ' ');
          return <option key={m} value={m}>{nome[0].toUpperCase() + nome.slice(1)}</option>;
        })}
      </select>
      <button type="button" className="icone-btn" title="Próximo mês" aria-label="Próximo mês" onClick={() => setMes(somaMes(mes, 1))} disabled={mes >= atual}><Icone n="dir" /></button>
    </div>
  );
}
export { mesCurto };

/** Cartões de indicador (mesmo padrão "contadores" do IO Clinic). */
export function Contador({ icone, valor, rot, cls, titulo }: { icone: string; valor: ReactNode; rot: ReactNode; cls?: string; titulo?: string }) {
  return <div className={cls} title={titulo}><Icone n={icone} /><b>{valor}</b><span>{rot}</span></div>;
}

/** Busca da lista (padrão: fundo branco, contorno só com foco, sem "x" nativo). */
export function BuscaLista({ valor, setValor, dica }: { valor: string; setValor: (v: string) => void; dica: string }) {
  return <div className="f-busca"><Icone n="busca" /><input type="text" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={dica} aria-label={dica} /></div>;
}

export function Segmentado<T extends string>({ valor, setValor, opcoes }: { valor: T; setValor: (v: T) => void; opcoes: { v: T; nome: string; n?: number; dica?: string }[] }) {
  return (
    <div className="segmentado">
      {opcoes.map((o) => <button key={o.v} type="button" className={valor === o.v ? 'sel' : ''} onClick={() => setValor(o.v)} title={o.dica}>{o.nome}{o.n !== undefined && <small>{o.n}</small>}</button>)}
    </div>
  );
}

// ================== registro (ver / editar) ==================
/**
 * Janela de um registro. Abre em CONSULTA; o lápis libera a edição.
 * Salvar e Descartar ficam sempre visíveis, desabilitados até clicar no lápis (padrão dos sistemas).
 * Registro novo já abre em edição; Descartar fecha.
 */
export function Registro({ titulo, novo, edita, editando, setEditando, salvar, descartar, fechar, imprimir, cabecalho, erro, children, acoesExtra }: {
  titulo: ReactNode; novo?: boolean; edita: boolean; editando: boolean; setEditando: (v: boolean) => void;
  salvar: () => void; descartar: () => void; fechar: () => void; imprimir?: () => void;
  cabecalho?: ReactNode; erro?: string; children: ReactNode; acoesExtra?: ReactNode;
}) {
  return (
    <Modal titulo={titulo} fechar={fechar} largo>
      <div className="reg-barra">
        <div className="reg-cab">{cabecalho}</div>
        <div className="reg-acoes">
          {acoesExtra}
          {imprimir && <BotaoIcone icone="imprimir" titulo="Imprimir documento" onClick={imprimir} disabled={editando} />}
          {!novo && <BotaoIcone icone="editar" titulo={edita ? 'Editar' : 'Seu perfil só consulta esta página'} onClick={() => setEditando(true)} disabled={!edita || editando} />}
          <BotaoIcone icone="salvar" titulo="Salvar" pri onClick={salvar} disabled={!editando} />
          <BotaoIcone icone="descartar" titulo={novo ? 'Descartar e fechar' : 'Descartar alterações'} onClick={descartar} disabled={!editando} />
        </div>
      </div>
      {erro && <div className="aviso reg-erro"><Icone n="alerta" /> {erro}</div>}
      <div className={'reg-corpo' + (editando ? ' editando' : '')}>{children}</div>
    </Modal>
  );
}

/** Rótulo + campo. `c` = colunas que ocupa na grade (1 a 4). */
export function Campo({ rot, c, children, dica }: { rot: string; c?: number; children: ReactNode; dica?: string }) {
  return <label className={'cmp' + (c ? ' c' + c : '')} title={dica}><span>{rot}</span>{children}</label>;
}

/** Campo numérico no padrão brasileiro (vírgula). Guarda o texto enquanto digita e devolve número. */
export function CampoNum({ valor, mudar, disabled, casas, sufixo, placeholder }: { valor: number | undefined; mudar: (v: number | undefined) => void; disabled?: boolean; casas?: number; sufixo?: string; placeholder?: string }) {
  const [txt, setTxt] = useState(campoNum(valor));
  useEffect(() => { if (lerNum(txt) !== valor && !(Number.isNaN(lerNum(txt)) && valor === undefined)) setTxt(campoNum(valor)); }, [valor]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={'inp-num' + (sufixo ? ' com-suf' : '')}>
      <input inputMode="decimal" value={txt} disabled={disabled} placeholder={placeholder}
        onChange={(e) => { const t = e.target.value.replace(/[^\d,.-]/g, ''); setTxt(t); const n = lerNum(t); mudar(Number.isNaN(n) ? undefined : casas !== undefined ? +n.toFixed(casas) : n); }} />
      {sufixo && <em>{sufixo}</em>}
    </div>
  );
}

/** Estado de edição de um registro: rascunho, modo edição e erro. */
export function useRascunho<T>(inicial: T, novo: boolean) {
  const [r, setR] = useState<T>(inicial);
  const [editando, setEditando] = useState(novo);
  const [erro, setErro] = useState('');
  const mudar = <K extends keyof T>(k: K, v: T[K]) => setR((x) => ({ ...x, [k]: v }));
  const descartar = () => { setR(inicial); setEditando(false); setErro(''); };
  return { r, setR, mudar, editando, setEditando, erro, setErro, descartar };
}

/** Aviso de mock, discreto. */
export function SeloMock() {
  return <span className="selo-mock" title="Mock de apresentação: dados fictícios, nada é salvo">dados fictícios</span>;
}

/** Linha "de onde veio da planilha" — ajuda a apresentação a mostrar o antes/depois. */
export function OrigemPlanilha({ aba }: { aba: string }) {
  return <span className="origem" title="Aba da planilha que esta tela substitui"><Icone n="arquivo" /> planilha: {aba}</span>;
}
