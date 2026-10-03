/**
 * Dinheiro em centavos inteiros.
 *
 * Nenhum calculo deste projeto passa por ponto flutuante. `1200.50 * 0.05`
 * em `number` devolve 60.024999999999994, e o arredondamento final mascara
 * meio centavo em casos恰好 de empate. Guardar centavos como `number`
 * inteiro elimina a classe do bug na raiz, em vez de tentando corrigir o
 * resultado depois.
 */

/** Quantia monetaria em centavos. Sempre inteiro. */
export type Centavos = number;

const CENTAVOS_POR_REAL = 100;

/**
 * Converte reais ( aceitos como `number` ou `string`) para centavos.
 *
 * Trabalha pela string para evitar que a imprecisao binaria entre antes da
 * multiplicacao: `"1200.50"` vira `120050` de forma exata, enquanto
 * `1200.50 * 100` passaria por `120049.99999999999`.
 */
export function paraCentavos(valor: number | string): Centavos {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) {
      throw new RangeError(`valor nao finito: ${String(valor)}`);
    }
    return paraCentavos(valor.toFixed(2));
  }

  const texto = valor.trim().replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(texto)) {
    throw new RangeError(`valor invalido: "${valor}"`);
  }

  const negativo = texto.startsWith('-');
  const [inteiro = '0', decimal = ''] = texto.replace('-', '').split('.');
  const fracao = decimal.padEnd(2, '0');

  const magnitude =
    Number.parseInt(inteiro, 10) * CENTAVOS_POR_REAL +
    Number.parseInt(fracao, 10);
  return negativo ? -magnitude : magnitude;
}

/** Arredonda meio para cima, com desvio do zero. */
export function arredondarHalfUp(valor: number): number {
  return valor < 0 ? -Math.round(-valor) : Math.round(valor);
}

/** Converte centavos para reais, arredondando meio para cima. */
export function paraReais(centavos: Centavos): number {
  return arredondarHalfUp(centavos) / CENTAVOS_POR_REAL;
}

/** Formata centavos no padrao brasileiro: `1.234,56`. */
export function formatarBRL(centavos: Centavos): string {
  const negativo = centavos < 0;
  const absoluto = Math.abs(arredondarHalfUp(centavos));
  const reais = Math.trunc(absoluto / CENTAVOS_POR_REAL);
  const resto = absoluto % CENTAVOS_POR_REAL;

  const inteiroFormatado = reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const texto = `${inteiroFormatado},${resto.toString().padStart(2, '0')}`;
  return negativo ? `-${texto}` : texto;
}

/**
 * Aplica uma taxa percentual a uma quantia, em centavos.
 *
 * `taxa` e uma fracao, nao um percentual: 5% e `0.05`. O resultado e
 * arredondado uma unica vez, no fim.
 */
export function aplicarTaxa(centavos: Centavos, taxa: number): Centavos {
  return arredondarHalfUp(centavos * taxa);
}
