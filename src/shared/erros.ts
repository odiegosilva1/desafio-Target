/**
 * Erros de dominio.
 *
 * Sao lancados pelas camadas puras (`domain`, `estoque`, `juros`) e
 * traduzidos em mensagem de usuario pela fronteira de CLI. Nenhuma delas
 * conhece `console` ou sistema de arquivos.
 */

export class ErroDominio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = new.target.name;
  }
}

/** O dado de entrada nao tem o formato esperado pelo dominio. */
export class ErroEntradaInvalida extends ErroDominio {}

/** A operacao viola uma regra de negocio (ex.: saldo insuficiente). */
export class ErroRegraDeNegocio extends ErroDominio {}

/** Registra a origem de um erro, preservando a pilha original. */
export function envolver(erro: unknown, contexto: string): ErroDominio {
  if (erro instanceof ErroDominio) {
    return erro;
  }
  const detalhe = erro instanceof Error ? erro.message : String(erro);
  return new ErroEntradaInvalida(`${contexto}: ${detalhe}`);
}
