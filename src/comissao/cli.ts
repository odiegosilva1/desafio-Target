#!/usr/bin/env node
/**
 * Exercicio 1: comissao de vendedores.
 *
 *   npm run comissao
 *   npm run comissao -- --arquivo data/vendas.json
 */

import { parseArgs } from 'node:util';

import { formatarBRL } from '../shared/money.ts';
import { ErroDominio } from '../shared/erros.ts';
import { agregarPorVendedor, totalGeral, type ResumoVendedor } from './domain.ts';
import { CAMINHO_PADRAO, carregarVendas } from './io.ts';

const { values } = parseArgs({
  options: {
    arquivo: { type: 'string', default: CAMINHO_PADRAO },
    ajuda: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.ajuda) {
  console.log(
    [
      'Uso: npm run comissao -- [--arquivo <caminho>]',
      '',
      'Le o JSON de vendas e calcula a comissao de cada vendedor.',
      '  --arquivo  caminho do JSON (padrao: ' + CAMINHO_PADRAO + ')',
    ].join('\n'),
  );
  process.exit(0);
}

function linha(resumo: ResumoVendedor): string {
  return [
    resumo.vendedor.padEnd(18),
    `${String(resumo.totalVendas).padStart(3)} vendas`,
    `R$ ${formatarBRL(resumo.totalVendido).padStart(12)}`,
    `R$ ${formatarBRL(resumo.totalComissao).padStart(10)}`,
  ].join('  ');
}

try {
  const vendas = await carregarVendas(values.arquivo);
  const resumos = agregarPorVendedor(vendas);
  const total = totalGeral(resumos);
  const totalVendas = resumos.reduce((soma, r) => soma + r.totalVendas, 0);

  console.log('Comissao por vendedor');
  console.log('='.repeat(58));
  for (const resumo of resumos) {
    console.log(linha(resumo));
  }
  console.log('='.repeat(58));
  console.log(
    linha({
      vendedor: 'TOTAL',
      totalVendas,
      totalVendido: resumos.reduce((soma, r) => soma + r.totalVendido, 0),
      totalComissao: total,
    }),
  );
} catch (erro) {
  if (erro instanceof ErroDominio) {
    console.error('Erro: ' + erro.message);
    process.exit(1);
  }
  throw erro;
}
