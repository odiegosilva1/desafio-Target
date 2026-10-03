/**
 * Leitura e validacao do JSON de estoque.
 *
 * Fronteira de IO do exercicio 2.
 */

import { readFile } from 'node:fs/promises';

import { ErroEntradaInvalida } from '../shared/erros.ts';
import type { ProdutoInicial } from './estoque.ts';

export const CAMINHO_PADRAO = 'data/estoque.json';

interface ProdutoBruto {
  codigoProduto: unknown;
  descricaoProduto: unknown;
  estoque: unknown;
}

function validar(registros: readonly unknown[]): ProdutoInicial[] {
  const vistos = new Set<number>();

  return registros.map((registro, indice) => {
    if (typeof registro !== 'object' || registro === null) {
      throw new ErroEntradaInvalida(
        `produto na posicao ${String(indice)} nao e um objeto`,
      );
    }

    const { codigoProduto, descricaoProduto, estoque } =
      registro as ProdutoBruto;

    if (typeof codigoProduto !== 'number' || !Number.isInteger(codigoProduto)) {
      throw new ErroEntradaInvalida(
        `produto na posicao ${String(indice)} tem "codigoProduto" invalido`,
      );
    }
    if (vistos.has(codigoProduto)) {
      throw new ErroEntradaInvalida(
        `codigo de produto duplicado: ${String(codigoProduto)}`,
      );
    }
    vistos.add(codigoProduto);

    if (
      typeof descricaoProduto !== 'string' ||
      descricaoProduto.trim() === ''
    ) {
      throw new ErroEntradaInvalida(
        `produto ${String(codigoProduto)} tem "descricaoProduto" invalida`,
      );
    }

    if (typeof estoque !== 'number' || !Number.isInteger(estoque) || estoque < 0) {
      throw new ErroEntradaInvalida(
        `produto ${String(codigoProduto)} tem "estoque" invalido: ${String(estoque)}`,
      );
    }

    return {
      codigo: codigoProduto,
      descricao: descricaoProduto,
      estoque,
    };
  });
}

/** Le e valida o arquivo de estoque. */
export async function carregarProdutos(
  caminho: string = CAMINHO_PADRAO,
): Promise<ProdutoInicial[]> {
  let conteudo: string;
  try {
    conteudo = await readFile(caminho, 'utf8');
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    throw new ErroEntradaInvalida(
      `nao foi possivel ler ${caminho}: ${detalhe}`,
    );
  }

  let dados: unknown;
  try {
    dados = JSON.parse(conteudo);
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    throw new ErroEntradaInvalida(
      `${caminho} contem JSON invalido: ${detalhe}`,
    );
  }

  if (typeof dados !== 'object' || dados === null || !('estoque' in dados)) {
    throw new ErroEntradaInvalida(`${caminho} deve ter a chave "estoque"`);
  }

  const { estoque } = dados;
  if (!Array.isArray(estoque)) {
    throw new ErroEntradaInvalida(
      `"estoque" em ${caminho} deve ser uma lista`,
    );
  }

  return validar(estoque);
}
