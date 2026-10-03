import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  aplicarTaxa,
  arredondarHalfUp,
  formatarBRL,
  paraCentavos,
} from '../src/shared/money.ts';

describe('paraCentavos', () => {
  it('converte reais por numero sem perder precisao', () => {
    assert.equal(paraCentavos(1200.5), 120_050);
    assert.equal(paraCentavos(480.75), 48_075);
  });

  it('converte pela string, evitando o erro do float', () => {
    // 1200.50 * 100 em float vale 120049.99999999999.
    assert.equal(paraCentavos('1200.50'), 120_050);
    assert.equal(paraCentavos('0.07'), 7);
  });

  it('aceita virgula como separador decimal', () => {
    assert.equal(paraCentavos('1200,50'), 120_050);
  });

  it('aceita notacao brasileira com ponto de milhar', () => {
    assert.equal(paraCentavos('1.000,00'), 100_000);
    assert.equal(paraCentavos('12.345.678,90'), 1_234_567_890);
  });

  it('rejeita milhar misturado com decimal de ponto', () => {
    // "1.000.00" e ambiguo demais para ser lido como quantia.
    assert.throws(() => paraCentavos('1.000.00'), RangeError);
  });

  it('completa centavos ausentes', () => {
    assert.equal(paraCentavos('12.5'), 1_250);
    assert.equal(paraCentavos('7'), 700);
  });

  it('preserva o sinal', () => {
    assert.equal(paraCentavos('-45.90'), -4_590);
  });

  it('rejeita entradas que nao sao quantias', () => {
    assert.throws(() => paraCentavos('abc'), RangeError);
    assert.throws(() => paraCentavos('12.345'), RangeError);
    assert.throws(() => paraCentavos(''), RangeError);
    assert.throws(() => paraCentavos(Number.NaN), RangeError);
    assert.throws(() => paraCentavos(Number.POSITIVE_INFINITY), RangeError);
  });
});

describe('arredondarHalfUp', () => {
  it('arredonda meio para cima em valores exatos', () => {
    // Literais como 55.045 nao sao usados aqui de proposito: em IEEE754 o
    // literal vale 55.044999999999998579, entao o resultado seria 55. O que
    // importa e o produto `centavos * taxa`, que cai exatamente em .5.
    assert.equal(arredondarHalfUp(0.5), 1);
    assert.equal(arredondarHalfUp(1.5), 2);
    assert.equal(arredondarHalfUp(2.5), 3);
  });

  it('mantem inteiros intactos', () => {
    assert.equal(arredondarHalfUp(5505), 5505);
  });

  it('desvia do zero de forma simetrica', () => {
    assert.equal(arredondarHalfUp(-0.5), -1);
    assert.equal(arredondarHalfUp(-1.5), -2);
  });
});

describe('aplicarTaxa', () => {
  const casos: readonly [number, number, number][] = [
    // centavos, taxa, centavos esperados. Todos caem em empate de meio
    // centavo, onde o float depende do arredondamento para o lado certo.
    [110_090, 0.05, 5_505], // 55.045
    [145_090, 0.05, 7_255], // 72.545
    [40_050, 0.01, 401], // 4.005
    [195_030, 0.05, 9_752], // 97.515
    [110_050, 0.05, 5_503], // 55.025
  ];

  for (const [centavos, taxa, esperado] of casos) {
    it(`${String(centavos)} centavos a ${String(taxa * 100)}% -> ${String(esperado)}`, () => {
      assert.equal(aplicarTaxa(centavos, taxa), esperado);
    });
  }

  it('mantem o total exato quando as comissoes sao somadas', () => {
    // Aqui esta a justificativa real dos centavos inteiros. Calcular cada
    // comissao e somar em float acumula erro: o total sai 537,74 em vez de
    // 537,76. O problema nao e o arredondamento de uma venda isolada (que o
    // float acerta por sorte nestes casos), e a soma de muitas.
    const centavos = [
      120_050, 95_075, 180_000, 140_030, 110_090, 155_000, 170_080, 25_030,
      48_075, 32_040,
    ];

    const exato = centavos.reduce((soma, c) => soma + aplicarTaxa(c, 0.05), 0);

    const ingenua = Math.round(
      centavos.reduce((soma, c) => soma + c * 0.05, 0),
    );

    assert.equal(exato, 53_776);
    assert.equal(ingenua, 53_774);
    assert.notEqual(exato, ingenua);
  });
});

describe('formatarBRL', () => {
  it('usa ponto para milhar e virgula para decimal', () => {
    assert.equal(formatarBRL(120_050), '1.200,50');
    assert.equal(formatarBRL(493_19), '493,19');
    assert.equal(formatarBRL(100), '1,00');
    assert.equal(formatarBRL(5), '0,05');
  });

  it('formata milhar acima de mil reais', () => {
    assert.equal(formatarBRL(1_075_470), '10.754,70');
    assert.equal(formatarBRL(123_456_789), '1.234.567,89');
  });

  it('sinal negativo na frente', () => {
    assert.equal(formatarBRL(-4_590), '-45,90');
  });
});
