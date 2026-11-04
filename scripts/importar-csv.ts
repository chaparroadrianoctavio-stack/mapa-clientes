/**
 * Importa clientes desde un CSV y los agrega a data/clientes.json.
 *
 * Uso:
 *   npm run importar -- data/csv/2026-10.csv 2026
 *
 * Formato del CSV (la primera línea puede ser el encabezado):
 *   fecha,nombre,zona,telefono,lat,lng,link
 *   29/9,Sebastián,Ugarteche,5492616447328,-33.20,-68.88,
 *
 * La zona puede contener comas (ej: "Carrodilla · 13,2 km"): el script toma
 * fecha y nombre desde la izquierda y teléfono, lat, lng y link desde la
 * derecha, y todo lo que queda en el medio es la zona.
 *
 * No duplica: si ya existe un cliente con la misma fecha y teléfono, lo saltea.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Cliente } from "../lib/tipos";

const RUTA_JSON = resolve(__dirname, "../data/clientes.json");

function numeroONull(valor: string): number | null {
  const v = valor.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parsearLinea(linea: string, anio: number): Cliente {
  const partes = linea.split(",");
  if (partes.length < 7) {
    throw new Error(`Línea con menos de 7 columnas: "${linea}"`);
  }
  const link = partes.pop()!.trim();
  const lng = numeroONull(partes.pop()!);
  const lat = numeroONull(partes.pop()!);
  const telefono = partes.pop()!.replace(/\D/g, "");
  const fechaTxt = partes.shift()!.trim();
  const nombre = partes.shift()!.trim() || "Sin nombre";
  const zona = partes.join(",").trim();

  const m = fechaTxt.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!m) throw new Error(`Fecha inválida "${fechaTxt}" en: "${linea}"`);
  const dia = m[1].padStart(2, "0");
  const mesNum = m[2].padStart(2, "0");
  let a = m[3] ? Number(m[3]) : anio;
  if (a < 100) a += 2000;
  const mes = `${a}-${mesNum}`;

  const cliente: Cliente = {
    fecha: `${mes}-${dia}`,
    nombre,
    zona,
    telefono,
    lat,
    lng,
    mes,
  };
  if (link) cliente.link = link;
  return cliente;
}

function main() {
  const [rutaCsv, anioTxt] = process.argv.slice(2);
  if (!rutaCsv) {
    console.error("Uso: npm run importar -- <archivo.csv> [año]");
    process.exit(1);
  }
  const anio = anioTxt ? Number(anioTxt) : new Date().getFullYear();

  const lineas = readFileSync(resolve(rutaCsv), "utf8")
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^fecha\s*,/i.test(l));

  const existentes: Cliente[] = JSON.parse(readFileSync(RUTA_JSON, "utf8"));
  const claves = new Set(existentes.map((c) => `${c.fecha}|${c.telefono}`));

  let agregados = 0;
  let salteados = 0;
  for (const linea of lineas) {
    const c = parsearLinea(linea, anio);
    const clave = `${c.fecha}|${c.telefono}`;
    if (claves.has(clave)) {
      salteados++;
      continue;
    }
    claves.add(clave);
    existentes.push(c);
    agregados++;
  }

  existentes.sort((a, b) => b.fecha.localeCompare(a.fecha));
  writeFileSync(RUTA_JSON, JSON.stringify(existentes, null, 2) + "\n", "utf8");
  console.log(`✔ ${agregados} clientes agregados, ${salteados} ya existían.`);

  const pendientes = existentes.filter((c) => c.link && c.lat === null).length;
  if (pendientes) {
    console.log(
      `→ Hay ${pendientes} con link sin coordenadas. Corré: npm run resolver-links`,
    );
  }
}

main();
