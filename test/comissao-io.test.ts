import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ErroEntradaInvalida } from '../src/shared/erros.ts';
import { carregarVendas } from '../src/comissao/io.ts';

describe('carregarVendas', () => {
  it('le o arquivo padrao do projeto', async () => {
    const vendas = await carregarVendas();
    assert.equal(vendas.length, 36);
    assert.equal(vendas[0]?.vendedor, 'João Silva');
  });

  it('preserva acentuacao do enunciado', async () => {
    const vendas = await carregarVendas();
    const nomes = new Set(vendas.map((v) => v.vendedor));
    assert.deepEqual(
      [...nomes].sort(),
      ['Ana Lima', 'Carlos Oliveira', 'João Silva', 'Maria Souza'],
    );
  });

  it('rejeita arquivo inexistente', async () => {
    await assert.rejects(
      () => carregarVendas('data/nao-existe.json'),
      ErroEntradaInvalida,
    );
  });

  it('rejeita JSON invalido', async () => {
    await assert.rejects(() => carregarVendas('package.json'), (erro: unknown) => {
      // package.json e JSON valido, mas nao tem a chave "vendas".
      assert.ok(erro instanceof ErroEntradaInvalida);
      assert.match(erro.message, /"vendas"/);
      return true;
    });
  });

  it('rejeita vendedor ausente ou vazio', async () => {
    // Arquivo temporario em disco via fixture do proprio repo.
    await assert.rejects(
      () => carregarVendas('test/fixtures/vendas-sem-vendedor.json'),
      ErroEntradaInvalida,
    );
  });

  it('rejeita valor nao numerico', async () => {
    await assert.rejects(
      () => carregarVendas('test/fixtures/vendas-valor-invalido.json'),
      (erro: unknown) => {
        assert.ok(erro instanceof ErroEntradaInvalida);
        assert.match(erro.message, /valor/);
        return true;
      },
    );
  });

  it('rejeita valor negativo', async () => {
    await assert.rejects(
      () => carregarVendas('test/fixtures/vendas-negativa.json'),
      (erro: unknown) => {
        assert.ok(erro instanceof ErroEntradaInvalida);
        assert.match(erro.message, /negativo/);
        return true;
      },
    );
  });
});
