/**
 * Exercicio 1: comissao de vendedores.
 *
 * Regras do enunciado, aplicadas por venda:
 *   - abaixo de R$ 100,00  -> sem comissao
 *   - abaixo de R$ 500,00  -> 1%
 *   - a partir de R$ 500,00 -> 5%
 *
 * Este modulo e pura: nao importa nada de Node, nao le arquivos e nao
 * imprime. Recebe dados, devolve dados.
 */

import {
  type Centavos,
  aplicarTaxa,
  paraCentavos,
} from '../shared/money.ts';

/** Uma venda como aparece no JSON de entrada. */
export interface Venda {
  readonly vendedor: string;
  readonly valor: number;
}

/** Comissao acumulada de um vendedor. */
export interface ResumoVendedor {
  readonly vendedor: string;
  readonly totalVendas: number;
  readonly totalVendido: Centavos;
  readonly totalComissao: Centavos;
}

const LIMITE_ISENCAO = paraCentavos(100);
const LIMITE_TAXA_MENOR = paraCentavos(500);

const TAXA_ISENTA = 0;
const TAXA_MENOR = 0.01;
const TAXA_MAIOR = 0.05;

/**
 * Percentual aplicado a uma venda, em fracao.
 *
 * Os limites sao inclusivos na faixa superior: exatamente R$ 500,00 ja e
 * 5%, e exatamente R$ 100,00 ja gera 1%.
 */
export function taxaDaVenda(valor: Centavos): number {
  if (valor < LIMITE_ISENCAO) {
    return TAXA_ISENTA;
  }
  if (valor < LIMITE_TAXA_MENOR) {
    return TAXA_MENOR;
  }
  return TAXA_MAIOR;
}

/**
 * Comissao de uma venda que ja esta em centavos.
 *
 * Funcao interna: evita que quem ja tem centavos converta de novo.
 */
export function comissaoDe(centavos: Centavos): Centavos {
  return centavos < LIMITE_ISENCAO
    ? 0
    : aplicarTaxa(centavos, taxaDaVenda(centavos));
}

/** Comissao de uma unica venda informada em reais. */
export function calcularComissao(valor: number | string): Centavos {
  return comissaoDe(paraCentavos(valor));
}

/**
 * Agrega as vendas por vendedor.
 *
 * A comissao e arredondada por venda, nao sobre o total do vendedor: o
 * enunciado define a regra "para cada venda", entao cada uma recebe o
 * tratamento completo antes de ser somada.
 *
 * A ordem de saida segue a primeira aparição no JSON, o que torna a
 * saida do CLI estavel e facil de conferir.
 */
export function agregarPorVendedor(vendas: readonly Venda[]): ResumoVendedor[] {
  const resumos = new Map<string, ResumoVendedor>();

  for (const venda of vendas) {
    const centavos = paraCentavos(venda.valor);
    const comissao = comissaoDe(centavos);
    const anterior = resumos.get(venda.vendedor);

    resumos.set(venda.vendedor, {
      vendedor: venda.vendedor,
      totalVendas: anterior ? anterior.totalVendas + 1 : 1,
      totalVendido: anterior ? anterior.totalVendido + centavos : centavos,
      totalComissao: anterior ? anterior.totalComissao + comissao : comissao,
    });
  }

  return [...resumos.values()];
}

/** Soma as comissoes de todos os vendedores. */
export function totalGeral(resumos: readonly ResumoVendedor[]): Centavos {
  return resumos.reduce((soma, resumo) => soma + resumo.totalComissao, 0);
}
