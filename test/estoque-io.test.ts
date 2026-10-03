import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ErroEntradaInvalida } from '../src/shared/erros.ts';
import { carregarProdutos } from '../src/estoque/io.ts';
import { Estoque } from '../src/estoque/estoque.ts';

describe('carregarProdutos', () => {
  it('le o arquivo padrao do projeto', async () => {
    const produtos = await carregarProdutos();
    assert.equal(produtos.length, 5);
    assert.deepEqual(produtos[0], {
      codigo: 101,
      descricao: 'Caneta Azul',
      estoque: 150,
    });
  });

  it('preserva acentuacao do enunciado', async () => {
    const produtos = await carregarProdutos();
    const descricoes = produtos.map((p) => p.descricao);
    assert.ok(descricoes.includes('Caderno Universitário'));
    assert.ok(descricoes.includes('Lápis Preto HB'));
    assert.ok(descricoes.includes('Marcador de Texto Amarelo'));
  });

  it('o arquivo do projeto soma 835 itens', async () => {
    const estoque = new Estoque(await carregarProdutos());
    assert.equal(estoque.totalEmItens, 835);
  });

  it('rejeita arquivo inexistente', async () => {
    await assert.rejects(
      () => carregarProdutos('data/nao-existe.json'),
      ErroEntradaInvalida,
    );
  });

  it('rejeita chave ausente', async () => {
    await assert.rejects(() => carregarProdutos('package.json'), ErroEntradaInvalida);
  });

  it('rejeita codigo duplicado', async () => {
    await assert.rejects(
      () => carregarProdutos('test/fixtures/estoque-duplicado.json'),
      (erro: unknown) => {
        assert.ok(erro instanceof ErroEntradaInvalida);
        assert.match(erro.message, /duplicado/);
        return true;
      },
    );
  });

  it('rejeita estoque negativo', async () => {
    await assert.rejects(
      () => carregarProdutos('test/fixtures/estoque-negativo.json'),
      ErroEntradaInvalida,
    );
  });

  it('rejeita descricao vazia', async () => {
    await assert.rejects(
      () => carregarProdutos('test/fixtures/estoque-sem-descricao.json'),
      ErroEntradaInvalida,
    );
  });
});
