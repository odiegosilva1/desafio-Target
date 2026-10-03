# Desafio Target

Solucao dos tres exercicios do enunciado (`spec.md`, nao versionado) em
TypeScript, executada direto pelo Node 24 sem etapa de build.

Zero dependencias de runtime.

## Como rodar

Requer Node 24 ou superior (o projeto usa remocao de tipos nativa).

```bash
npm install
npm run check      # typecheck + lint + testes
```

Os tres exercicios:

```bash
npm run comissao                                     # comissao por vendedor
npm run estoque                                      # REPL de estoque
npm run juros -- -v 1000,00 --vencimento 2026-09-03 # multa por atraso
```

## Os tres exercicios

### 1. Comissao de vendedores

```bash
npm run comissao
npm run comissao -- --arquivo data/vendas.json
```

Regras por venda: sem comissao abaixo de R$ 100,00; 1% abaixo de R$ 500,00;
5% a partir de R$ 500,00. Os limites sao inclusivos na faixa superior, entao
exatamente R$ 500,00 ja gera 5%.

Saida com as 36 vendas de `data/vendas.json`:

```
Comissao por vendedor
==========================================================
João Silva           10 vendas  R$    10.754,70  R$     495,69
Maria Souza           9 vendas  R$     9.874,30  R$     465,96
Carlos Oliveira       8 vendas  R$     7.928,35  R$     379,38
Ana Lima              9 vendas  R$     8.763,95  R$     404,99
==========================================================
TOTAL                36 vendas  R$    37.321,30  R$   1.746,02
```

### 2. Movimentacoes de estoque

```bash
npm run estoque
```

REPL com os comandos `entrada`, `saida`, `saldo`, `listar`, `historico`,
`ajuda` e `sair`. Cada movimentacao recebe identificador unico e sequencial,
uma descricao e devolve o saldo final do produto movimentado.

```
$ entrada 101 50
#1 entrada de 50 Caneta Azul | saldo final: 200
$ saida 101 20
#2 saida de 20 Caneta Azul | saldo final: 180
$ saida 101 500
Erro: saida de 500 excede o saldo de 180 do produto 101
```

O estoque nunca fica negativo: a saida maior que o saldo e recusada sem
alterar o saldo e sem entrar no historico.

### 3. Multa por atraso

```bash
npm run juros -- --valor 1000,00 --vencimento 2026-09-03 --hoje 2026-10-03
```

```
Valor:      R$ 1.000,00
Vencimento: 2026-09-03
Dias:       30
Taxa:       2,5% ao dia (simples)
Multa:      R$ 750,00
Total:      R$ 1.750,00
```

`--hoje` e opcional; sem ele, usa a data corrente. Aceita `1000,00`,
`1000.00` e `1.000,00`.

## Decisoes e premissas

O enunciado deixa pontos em aberto. Onde ele cala, a escolha esta aqui e o
teste correspondente fixa o comportamento.

| Ponto | Decisao | Por que |
|---|---|---|
| Arredondamento da comissao | meio para cima, **por venda** | o enunciado diz "para cada venda", o que indica calculo individual |
| Arredondamento da multa | meio para cima, uma unica vez no fim | evita error acumulado |
| Juros compostos ou simples | **simples**, pro-rata | o enunciado diz "2,5% ao dia"; composta exigiria que a multa incidisse sobre o proprio juro, o que nao ocorre em multa contratual |
| Dia do vencimento | sem multa | cobranca a partir do dia seguinte |
| Titulo nao vencido | multa zero, total igual ao valor | nada a cobrar antes do vencimento |
| saida maior que o saldo | recusada com erro | estoque negativo nao existe em deposito |
| Valor negativo na entrada | recusado | nao ha venda nem devolucao negativa |

## Decisoes de implementacao

**Dinheiro em centavos inteiros.** Nenhum calculo passa por ponto
flutuante. `1200.50 * 0.05` em `number` devolve `60.024999999999994`, e
somar comissoes assim acumula erro: as 10 vendas do Joao Silva somam
`537,74` em float, contra `537,76` exatos. A conversao parte da string,
porque `1200.50 * 100` vale `120049.99999999999`.

O efeito do arredondamento de uma venda isolada o float acerta por sorte
nos valores deste enunciado; o que quebra e o acúmulo. O teste em
`test/money.test.ts` fixa exatamente esse caso.

**Camadas puras na borda.** `domain.ts`, `estoque.ts` e `juros.ts` nao
importam nada de Node: nao leem arquivos, nao imprimem e nao chamam
`new Date()`. "Hoje" chega por parametro, o que torna a suite
deterministica. `io.ts` e `cli.ts` concentram todo acesso a disco e ao
processo.

**Datas em UTC.** `new Date('2026-10-03')` vira meia-noite local; num fuso a
oeste da UTC a contagem de dias voltaria um dia. As datas sao interpretadas
com sufixo `Z`, e ha teste que fixa 30 dias sob UTC, Sao Paulo e Toquio.

**Erros de dominio tipados.** `ErroEntradaInvalida` para dado malformado e
`ErroRegraDeNegocio` para violacao de regra. A CLI traduz para mensagem de
usuario e sai com codigo 1; o dominio nao conhece `console`.

## Estrutura

```
src/shared/money.ts     centavos, arredondamento, formatacao BRL
src/shared/erros.ts     erros de dominio
src/comissao/           domain.ts · io.ts · cli.ts
src/estoque/            estoque.ts · io.ts · cli.ts
src/juros/              juros.ts · cli.ts
data/                   vendas.json · estoque.json
test/                   96 testes
```

`data/*.json` foi extraido do `spec.md` sem alterar nenhum valor. Como o
enunciado nao esta versionado, o README e a unica referencia auditavel da
procedencia: sao 36 vendas (4 vendedores, R$ 37.321,30) e 5 produtos
(835 itens), ambos conferidos contra o original.

## Testes

```bash
npm test
```

96 testes com o runner nativo do Node (`node:test`), sem framework.

Os valores esperados dos tres exercicios foram conferidos de forma
independente com `Decimal` do Python, que nao sofre com a imprecisao do
IEEE754. Isso importa: durante o desenvolvimento, um calculo meu a mao
divergiu do codigo e quem estava errado era o calculo.

## Um detalhe do runner

O script de teste e `node --test`, **sem caminho**. No Node 24.14.1,
`node --test test/` falha com `MODULE_NOT_FOUND`: o runner interpreta o
argumento como modulo a executar em vez de pasta a varrer. Sem argumento, o
discovery encontra as specs `.ts` normalmente.

```bash
node --test          # funciona
node --test test/    # falha nesta versao
```

## Git Flow

```
main        tag v0.1.0 (tooling) · v1.0.0 (entrega)
  └─ develop
       ├─ feature/1-comissao   merge --no-ff
       ├─ feature/2-estoque    merge --no-ff
       └─ feature/3-juros      merge --no-ff
```

Um branch e um merge por exercicio, entao cada um pode ser avaliado isolado.
Commits no padrao Conventional Commits.

