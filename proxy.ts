import { NextResponse, type NextRequest } from "next/server";

/**
 * Protección con contraseña (HTTP Basic Auth) para TODA la app.
 *
 * En Next.js 16 el antiguo `middleware.ts` se llama `proxy.ts`; funciona igual.
 * Usuario y contraseña: variables de entorno APP_USER y APP_PASSWORD.
 * Si no están configuradas, la app queda bloqueada (nunca abierta).
 *
 * Sin `matcher`, corre en todas las rutas, incluidos los archivos de
 * /_next/static: nada se sirve sin contraseña.
 */
export function proxy(request: NextRequest) {
  const usuario = process.env.APP_USER;
  const clave = process.env.APP_PASSWORD;

  if (!usuario || !clave) {
    return new NextResponse(
      "Falta configurar APP_USER y APP_PASSWORD en las variables de entorno.",
      { status: 500, headers: { "X-Robots-Tag": "noindex" } },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decodificado = Buffer.from(auth.slice(6), "base64").toString("utf8");
      const i = decodificado.indexOf(":");
      if (i !== -1) {
        const u = decodificado.slice(0, i);
        const p = decodificado.slice(i + 1);
        // Comparar ambos siempre (sin cortocircuito) para no filtrar tiempos.
        const okU = igualSeguro(u, usuario);
        const okP = igualSeguro(p, clave);
        if (okU && okP) {
          const res = NextResponse.next();
          res.headers.set("X-Robots-Tag", "noindex, nofollow");
          // Necesario para que OpenStreetMap reciba el Referer de los tiles.
          res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
          return res;
        }
      }
    } catch {
      // Encabezado mal formado: se trata como no autenticado.
    }
  }

  return new NextResponse("Acceso restringido", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Mapa de clientes", charset="UTF-8"',
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function igualSeguro(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let dif = ea.length ^ eb.length;
  for (let i = 0; i < eb.length; i++) {
    dif |= (ea[i] ?? 0) ^ eb[i];
  }
  return dif === 0;
}
