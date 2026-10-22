// Usuários e Perfis — quem entra no sistema e o que cada perfil abre (consulta) ou altera (edição).
// No mock a lista é fixa (dados/usuarios.json, senha conferida por hash). Na versão final o cadastro grava no servidor.
import { useDados } from '../componentes/Dados';
import { Avatar, Bloco, Tag, TituloPagina } from '../componentes/Comuns';
import { Icone } from '../componentes/Icone';
import { PAGINAS, PERFIS } from '../acesso/paginas';
import type { Perfil } from '../tipos/modelos';

export function Usuarios() {
  const { base } = useDados();
  const perfis = Object.keys(PERFIS) as Perfil[];
  return (
    <>
      <TituloPagina titulo="Usuários e Perfis" sub="Cada pessoa entra com o próprio e-mail e senha; o perfil decide as telas" />
      <div className="pilha">
        <Bloco titulo={<><Icone n="usuarios" /> Usuários</>}>
          <table className="tab">
            <thead><tr><th>Usuário</th><th>E-mail</th><th>Perfil</th><th>O que o perfil faz</th></tr></thead>
            <tbody>{base.usuarios.map((u) => (
              <tr key={u.id}><td><div className="cel-pac"><Avatar nome={u.nome} /><div>{u.nome}<small className="mut"> · {u.cargo}</small></div></div></td><td className="mono">{u.email}</td><td><Tag cls="t-in">{PERFIS[u.perfil].nome}</Tag></td><td className="mut">{PERFIS[u.perfil].descricao}</td></tr>
            ))}</tbody>
          </table>
        </Bloco>
        <Bloco titulo={<><Icone n="chave" /> Permissões por perfil</>} extra={<span className="mut peq">edita · consulta · sem acesso</span>}>
          <div className="rolagem-x">
            <table className="tab matriz">
              <thead><tr><th>Tela</th><th>Substitui na planilha</th>{perfis.map((p) => <th key={p} className="centro">{PERFIS[p].nome}</th>)}</tr></thead>
              <tbody>{PAGINAS.map((pg) => (
                <tr key={pg.id}><td><span className="cel-ic"><Icone n={pg.icone} /> {pg.nome}</span></td><td className="mut peq">{pg.planilha}</td>
                  {perfis.map((p) => <td key={p} className="centro">{!pg.perfis.includes(p) ? <span className="mut">—</span> : pg.edita.includes(p) ? <Tag cls="t-ok">edita</Tag> : <Tag cls="t-fim">consulta</Tag>}</td>)}
                </tr>))}</tbody>
            </table>
          </div>
        </Bloco>
      </div>
    </>
  );
}
