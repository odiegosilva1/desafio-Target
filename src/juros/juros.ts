/**
 * Exercicio 3: multa por atraso.
 *
 * A partir de um valor e de uma data de vencimento, calcula o valor dos
 * juros na data de hoje, com multa de 2,5% ao dia.
 *
 * Premissa adotada: multa SIMPLES, pro-rata. `juros = valor * 0,025 * dias`.
 * Juros compostos exigiriam que o enunciado dissesse que a multa incide
 * sobre o proprio juro, o que nao ocorre em multa contratual.
 *
 * Este modulo e pura e determinista. "Hoje" chega por parametro: usar
 * `new Date()` dentro tornaria o teste dependente do dia em que roda.
 */

import { ErroEntradaInvalida } from '../shared/erros.ts';
import {
  type Centavos,
  aplicarTaxa,
  paraCentavos,
  paraReais,
} from '../shared/money.ts';

/** 2,5% ao dia. */
export const TAXA_DIARIA = 0.025;

export interface ResultadoMulta {
  readonly valorOriginal: Centavos;
  /** Dias decorridos. Negativo quando o titulo ainda nao venceu. */
  readonly dias: number;
  readonly multa: Centavos;
  readonly total: Centavos;
}

/** Data no formato `AAAA-MM-DD`, sem fuso, so para calculo. */
export type DataISO = string;

const PADRAO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Milissegundos por dia. Constante para nao depender de `Date`. */
const MS_POR_DIA = 86_400_000;

/**
 * Converte `AAAA-MM-DD` em milissegundos UTC.
 *
 * O sufixo `Z` forca a interpretacao como UTC. Sem ele, `new Date('2026-10-03')`
 * vira meia-noite local, e o calculo de dias passa a depender do fuso da
 * maquina que executa -- um fuso a oeste da UTC devolveria o dia anterior.
 */
export function paraInstante(data: DataISO): number {
  if (!PADRAO_DATA.test(data)) {
    throw new ErroEntradaInvalida(
      `data invalida, use o formato AAAA-MM-DD: "${data}"`,
    );
  }

  const instante = Date.parse(`${data}T00:00:00Z`);
  if (Number.isNaN(instante)) {
    throw new ErroEntradaInvalida(`data inexistente: "${data}"`);
  }

  // Rejeita 2026-02-30, que o Date.parse normaliza silenciosamente.
  const normalizada = new Date(instante).toISOString().slice(0, 10);
  if (normalizada !== data) {
    throw new ErroEntradaInvalida(`data inexistente: "${data}"`);
  }

  return instante;
}

/** Instante de uma data, a partir de `Date` ou de texto. */
function instanteDe(data: DataISO | Date): number {
  if (data instanceof Date) {
    if (Number.isNaN(data.getTime())) {
      throw new ErroEntradaInvalida('data invalida');
    }
    // Zera a hora: a multa conta dias corridos, nao horas.
    return Date.UTC(
      data.getUTCFullYear(),
      data.getUTCMonth(),
      data.getUTCDate(),
    );
  }
  return paraInstante(data);
}

/** Dias inteiros entre o vencimento e a data de referencia. */
export function diasAteVencimento(
  vencimento: DataISO,
  referencia: DataISO | Date,
): number {
  const diferenca = instanteDe(referencia) - instanteDe(vencimento);
  return Math.round(diferenca / MS_POR_DIA);
}

/**
 * Calcula a multa por atraso.
 *
 * Nao ha multa antes do vencimento: dias negativos ou zero produzem
 * multa zero e o total igual ao valor original.
 */
export function calcularMulta(
  valor: number | string,
  vencimento: DataISO,
  referencia: DataISO | Date,
): ResultadoMulta {
  const centavos = paraCentavos(valor);
  if (centavos < 0) {
    throw new ErroEntradaInvalida('valor nao pode ser negativo');
  }

  const dias = diasAteVencimento(vencimento, referencia);

  if (dias <= 0) {
    return {
      valorOriginal: centavos,
      dias,
      multa: 0,
      total: centavos,
    };
  }

  // `dias` inteiro elimina qualquer fracao de dia.
  const multa = aplicarTaxa(centavos, TAXA_DIARIA * dias);

  return {
    valorOriginal: centavos,
    dias,
    multa,
    total: centavos + multa,
  };
}

/** Atalho para quem so precisa do total corrigido. */
export function calcularTotal(
  valor: number | string,
  vencimento: DataISO,
  referencia: DataISO | Date,
): number {
  return paraReais(calcularMulta(valor, vencimento, referencia).total);
}
