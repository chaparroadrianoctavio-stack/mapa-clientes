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
import { resolverLinkMaps } from "../lib/coordenadas";

const RUTA_JSON = resolve(__dirname, "../data/clientes.json");

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
      const coord = await resolverLinkMaps(c.link!);
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
