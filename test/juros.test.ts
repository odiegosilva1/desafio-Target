import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ErroEntradaInvalida } from '../src/shared/erros.ts';
import {
  TAXA_DIARIA,
  calcularMulta,
  calcularTotal,
  diasAteVencimento,
  paraInstante,
} from '../src/juros/juros.ts';

/** Data de referencia fixa: mantem os testes independentes do dia da execucao. */
const HOJE = '2026-10-03';

describe('paraInstante', () => {
  it('interpreta a data no inicio do dia', () => {
    assert.equal(paraInstante('2026-10-03'), Date.UTC(2026, 9, 3));
  });

  it('rejeita formatos fora do padrao', () => {
    for (const invalida of ['03/10/2026', '2026-10', '03-10-2026', 'hoje']) {
      assert.throws(() => paraInstante(invalida), ErroEntradaInvalida, invalida);
    }
  });

  it('rejeita data que nao existe no calendario', () => {
    // O Date.parse normalizaria 30 de fevereiro para 1 de marco.
    assert.throws(() => paraInstante('2026-02-30'), ErroEntradaInvalida);
    assert.throws(() => paraInstante('2026-13-01'), ErroEntradaInvalida);
  });
});

describe('diasAteVencimento', () => {
  it('conta dias corridos', () => {
    assert.equal(diasAteVencimento('2026-09-03', HOJE), 30);
    assert.equal(diasAteVencimento('2026-10-03', HOJE), 0);
  });

  it('devolve negativo quando ainda nao venceu', () => {
    assert.equal(diasAteVencimento('2026-10-04', HOJE), -1);
    assert.equal(diasAteVencimento('2026-12-25', HOJE), -83);
  });

  it('atravessa a virada de ano', () => {
    assert.equal(diasAteVencimento('2025-10-03', HOJE), 365);
  });

  it('considera o ano bissexto', () => {
    // 2024 e bissexto: de 28/02 para 01/03 sao 2 dias.
    assert.equal(diasAteVencimento('2024-02-28', '2024-03-01'), 2);
    // 2026 nao e bissexto: sao 1 dia.
    assert.equal(diasAteVencimento('2026-02-28', '2026-03-01'), 1);
  });

  it('e independente do fuso horario do processo', () => {
    // Se a data fosse interpretada como meia-noite local, uma TZ a oeste da
    // UTC devolveria -1 dia. Com o sufixo Z o resultado e sempre o mesmo.
    const antes = process.env['TZ'];
    try {
      for (const tz of ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo']) {
        process.env['TZ'] = tz;
        assert.equal(
          diasAteVencimento('2026-09-03', HOJE),
          30,
          `fuso ${tz}`,
        );
      }
    } finally {
      if (antes === undefined) {
        delete process.env['TZ'];
      } else {
        process.env['TZ'] = antes;
      }
    }
  });

  it('aceita Date como referencia, ignorando a hora', () => {
    // 23:59:59 do dia 03/10 nao deve contar como um dia seguinte.
    const fimDoDia = new Date(Date.UTC(2026, 9, 3, 23, 59, 59));
    assert.equal(diasAteVencimento('2026-10-03', fimDoDia), 0);
  });
});

describe('calcularMulta', () => {
  it('aplica 2,5% ao dia sobre o valor original', () => {
    const r = calcularMulta(1000, '2026-09-03', HOJE);
    assert.equal(r.dias, 30);
    assert.equal(r.multa, 75_000); // R$ 750,00
    assert.equal(r.total, 175_000); // R$ 1.750,00
  });

  it('cobra meio dia de multa em 0,05% (R$ 100,50 por 2 dias)', () => {
    // 100,50 * 0,025 * 2 = 5,025 -> 5,03 com arredondamento unico no fim.
    const r = calcularMulta('100.50', '2026-10-01', HOJE);
    assert.equal(r.dias, 2);
    assert.equal(r.multa, 503);
    assert.equal(r.total, 10_553);
  });

  it('nao cobra multa no dia do vencimento', () => {
    const r = calcularMulta(1000, HOJE, HOJE);
    assert.equal(r.dias, 0);
    assert.equal(r.multa, 0);
    assert.equal(r.total, 100_000);
  });

  it('nao cobra multa antes do vencimento, mas preserva o valor', () => {
    const r = calcularMulta(1000, '2026-10-13', HOJE);
    assert.equal(r.dias, -10);
    assert.equal(r.multa, 0);
    assert.equal(r.total, 100_000);
  });

  it('acepta virgula decimal', () => {
    assert.equal(calcularTotal('1.000,00', '2026-09-03', HOJE), 1750);
  });

  it('arredonda o valor muito pequeno para baixo sem quebrar', () => {
    // 0,03 * 2,5% = 0,00075 -> 0,00
    const r = calcularMulta('0.03', '2026-10-02', HOJE);
    assert.equal(r.multa, 0);
    assert.equal(r.total, 3);
  });

  it('escala linearmente com os dias', () => {
    const umDia = calcularMulta(10_000, '2026-10-02', HOJE).multa;
    const doisDias = calcularMulta(10_000, '2026-10-01', HOJE).multa;
    const trintaDias = calcularMulta(10_000, '2026-09-03', HOJE).multa;
    assert.equal(umDia, 25_000); // 250,00
    assert.equal(doisDias, 50_000); // 500,00
    assert.equal(trintaDias, 750_000); // 7.500,00
  });

  it('e proporcional ao valor', () => {
    const r = calcularMulta('333.33', '2026-08-04', HOJE);
    assert.equal(r.dias, 60);
    assert.equal(r.multa, 50_000); // R$ 500,00
    assert.equal(r.total, 83_333); // R$ 833,33
  });

  it('rejeita valor negativo', () => {
    assert.throws(() => calcularMulta(-100, '2026-09-03', HOJE), ErroEntradaInvalida);
  });

  it('rejeita data invalida', () => {
    assert.throws(() => calcularMulta(100, '03/10/2026', HOJE), ErroEntradaInvalida);
  });

  it('a taxa diaria e 2,5%', () => {
    assert.equal(TAXA_DIARIA, 0.025);
  });
});

describe('consistencia com referencia independente', () => {
  // Valores conferidos com Decimal (Python), que nao sofre com o IEEE754.
  const casos: readonly [string, string, number, number, number][] = [
    // valor, vencimento, dias, multa, total
    ['1000.00', '2026-10-03', 0, 0, 100_000],
    ['1000.00', '2026-10-04', -1, 0, 100_000],
    ['1000.00', '2026-09-03', 30, 75_000, 175_000],
    ['100.50', '2026-10-01', 2, 503, 10_553],
    ['100.50', '2026-09-23', 10, 2_513, 12_563],
    ['333.33', '2026-08-04', 60, 50_000, 83_333],
    ['10000.00', '2025-10-03', 365, 9_125_000, 10_125_000],
  ];

  for (const [valor, vencimento, dias, multa, total] of casos) {
    it(`R$ ${valor} venc. ${vencimento} (${String(dias)} dias)`, () => {
      const r = calcularMulta(valor, vencimento, HOJE);
      assert.equal(r.dias, dias);
      assert.equal(r.multa, multa);
      assert.equal(r.total, total);
    });
  }
});
