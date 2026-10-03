/**
 * Leitura e validacao do JSON de vendas.
 *
 * Fronteira de IO: e o unico lugar do exercicio 1 que toca o sistema de
 * arquivos. Traduz bytes em dados validos e converte qualquer falha em
 * `ErroEntradaInvalida`, para que a CLI nunca precise lidar com excecao
 * crua do `JSON.parse`.
 */

import { readFile } from 'node:fs/promises';

import { ErroEntradaInvalida } from '../shared/erros.ts';
import { paraCentavos, type Centavos } from '../shared/money.ts';
import type { Venda } from './domain.ts';

export const CAMINHO_PADRAO = 'data/vendas.json';

interface VendaBruta {
  vendedor: unknown;
  valor: unknown;
}

/**
 * Valida a forma do JSON antes de devolver.
 *
 * Sem isso, `undefined` ou `null` no arquivo estourariam mais tarde, dentro
 * do calculo, com uma mensagem que nao aponta o registro culpado.
 */
function validar(registros: readonly unknown[]): Venda[] {
  return registros.map((registro, indice) => {
    if (typeof registro !== 'object' || registro === null) {
      throw new ErroEntradaInvalida(
        `venda na posicao ${String(indice)} nao e um objeto`,
      );
    }

    const { vendedor, valor } = registro as VendaBruta;

    if (typeof vendedor !== 'string' || vendedor.trim() === '') {
      throw new ErroEntradaInvalida(
        `venda na posicao ${String(indice)} tem "vendedor" invalido`,
      );
    }

    // `paraCentavos` valida o formato e normaliza string ou number.
    let centavos: Centavos;
    try {
      centavos = paraCentavos(valor as number | string);
    } catch {
      throw new ErroEntradaInvalida(
        `venda na posicao ${String(indice)} (${vendedor}) tem "valor" invalido: ${String(valor)}`,
      );
    }

    if (centavos < 0) {
      throw new ErroEntradaInvalida(
        `venda na posicao ${String(indice)} (${vendedor}) tem valor negativo`,
      );
    }

    return { vendedor, valor: centavos / 100 };
  });
}

/** Le e valida o arquivo de vendas. */
export async function carregarVendas(
  caminho: string = CAMINHO_PADRAO,
): Promise<Venda[]> {
  let conteudo: string;
  try {
    conteudo = await readFile(caminho, 'utf8');
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    throw new ErroEntradaInvalida(`nao foi possivel ler ${caminho}: ${detalhe}`);
  }

  let dados: unknown;
  try {
    dados = JSON.parse(conteudo);
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    throw new ErroEntradaInvalida(`${caminho} contem JSON invalido: ${detalhe}`);
  }

  if (typeof dados !== 'object' || dados === null || !('vendas' in dados)) {
    throw new ErroEntradaInvalida(`${caminho} deve ter a chave "vendas"`);
  }

  // O type guard acima ja estreitou o tipo; o assertion e o que torna isso
  // visivel para o leitor, mas o linter o considera redundante.
  const { vendas } = dados;
  if (!Array.isArray(vendas)) {
    throw new ErroEntradaInvalida(`"vendas" em ${caminho} deve ser uma lista`);
  }

  return validar(vendas);
}


