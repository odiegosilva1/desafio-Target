#!/usr/bin/env node
/**
 * Exercicio 2: movimentacoes de estoque.
 *
 *   npm run estoque
 *   npm run estoque -- --arquivo data/estoque.json
 *
 * Modo interativo (padrao): permite lancar movimentacoes uma a uma.
 *   entrada <codigo> <quantidade>   entrada de mercadoria
 *   saida   <codigo> <quantidade>    saida de mercadoria
 *   saldo   <codigo>                 consulta o saldo
 *   listar                           todos os produtos
 *   historico                        movimentacoes registradas
 *   ajuda                            esta ajuda
 *   sair                             encerra
 */

import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

import { ErroDominio } from '../shared/erros.ts';
import { Estoque } from './estoque.ts';
import { CAMINHO_PADRAO, carregarProdutos } from './io.ts';

const { values } = parseArgs({
  options: {
    arquivo: { type: 'string', default: CAMINHO_PADRAO },
    ajuda: { type: 'boolean', short: 'h', default: false },
  },
});

const AJUDA = [
  'Comandos:',
  '  entrada <codigo> <quantidade>   registra entrada de mercadoria',
  '  saida   <codigo> <quantidade>   registra saida de mercadoria',
  '  saldo   <codigo>                consulta o saldo do produto',
  '  listar                           lista todos os produtos',
  '  historico                        lista as movimentacoes',
  '  ajuda                            mostra esta ajuda',
  '  sair                             encerra',
].join('\n');

function listar(estoque: Estoque): void {
  console.log('codigo  descricao                       saldo');
  console.log('-'.repeat(52));
  for (const produto of estoque.listar()) {
    console.log(
      `${String(produto.codigo).padEnd(7)} ${produto.descricao.padEnd(30)} ${String(produto.estoque).padStart(5)}`,
    );
  }
  console.log('-'.repeat(52));
  console.log(`total: ${String(estoque.totalEmItens).padStart(37)} itens`);
}

function mostrarHistorico(estoque: Estoque): void {
  const historico = estoque.historico;
  if (historico.length === 0) {
    console.log('nenhuma movimentacao registrada');
    return;
  }
  for (const mov of historico) {
    console.log(
      `#${String(mov.id).padStart(3)} ${mov.tipo.padEnd(8)} ${String(mov.codigoProduto).padEnd(7)} ${String(mov.quantidade).padStart(5)}  ${String(mov.saldoAnterior).padStart(5)} -> ${String(mov.saldoFinal).padEnd(5)}  ${mov.descricao}`,
    );
  }
}

/** Executa um comando ja dividido em tokens. */
function executar(estoque: Estoque, tokens: string[]): void {
  const [comando, ...resto] = tokens;

  switch (comando) {
    case 'entrada':
    case 'saida': {
      const [codigoTexto, quantidadeTexto] = resto;
      if (codigoTexto === undefined || quantidadeTexto === undefined) {
        console.error(`uso: ${comando} <codigo> <quantidade>`);
        return;
      }
      if (!/^-?\d+$/.test(codigoTexto) || !/^-?\d+$/.test(quantidadeTexto)) {
        console.error(`codigo ou quantidade invalidos: ${codigoTexto} ${quantidadeTexto}`);
        return;
      }
      const codigo = Number(codigoTexto);
      const quantidade = Number(quantidadeTexto);

      // `comando` ja foi limitado a 'entrada' | 'saida' pelo `case`.
      const { movimentacao, saldoFinal } = estoque.registrar(
        comando,
        codigo,
        quantidade,
      );
      console.log(
        `#${String(movimentacao.id)} ${movimentacao.descricao} | saldo final: ${String(saldoFinal)}`,
      );
      return;
    }

    case 'saldo': {
      const [codigoTexto, extra] = resto;
      if (codigoTexto === undefined || extra !== undefined) {
        console.error('uso: saldo <codigo>');
        return;
      }
      if (!/^\d+$/.test(codigoTexto)) {
        console.error(`codigo invalido: ${codigoTexto}`);
        return;
      }
      const codigo = Number(codigoTexto);
      console.log(
        `${String(codigo)} ${estoque.descricaoDe(codigo) ?? '(desconhecido)'}: ${String(estoque.saldo(codigo))}`,
      );
      return;
    }

    case 'listar':
      listar(estoque);
      return;

    case 'historico':
      mostrarHistorico(estoque);
      return;

    case 'ajuda':
      console.log(AJUDA);
      return;

    default:
      console.error(`comando desconhecido: ${String(comando)}`);
      console.error(AJUDA);
  }
}

try {
  const produtos = await carregarProdutos(values.arquivo);
  const estoque = new Estoque(produtos);

  if (values.ajuda) {
    console.log(AJUDA);
    process.exit(0);
  }

  console.log(`Estoque carregado: ${String(produtos.length)} produtos`);
  console.log(AJUDA);
  console.log('');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  // Um REPL precisa ser encerrado explicitamente, senao o processo nao sai.
  process.on('SIGINT', () => {
    rl.close();
  });

  for await (const linha of rl) {
    const tokens = linha.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      continue;
    }
    if (tokens[0] === 'sair') {
      break;
    }
    try {
      executar(estoque, tokens);
    } catch (erro) {
      console.error(
        'Erro: ' + (erro instanceof ErroDominio ? erro.message : String(erro)),
      );
    }
  }

  rl.close();
  console.log('');
  console.log('Encerrado. Saldo final:');
  listar(estoque);
} catch (erro) {
  if (erro instanceof ErroDominio) {
    console.error('Erro: ' + erro.message);
    process.exit(1);
  }
  throw erro;
}
