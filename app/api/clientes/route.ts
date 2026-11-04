import { connection } from "next/server";
import { dbConfigurada, guardarNuevo, listarNuevos } from "@/lib/db";
import { error, mismoOrigen } from "@/lib/api";
import { coordValida, esLinkGoogleMaps } from "@/lib/coordenadas";
import { normalizarTelefono, telefonoValido } from "@/lib/telefono";
import type { ClienteConId } from "@/lib/tipos";

/** Clientes agregados desde la app. */
export async function GET() {
  await connection(); // siempre en el momento, nunca prerenderizado
  try {
    const clientes = await listarNuevos();
    return Response.json(
      { dbConfigurada, clientes },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error(e);
    return error("No se pudo leer la base de datos.", 502);
  }
}

/** Guarda un cliente nuevo. */
export async function POST(req: Request) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return error("Formato inválido.", 415);
  }
  if (!dbConfigurada) {
    return error("La base de datos no está conectada en Vercel.", 503);
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return error("Formato inválido.", 400);
  }

  const texto = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";

  const nombre = texto(b.nombre, 80) || "Sin nombre";
  const zona = texto(b.zona, 120);
  const telefono = normalizarTelefono(texto(b.telefono, 30));
  const fecha = texto(b.fecha, 10);
  const link = texto(b.link, 400);
  const pedido = texto(b.pedido, 10);
  const lat = Number(b.lat);
  const lng = Number(b.lng);

  if (!telefonoValido(telefono)) return error("El teléfono no es válido.", 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return error("La fecha no es válida.", 400);
  if (!coordValida({ lat, lng })) return error("Falta la ubicación.", 400);
  if (pedido && !/^\d{4}-\d{2}-\d{2}$/.test(pedido)) {
    return error("La fecha del pedido no es válida.", 400);
  }
  if (link && !esLinkGoogleMaps(link)) {
    return error("El link tiene que ser de Google Maps.", 400);
  }

  const cliente: ClienteConId = {
    id: `app-${crypto.randomUUID()}`,
    fecha,
    mes: fecha.slice(0, 7),
    nombre,
    zona,
    telefono,
    lat,
    lng,
    origen: "app",
  };
  if (link) cliente.link = link;
  if (pedido) cliente.pedido = pedido;

  try {
    await guardarNuevo(cliente);
  } catch (e) {
    console.error(e);
    return error("No se pudo guardar en la base de datos.", 502);
  }
  return Response.json({ cliente }, { status: 201 });
}
