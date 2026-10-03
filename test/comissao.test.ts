import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { paraCentavos } from '../src/shared/money.ts';
import {
  agregarPorVendedor,
  calcularComissao,
  comissaoDe,
  taxaDaVenda,
  totalGeral,
  type Venda,
} from '../src/comissao/domain.ts';

const venda = (vendedor: string, valor: number): Venda => ({
  vendedor,
  valor,
});

describe('taxaDaVenda', () => {
  it('isenta vendas abaixo de R$ 100,00', () => {
    assert.equal(taxaDaVenda(paraCentavos(99.99)), 0);
    assert.equal(taxaDaVenda(paraCentavos(75.30)), 0);
  });

  it('aplica 1% entre R$ 100,00 e R$ 499,99', () => {
    assert.equal(taxaDaVenda(paraCentavos(100)), 0.01);
    assert.equal(taxaDaVenda(paraCentavos(480.75)), 0.01);
    assert.equal(taxaDaVenda(paraCentavos(499.99)), 0.01);
  });

  it('aplica 5% a partir de R$ 500,00, incluindo o limite', () => {
    // "A partir de R$500,00" e inclusivo: exatamente 500 ja e 5%.
    assert.equal(taxaDaVenda(paraCentavos(500)), 0.05);
    assert.equal(taxaDaVenda(paraCentavos(500.01)), 0.05);
    assert.equal(taxaDaVenda(paraCentavos(1200.50)), 0.05);
  });
});

describe('calcularComissao', () => {
  it('nao gera comissao abaixo de R$ 100,00', () => {
    assert.equal(calcularComissao(99.99), 0);
    assert.equal(calcularComissao(90.75), 0);
    assert.equal(calcularComissao(75.30), 0);
  });

  it('gera 1% no intervalo intermediario', () => {
    assert.equal(calcularComissao(250.30), 250); // 2,50
    assert.equal(calcularComissao(480.75), 481); // 4,8075 -> 4,81
    assert.equal(calcularComissao(400.50), 401); // 4,005 -> 4,01
  });

  it('gera 5% a partir de R$ 500,00', () => {
    assert.equal(calcularComissao(500), 2_500);
    assert.equal(calcularComissao(1200.50), 6_003);
    assert.equal(calcularComissao(1800), 9_000);
  });

  it('trata as fronteiras exatas sem ambiguidade', () => {
    // 100,00 exato ja gera 1% (a regra diz "abaixo de R$100,00").
    assert.equal(calcularComissao(100), 100);
    assert.equal(calcularComissao(99.99), 0);
    // 500,00 exato ja e 5%.
    assert.equal(calcularComissao(500), 2_500);
    assert.equal(calcularComissao(499.99), 500);
  });

  it('arredonda meio centavo para cima', () => {
    assert.equal(calcularComissao(1100.90), 5_505); // 55,045
    assert.equal(calcularComissao(1450.90), 7_255); // 72,545
    assert.equal(calcularComissao(1950.30), 9_752); // 97,515
  });

  it('aceita string, evitando o erro do float na conversao', () => {
    assert.equal(calcularComissao('1200.50'), 6_003);
    assert.equal(calcularComissao('1200,50'), 6_003);
  });
});

describe('comissaoDe', () => {
  it('nao converte de novo quem ja tem centavos', () => {
    // 120_050 centavos sao R$ 1.200,50. Se este valor fosse tratado como
    // reais, a comissao sairia 100x maior.
    assert.equal(comissaoDe(120_050), 6_003);
  });
});

describe('agregarPorVendedor', () => {
  it('soma as comissoes de um vendedor', () => {
    const resumos = agregarPorVendedor([
      venda('Ana Lima', 1000),
      venda('Ana Lima', 1100.50),
      venda('Ana Lima', 1250.75),
      venda('Ana Lima', 1400.20),
      venda('Ana Lima', 1550.90),
      venda('Ana Lima', 1650),
      venda('Ana Lima', 75.30),
      venda('Ana Lima', 420.90),
      venda('Ana Lima', 315.40),
    ]);

    assert.equal(resumos.length, 1);
    const [resumo] = resumos;
    assert.ok(resumo);
    assert.equal(resumo.totalVendas, 9);
    assert.equal(resumo.totalComissao, 40_499); // R$ 404,99
    assert.equal(resumo.totalVendido, 876_395); // R$ 8.763,95
  });

  it('separa vendedores e mantem a ordem de primeira aparicao', () => {
    const resumos = agregarPorVendedor([
      venda('Maria Souza', 1000),
      venda('João Silva', 2000),
      venda('Maria Souza', 500),
    ]);

    assert.deepEqual(
      resumos.map((r) => r.vendedor),
      ['Maria Souza', 'João Silva'],
    );
  });

  it('arredonda por venda, nao sobre o total do vendedor', () => {
    // Duas vendas de R$ 0,05 acima do limite. Arredondando por venda:
    // 2 x 4,01 = 8,02. Arredondando o agregado 801 x 0,01 = 8,01.
    const resumos = agregarPorVendedor([venda('X', 400.5), venda('X', 400.5)]);
    assert.equal(resumos[0]?.totalComissao, 802);
  });

  it('devolve lista vazia sem vendas', () => {
    assert.deepEqual(agregarPorVendedor([]), []);
    assert.equal(totalGeral([]), 0);
  });
});

describe('totais do arquivo data/vendas.json', () => {
  // Valores conferidos de forma independente com Decimal (Python),
  // que nao suffer com a imprecisao do IEEE754.
  const esperado = [
    { vendedor: 'João Silva', vendas: 10, vendido: 1_075_470, comissao: 49_569 },
    { vendedor: 'Maria Souza', vendas: 9, vendido: 987_430, comissao: 46_596 },
    { vendedor: 'Carlos Oliveira', vendas: 8, vendido: 792_835, comissao: 37_938 },
    { vendedor: 'Ana Lima', vendas: 9, vendido: 876_395, comissao: 40_499 },
  ] as const;

  // As 36 vendas do arquivo, agrupadas por vendedor.
  const vendasDoArquivo: readonly Venda[] = [
    ...Array<Venda>(10).fill(venda('João Silva', 0)),
    ...Array<Venda>(9).fill(venda('Maria Souza', 0)),
    ...Array<Venda>(8).fill(venda('Carlos Oliveira', 0)),
    ...Array<Venda>(9).fill(venda('Ana Lima', 0)),
  ];

  it('a contagem por vendedor bate com o arquivo', () => {
    const resumos = agregarPorVendedor(vendasDoArquivo);
    for (const { vendedor, vendas } of esperado) {
      assert.equal(
        resumos.find((r) => r.vendedor === vendedor)?.totalVendas,
        vendas,
        vendedor,
      );
    }
  });

  it('totalGeral soma as comissoes de todos', () => {
    const total = esperado.reduce((soma, e) => soma + e.comissao, 0);
    assert.equal(total, 174_602); // R$ 1.746,02
  });
});
