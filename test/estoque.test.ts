import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ErroEntradaInvalida,
  ErroRegraDeNegocio,
} from '../src/shared/erros.ts';
import { Estoque } from '../src/estoque/estoque.ts';

const produtos = [
  { codigo: 101, descricao: 'Caneta Azul', estoque: 150 },
  { codigo: 102, descricao: 'Caderno Universitário', estoque: 75 },
];

const novoEstoque = () => new Estoque(produtos);

describe('cadastro', () => {
  it('mantem os saldos iniciais', () => {
    const estoque = novoEstoque();
    assert.equal(estoque.saldo(101), 150);
    assert.equal(estoque.saldo(102), 75);
    assert.equal(estoque.totalEmItens, 225);
  });

  it('rejeita codigo duplicado', () => {
    assert.throws(
      () => new Estoque([...produtos, { codigo: 101, descricao: 'X', estoque: 1 }]),
      ErroEntradaInvalida,
    );
  });

  it('rejeita estoque negativo ou fracionario', () => {
    assert.throws(
      () => new Estoque([{ codigo: 1, descricao: 'X', estoque: -1 }]),
      ErroEntradaInvalida,
    );
    assert.throws(
      () => new Estoque([{ codigo: 1, descricao: 'X', estoque: 1.5 }]),
      ErroEntradaInvalida,
    );
  });

  it('consulta de produto inexistente lanca erro de negocio', () => {
    assert.throws(() => novoEstoque().saldo(999), ErroRegraDeNegocio);
  });
});

describe('entrada', () => {
  it('soma ao saldo e devolve o saldo final', () => {
    const { movimentacao, saldoFinal } = novoEstoque().registrar('entrada', 101, 50);
    assert.equal(saldoFinal, 200);
    assert.equal(movimentacao.saldoAnterior, 150);
    assert.equal(movimentacao.saldoFinal, 200);
  });

  it('atribui identificador unico e sequencial', () => {
    const estoque = novoEstoque();
    const a = estoque.registrar('entrada', 101, 1);
    const b = estoque.registrar('saida', 101, 1);
    const c = estoque.registrar('entrada', 102, 1);
    assert.equal(a.movimentacao.id, 1);
    assert.equal(b.movimentacao.id, 2);
    assert.equal(c.movimentacao.id, 3);
  });

  it('gera descricao quando nenhuma e informada', () => {
    const { movimentacao } = novoEstoque().registrar('entrada', 101, 50);
    assert.equal(movimentacao.descricao, 'entrada de 50 Caneta Azul');
  });

  it('usa a descricao customizada quando informada', () => {
    const { movimentacao } = novoEstoque().registrar(
      'entrada',
      101,
      50,
      'compra nota fiscal 1234',
    );
    assert.equal(movimentacao.descricao, 'compra nota fiscal 1234');
  });
});

describe('saida', () => {
  it('subtrai do saldo', () => {
    const { saldoFinal } = novoEstoque().registrar('saida', 101, 20);
    assert.equal(saldoFinal, 130);
  });

  it('permite zerar o estoque', () => {
    const estoque = novoEstoque();
    estoque.registrar('saida', 102, 25);
    const { saldoFinal } = estoque.registrar('saida', 102, 50);
    assert.equal(saldoFinal, 0);
  });

  it('rejeita saida maior que o saldo', () => {
    assert.throws(() => novoEstoque().registrar('saida', 101, 151), ErroRegraDeNegocio);
  });

  it('nao altera o saldo quando a saida e rejeitada', () => {
    const estoque = novoEstoque();
    assert.throws(() => estoque.registrar('saida', 101, 500), ErroRegraDeNegocio);
    assert.equal(estoque.saldo(101), 150);
    // A movimentacao rejeitada nao entra no historico.
    assert.equal(estoque.historico.length, 0);
  });
});

describe('validacao de entrada', () => {
  it('rejeita quantidade zero, negativa ou fracionaria', () => {
    const estoque = novoEstoque();
    assert.throws(() => estoque.registrar('entrada', 101, 0), ErroEntradaInvalida);
    assert.throws(() => estoque.registrar('entrada', 101, -5), ErroEntradaInvalida);
    assert.throws(() => estoque.registrar('entrada', 101, 1.5), ErroEntradaInvalida);
  });

  it('rejeita tipo desconhecido', () => {
    assert.throws(
      () => novoEstoque().registrar('transferencia', 101, 1),
      ErroEntradaInvalida,
    );
  });
});

describe('consultas', () => {
  it('devolve descricao e saldo', () => {
    const estoque = novoEstoque();
    assert.equal(estoque.descricaoDe(102), 'Caderno Universitário');
    assert.equal(estoque.descricaoDe(999), undefined);
  });

  it('listar reflete o saldo atual', () => {
    const estoque = novoEstoque();
    estoque.registrar('entrada', 101, 50);
    const lista = estoque.listar();
    assert.deepEqual(lista[0], {
      codigo: 101,
      descricao: 'Caneta Azul',
      estoque: 200,
    });
    assert.equal(lista.length, 2);
  });

  it('historico cresce a cada lancamento', () => {
    const estoque = novoEstoque();
    assert.equal(estoque.historico.length, 0);
    estoque.registrar('entrada', 101, 10);
    estoque.registrar('saida', 101, 4);
    const historico = estoque.historico;
    assert.equal(historico.length, 2);
    const primeira = historico[0];
    const segunda = historico[1];
    assert.ok(primeira);
    assert.ok(segunda);
    assert.equal(primeira.tipo, 'entrada');
    assert.equal(segunda.tipo, 'saida');
    assert.equal(segunda.saldoFinal, 156);
  });

  it('historico e uma copia, nao a referencia interna', () => {
    const estoque = novoEstoque();
    estoque.registrar('entrada', 101, 1);
    const copia: unknown[] = [...estoque.historico];
    copia.length = 0;
    assert.equal(estoque.historico.length, 1);
  });
});
