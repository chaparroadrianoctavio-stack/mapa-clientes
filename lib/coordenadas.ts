export type Coord = { lat: number; lng: number };

export function coordValida({ lat, lng }: Coord): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** Extrae coordenadas de una URL o texto de Google Maps. */
export function extraerCoordenadas(texto: string): Coord | null {
  let t = texto;
  try {
    t = decodeURIComponent(texto);
  } catch {
    // Texto con "%" sueltos: se usa tal cual.
  }
  const patrones = [
    // Coordenadas exactas del lugar: ...!3d-32.98!4d-68.79
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    // ?q=-32.98,-68.79  /  ?query=  /  &ll=  /  destination=
    /[?&](?:q|query|ll|destination|center)=(-?\d+(?:\.\d+)?),\s*\+?(-?\d+(?:\.\d+)?)/,
    // /search/-32.98,+-68.79  o  /place/-32.98,-68.79
    /\/(?:search|place|dir)\/(-?\d+(?:\.\d+)?),\s*\+?(-?\d+(?:\.\d+)?)/,
    // @-32.98,-68.79,17z (centro del mapa: último recurso)
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  ];
  for (const p of patrones) {
    const m = t.match(p);
    if (m) {
      const c = { lat: Number(m[1]), lng: Number(m[2]) };
      if (coordValida(c)) return c;
    }
  }
  return null;
}

/** Interpreta un texto tipo "-32.95, -68.83" (como el que copia Google Maps). */
export function parsearCoordenadas(texto: string): Coord | null {
  const m = texto
    .trim()
    .match(/^\(?\s*(-?\d{1,2}(?:[.]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.]\d+)?)\s*\)?$/);
  if (!m) return null;
  const c = { lat: Number(m[1]), lng: Number(m[2]) };
  return coordValida(c) ? c : null;
}

/** Distancia en línea recta, en km (fórmula de Haversine). */
export function distanciaKm(a: Coord, b: Coord): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const HOSTS_GOOGLE = /^(maps\.app\.goo\.gl|goo\.gl|(www\.)?google\.[a-z.]+|maps\.google\.[a-z.]+|consent\.google\.[a-z.]+)$/i;

export function esLinkGoogleMaps(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && HOSTS_GOOGLE.test(u.hostname);
  } catch {
    return false;
  }
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

/**
 * Sigue las redirecciones de un link de Google Maps (ej. maps.app.goo.gl)
 * y devuelve las coordenadas. Solo visita dominios de Google.
 */
export async function resolverLinkMaps(link: string): Promise<Coord | null> {
  let url = link;
  for (let salto = 0; salto < 10; salto++) {
    if (!esLinkGoogleMaps(url)) return null;
    const c = extraerCoordenadas(url);
    if (c) return c;

    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": UA, "Accept-Language": "es-AR,es;q=0.9" },
      signal: AbortSignal.timeout(8000),
    });
    const destino = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && destino) {
      url = new URL(destino, url).toString();
      continue;
    }
    // Sin más redirecciones: buscar en el HTML como último intento.
    const html = await res.text();
    return extraerCoordenadas(html);
  }
  return null;
}
