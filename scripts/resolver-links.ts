/**
 * Busca en data/clientes.json los clientes que tienen un link de Google Maps
 * pero no tienen coordenadas, sigue la redirección del link corto
 * (maps.app.goo.gl) y guarda lat/lng en el JSON.
 *
 * Uso:
 *   npm run resolver-links
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Cliente } from "../lib/tipos";

const RUTA_JSON = resolve(__dirname, "../data/clientes.json");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

type Coord = { lat: number; lng: number };

function valida({ lat, lng }: Coord): boolean {
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
  const t = decodeURIComponent(texto);
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
      if (valida(c)) return c;
    }
  }
  return null;
}

/** Sigue las redirecciones manualmente y prueba cada URL intermedia. */
async function resolverLink(link: string): Promise<Coord | null> {
  let url = link;
  for (let salto = 0; salto < 10; salto++) {
    const c = extraerCoordenadas(url);
    if (c) return c;

    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": UA, "Accept-Language": "es-AR,es;q=0.9" },
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

async function main() {
  const clientes: Cliente[] = JSON.parse(readFileSync(RUTA_JSON, "utf8"));
  const pendientes = clientes.filter(
    (c) => c.link && (c.lat === null || c.lng === null),
  );

  if (!pendientes.length) {
    console.log("No hay links pendientes de resolver.");
    return;
  }

  let ok = 0;
  for (const c of pendientes) {
    try {
      const coord = await resolverLink(c.link!);
      if (coord) {
        c.lat = coord.lat;
        c.lng = coord.lng;
        ok++;
        console.log(`✔ ${c.nombre}: ${coord.lat}, ${coord.lng}`);
      } else {
        console.log(`✘ ${c.nombre}: no se encontraron coordenadas (${c.link})`);
      }
    } catch (e) {
      console.log(`✘ ${c.nombre}: error (${(e as Error).message})`);
    }
  }

  writeFileSync(RUTA_JSON, JSON.stringify(clientes, null, 2) + "\n", "utf8");
  console.log(`\n${ok} de ${pendientes.length} links resueltos.`);
}

main();
