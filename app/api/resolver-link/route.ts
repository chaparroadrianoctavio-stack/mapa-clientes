import { error, mismoOrigen } from "@/lib/api";
import { esLinkGoogleMaps, resolverLinkMaps } from "@/lib/coordenadas";

/** Recibe un link de Google Maps y devuelve sus coordenadas. */
export async function POST(req: Request) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  let link = "";
  try {
    const b = await req.json();
    link = typeof b.link === "string" ? b.link.trim() : "";
  } catch {
    return error("Formato inválido.", 400);
  }
  if (!esLinkGoogleMaps(link)) {
    return error("Pegá un link de Google Maps (maps.app.goo.gl o google.com/maps).", 400);
  }
  try {
    const coord = await resolverLinkMaps(link);
    if (!coord) return error("No encontré coordenadas en ese link.", 422);
    return Response.json(coord);
  } catch {
    return error("No se pudo abrir el link. Probá de nuevo.", 502);
  }
}
