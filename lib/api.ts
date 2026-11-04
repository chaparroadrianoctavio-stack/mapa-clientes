import "server-only";

/**
 * Las rutas /api ya están protegidas con contraseña por proxy.ts.
 * Como el navegador reenvía esa contraseña automáticamente, además se exige
 * que los cambios vengan desde esta misma página (evita que otro sitio
 * haga pedidos "en nombre" del usuario).
 */
export function mismoOrigen(req: Request): boolean {
  const origen = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origen || !host) return false;
  try {
    return new URL(origen).host === host;
  } catch {
    return false;
  }
}

export function error(mensaje: string, status: number) {
  return Response.json({ error: mensaje }, { status });
}
