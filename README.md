# IO Tecnologia · Fênix — mock funcional (apresentação)

Sistema de gestão da **Fundição Fênix**, no mesmo padrão do Analiza e do IO Clinic (React + Vite + TypeScript).
Substitui a planilha `GERENCIAMENTO_FENIX_PADRÃO.xlsx` (1.166 abas, um arquivo por mês).

Este é o **mock de apresentação**: roda só no navegador, com **dados fictícios** (≈ 7 meses de operação gerados
a partir da data de hoje). Nada é salvo: recarregou a página, volta ao início.
Na versão final, só a camada `repositorio/` muda para buscar os dados no backend (Node + PostgreSQL), sem refazer as telas.

## Como rodar

Requisito: Node 20 ou superior.

```bash
npm install        # instala as dependências
npm run dev        # abre em http://localhost:5173
npm test           # roda os testes das regras (contas da planilha + base fictícia)
npm run build      # gera a versão final em dist/
```

## Publicar no GitHub Pages

1. Suba o projeto para o repositório (branch `main`).
2. No GitHub: **Settings → Pages → Source: GitHub Actions**.
3. A cada envio para `main`, o workflow `.github/workflows/deploy.yml` roda os testes, gera o build e publica.
   Se um teste falhar, nada é publicado.

## Acesso de demonstração (perfis)

| Perfil | E-mail | Senha | O que faz |
|---|---|---|---|
| Diretoria | diretoria@fenix.exemplo | Diretoria@2026 | Tudo: custos, folha, indicadores, usuários |
| Comercial | comercial@fenix.exemplo | Comercial@2026 | Orçamentos, clientes, faturamento; consulta O.P e certificados |
| Produção | producao@fenix.exemplo | Producao@2026 | O.P, fichas do forno, insumos, manutenção; abre RNC |
| Qualidade | qualidade@fenix.exemplo | Qualidade@2026 | RNC, certificados, ligas e normas; consulta produção |
| Administrativo | administrativo@fenix.exemplo | Adm@2026 | Compras de insumos, manutenção, folha, faturamento |

A senha é conferida por hash (PBKDF2); 5 erros seguidos bloqueiam por 30 s. A matriz completa de
permissões (edita / consulta / sem acesso) está na tela **Usuários e Perfis** e em `src/acesso/paginas.ts`.
Telas que o perfil só consulta aparecem no menu com um olho; o lápis de edição fica desabilitado.

## Planilha → sistema

| Planilha | Sistema |
|---|---|
| ÍNDICE | Visão Geral (números do mês + "Para fazer" por perfil) |
| GERAÇÃO DE ORÇAMENTO + ORÇAMENTO (1…200) | Orçamentos (margem pelo custo/kg do último mês fechado; gera as O.P) |
| FATURAMENTO | Faturamento |
| GERAÇÃO DE O.P + OP (1…200) | Ordens de Produção (progresso vem das fichas do forno) |
| GERAÇÃO F.F + FF (1…200) | Fichas do Forno (química conferida, baixa automática dos insumos) |
| GERAÇÃO DE R.N.C + RNC (1…100) | RNC (lança o refugo na O.P) |
| GERAÇÃO DE CERTIFICADO (1 e 2) + CQ (1…200) | Certificados (química vem da corrida, sem redigitar) |
| CONSUMO DE I.F.R / I.M.F / E.P.I / I.E.L + ~260 abas | Insumos (estoque contínuo, unidade por item, estoque mínimo) |
| MANUTENÇÃO | Manutenção e Combustível |
| FOLHA PAGAMENTO | Folha de Pagamento |
| CUSTO MENSAL | Custo Mensal (fecha sozinho) |
| — | Clientes, Ligas e Fornos, Indicadores (BI), Usuários e Perfis |

Cada aba copiada virou o **documento impresso** gerado do registro (botão imprimir): Orçamento, O.P, Ficha do Forno,
RNC e Certificado — preto no branco, sem limite de 100/200 documentos por mês.

## Pontos encontrados na planilha

1. **150 das 200 abas de orçamento com fórmula errada**: o item 004 aponta para `L14` (vazio) e o item 015 usa o preço fixo `14`.
   No sistema todos os itens usam o mesmo preço/kg (teste em `tests/regras.test.ts`).
2. **Custo Mensal — validar com a diretoria**: o custo é dividido pelo metal **limpo** (já carrega a perda) e o custo do
   refugo é somado por cima. O sistema calcula igual à planilha e mostra o valor sem o refugo somado, lado a lado.
3. **Limites fixos e arquivo por mês**: 200 O.P, 100 RNC, 75 insumos por grupo; sem histórico entre meses. No sistema não há limite e o histórico é contínuo.
4. **Dados digitados em cada documento**: especificação química da liga, nome e registro do analista. Viraram cadastro (Ligas e Fornos).
5. **Unidades**: todos os insumos estavam em "Kg" (inclusive luva e sapato). Cada insumo tem a sua unidade.
6. **Insumos duplicados sem nome** (Ponta Montada, Eletrodo Revestido, Luva 10x13) ficaram de fora até a Fênix dizer quais são.

## Roteiro sugerido para a apresentação

1. **Entrar como Diretoria.** Visão Geral: corridas do dia, metal limpo, rendimento, refugo, custo/kg e o "Para fazer".
2. **Custo Mensal** (setembro): mostrar que tudo vem dos outros módulos e o ponto a validar do refugo.
3. **Orçamentos → novo**: escolher cliente e liga, digitar a margem desejada e "achar preço"; imprimir.
   Num orçamento aprovado: **gerar as O.P**.
4. **Fichas do Forno → nova corrida**: "sugerir pela liga", apontar peças das O.P, digitar a química (fica vermelho se sair da norma), salvar.
   Ir em **Insumos** e ver a retirada "FF nº" lançada sozinha.
5. **Ordens de Produção**: progresso de cada O.P, atrasadas, imprimir a O.P.
6. **RNC → nova**: escolher a O.P (dados vêm sozinhos) e lançar o refugo na O.P.
7. **Certificados → novo**: escolher a nota; a química vem da corrida e é conferida contra a norma; imprimir.
8. **Indicadores**: tendência de 6 meses (custo/kg, faturado × custo, refugo, clientes, insumos).
9. **Sair e entrar como Produção**: o menu muda; Orçamentos e Custo não aparecem.

## Estrutura

```
src/
├── acesso/        sessão (login) e perfis/páginas
├── componentes/   moldura (Shell), peças comuns, documentos impressos, gráficos
├── dados/         empresa, ligas, fornos, insumos, clientes, usuários (JSON)
├── estilos/       base.css (tema IO), telas.css, gestao.css, impressao.css, fenix.css
├── regras/        contas da planilha, uma por módulo (testadas)
├── repositorio/   contrato de dados + gerador da base fictícia
├── telas/         uma tela por módulo
├── tipos/         modelos de dados
└── util/          datas e formatação
tests/             regras e base fictícia (vitest)
```
