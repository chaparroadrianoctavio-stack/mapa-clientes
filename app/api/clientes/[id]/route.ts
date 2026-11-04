import { dbConfigurada, eliminarNuevo } from "@/lib/db";
import { error, mismoOrigen } from "@/lib/api";

/** Elimina un cliente agregado desde la app (los del JSON no se tocan). */
export async function DELETE(
  req: Request,
  ctx: RouteContext<"/api/clientes/[id]">,
) {
  if (!mismoOrigen(req)) return error("Origen no permitido.", 403);
  if (!dbConfigurada) {
    return error("La base de datos no está conectada en Vercel.", 503);
  }
  const { id } = await ctx.params;
  if (!/^app-[\w-]{1,64}$/.test(id)) {
    return error("Solo se pueden borrar clientes cargados desde la app.", 400);
  }
  try {
    const borrado = await eliminarNuevo(id);
    if (!borrado) return error("El cliente ya no existe.", 404);
    return new Response(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return error("No se pudo borrar.", 502);
  }
}
