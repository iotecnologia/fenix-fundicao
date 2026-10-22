// Documento A4 (Orçamento, O.P, Ficha do Forno, RNC, Certificado). A mesma folha aparece na tela (prévia) e na impressão.
// Impressão: preto no branco, sem fundo colorido; negrito só no título do documento e no cabeçalho das tabelas.
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Empresa } from '../tipos/modelos';

export function Documento({ empresa, titulo, numero, children, rodape = true }: { empresa: Empresa; titulo: string; numero: string; children: ReactNode; rodape?: boolean }) {
  return (
    <div className="doc">
      <div className="doc-cab">
        <div><div className="doc-emp">{empresa.nome.toUpperCase()}</div><div>{empresa.endereco} · {empresa.cidade}</div></div>
        <div className="doc-num"><span>Documento nº</span><div>{numero}</div></div>
      </div>
      <h1 className="doc-tit">{titulo}</h1>
      <div className="doc-corpo">{children}</div>
      {rodape && <div className="doc-rod">{empresa.telefones.join(' · ')} · {empresa.emails.join(' · ')}</div>}
    </div>
  );
}

/** Pares "rótulo: valor" em grade (cabeçalho do documento). */
export function Pares({ itens, col = 3 }: { itens: [string, ReactNode][]; col?: number }) {
  return (
    <dl className={'doc-pares c' + col}>
      {itens.map(([r, v]) => <div key={r}><dt>{r}</dt><dd>{v === '' || v === undefined || v === null ? '—' : v}</dd></div>)}
    </dl>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <section className="doc-sec"><h2>{titulo}</h2>{children}</section>;
}

export function Assinaturas({ nomes }: { nomes: [string, string][] }) {
  return <div className="doc-ass">{nomes.map(([n, r]) => <div key={r}><span />{n}<small>{r}</small></div>)}</div>;
}

/** Coloca o documento fora da aplicação só para a impressora e chama a impressão do navegador. */
export function Imprimir({ children, aoTerminar }: { children: ReactNode; aoTerminar: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => { window.print(); aoTerminar(); }, 60);
    return () => clearTimeout(t);
  }, [aoTerminar]);
  return createPortal(<div className="area-impressao">{children}</div>, document.body);
}
