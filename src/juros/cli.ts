#!/usr/bin/env node
/**
 * Exercicio 3: multa por atraso de 2,5% ao dia.
 *
 *   npm run juros -- --valor 1000,00 --vencimento 2026-09-03
 *   npm run juros -- --valor 1000 --vencimento 2026-09-03 --hoje 2026-10-03
 *
 * Sem `--hoje`, usa a data corrente do sistema.
 */

import { parseArgs } from 'node:util';

import { ErroDominio } from '../shared/erros.ts';
import { formatarBRL } from '../shared/money.ts';
import {
  TAXA_DIARIA,
  calcularMulta,
  type DataISO,
} from './juros.ts';

const { values } = parseArgs({
  options: {
    valor: { type: 'string', short: 'v' },
    vencimento: { type: 'string' },
    hoje: { type: 'string' },
    ajuda: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: false,
});

const AJUDA = [
  'Uso:',
  '  npm run juros -- --valor <quantia> --vencimento <AAAA-MM-DD> [--hoje <AAAA-MM-DD>]',
  '',
  'Calcula a multa de 2,5% ao dia sobre um valor vencido.',
  '  --valor       quantia devida (aceita 1000,00 ou 1000.00)',
  '  --vencimento  data de vencimento',
  '  --hoje        data de referencia; padrao: a data de hoje',
].join('\n');

if (values.ajuda || values.valor === undefined || values.vencimento === undefined) {
  console.log(AJUDA);
  process.exit(values.ajuda ? 0 : 1);
}

try {
  // `Date` local convertida para o formato aceito pelo modulo, para nao
  // introduzir fuso horario entre o calendario do sistema e o calculo.
  const hoje: DataISO | Date =
    values.hoje ??
    new Date().toLocaleDateString('en-CA', {
      timeZone: 'UTC',
    });

  const resultado = calcularMulta(values.valor, values.vencimento, hoje);

  console.log(`Valor:      R$ ${formatarBRL(resultado.valorOriginal)}`);
  console.log(`Vencimento: ${values.vencimento}`);
  console.log(`Dias:       ${String(resultado.dias)}`);

  if (resultado.dias > 0) {
    console.log(
      `Taxa:       ${String(TAXA_DIARIA * 100).replace('.', ',')}% ao dia (simples)`,
    );
    console.log(`Multa:      R$ ${formatarBRL(resultado.multa)}`);
    console.log(`Total:      R$ ${formatarBRL(resultado.total)}`);
  } else if (resultado.dias === 0) {
    console.log('Multa:      R$ 0,00 (vence hoje)');
    console.log(`Total:      R$ ${formatarBRL(resultado.total)}`);
  } else {
    console.log('Multa:      R$ 0,00 (ainda nao vencido)');
    console.log(`Total:      R$ ${formatarBRL(resultado.total)}`);
  }
} catch (erro) {
  if (erro instanceof ErroDominio) {
    console.error('Erro: ' + erro.message);
    process.exit(1);
  }
  throw erro;
}
