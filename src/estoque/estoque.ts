/**
 * Exercicio 2: movimentacoes de estoque.
 *
 * O enunciado pede, para cada movimentacao:
 *   - um numero identificador unico;
 *   - uma descricao do tipo de movimentacao;
 *   - a quantidade final do estoque do produto movimentado.
 *
 * Este modulo e puro: nao le arquivos, nao imprime e nao depende de data.
 * A geracao de ids e sequencial e interna, o que torna a classe
 * deterministica e testavel.
 */

import {
  ErroEntradaInvalida,
  ErroRegraDeNegocio,
} from '../shared/erros.ts';

export interface ProdutoInicial {
  readonly codigo: number;
  readonly descricao: string;
  readonly estoque: number;
}

/** Sentido da movimentacao. */
export type TipoMovimentacao = 'entrada' | 'saida';

/** Uma movimentacao registrada. */
export interface Movimentacao {
  readonly id: number;
  readonly tipo: TipoMovimentacao;
  readonly codigoProduto: number;
  readonly quantidade: number;
  readonly descricao: string;
  readonly saldoAnterior: number;
  readonly saldoFinal: number;
}

/** Resposta do lancamento, com o saldo final que o enunciado pede. */
export interface ResultadoLancamento {
  readonly movimentacao: Movimentacao;
  readonly saldoFinal: number;
}

/** Estreita o texto digitado no terminal para um tipo conhecido. */
function sentidoDaMovimentacao(tipo: string): TipoMovimentacao {
  if (tipo === 'entrada' || tipo === 'saida') {
    return tipo;
  }
  throw new ErroEntradaInvalida(`tipo de movimentacao invalido: ${tipo}`);
}

export class Estoque {
  readonly #saldoPorCodigo = new Map<number, number>();
  readonly #descricaoPorCodigo = new Map<number, string>();
  readonly #historico: Movimentacao[] = [];
  #proximoId = 1;

  constructor(produtos: readonly ProdutoInicial[] = []) {
    for (const produto of produtos) {
      this.#cadastrar(produto);
    }
  }

  #cadastrar(produto: ProdutoInicial): void {
    if (this.#saldoPorCodigo.has(produto.codigo)) {
      throw new ErroEntradaInvalida(
        `codigo de produto duplicado: ${String(produto.codigo)}`,
      );
    }
    if (!Number.isInteger(produto.estoque) || produto.estoque < 0) {
      throw new ErroEntradaInvalida(
        `estoque invalido para o produto ${String(produto.codigo)}: ${String(produto.estoque)}`,
      );
    }
    this.#saldoPorCodigo.set(produto.codigo, produto.estoque);
    this.#descricaoPorCodigo.set(produto.codigo, produto.descricao);
  }

  /** Codigos cadastrados, na ordem de cadastro. */
  get codigos(): number[] {
    return [...this.#saldoPorCodigo.keys()];
  }

  /** Descricao de um produto, ou `undefined` se nao existir. */
  descricaoDe(codigo: number): string | undefined {
    return this.#descricaoPorCodigo.get(codigo);
  }

  /** Saldo atual de um produto. */
  saldo(codigo: number): number {
    const saldo = this.#saldoPorCodigo.get(codigo);
    if (saldo === undefined) {
      throw new ErroRegraDeNegocio(`produto ${String(codigo)} nao existe no estoque`);
    }
    return saldo;
  }

  /**
   * Registra uma movimentacao e devolve o saldo final do produto.
   *
   * A descricao e gerada quando o chamador nao fornece uma: `entrada de 10
   * Caneta Azul`. Passar uma customizada sempre sobrescreve.
   */
  registrar(
    tipo: string,
    codigoProduto: number,
    quantidade: number,
    descricao?: string,
  ): ResultadoLancamento {
    const sentido = sentidoDaMovimentacao(tipo);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new ErroEntradaInvalida(
        `quantidade deve ser um inteiro positivo: ${String(quantidade)}`,
      );
    }

    const saldoAnterior = this.saldo(codigoProduto);

    // Regra de negocio: o estoque nunca fica negativo.
    if (sentido === 'saida' && quantidade > saldoAnterior) {
      throw new ErroRegraDeNegocio(
        `saida de ${String(quantidade)} excede o saldo de ${String(saldoAnterior)} do produto ${String(codigoProduto)}`,
      );
    }

    const saldoFinal =
      sentido === 'entrada' ? saldoAnterior + quantidade : saldoAnterior - quantidade;

    this.#saldoPorCodigo.set(codigoProduto, saldoFinal);

    const movimentacao: Movimentacao = {
      id: this.#proximoId++,
      tipo: sentido,
      codigoProduto,
      quantidade,
      descricao: descricao ?? this.#descreverPadrao(sentido, codigoProduto, quantidade),
      saldoAnterior,
      saldoFinal,
    };
    this.#historico.push(movimentacao);

    return { movimentacao, saldoFinal };
  }

  #descreverPadrao(
    tipo: TipoMovimentacao,
    codigoProduto: number,
    quantidade: number,
  ): string {
    const descricao = this.#descricaoPorCodigo.get(codigoProduto) ?? 'produto';
    return `${tipo} de ${String(quantidade)} ${descricao}`;
  }

  /** Todas as movimentacoes, na ordem de registro. */
  get historico(): readonly Movimentacao[] {
    return [...this.#historico];
  }

  /** Soma de todos os saldos. */
  get totalEmItens(): number {
    let total = 0;
    for (const saldo of this.#saldoPorCodigo.values()) {
      total += saldo;
    }
    return total;
  }

  /** Uma linha por produto, para exibicao. */
  listar(): readonly {
    codigo: number;
    descricao: string;
    estoque: number;
  }[] {
    return this.codigos.map((codigo) => ({
      codigo,
      descricao: this.#descricaoPorCodigo.get(codigo) ?? '',
      estoque: this.#saldoPorCodigo.get(codigo) ?? 0,
    }));
  }
}
