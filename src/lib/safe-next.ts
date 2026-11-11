/**
 * Destino após o login. Só aceita caminhos internos ("/algo"), para que o
 * parâmetro ?next= não possa redirecionar a pessoa para outro site.
 */
export function safeNext(next: string | undefined) {
  return next && /^\/(?![/\\])/.test(next) ? next : "/";
}
