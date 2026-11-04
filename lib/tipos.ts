export type Cliente = {
  /** Fecha en formato ISO: AAAA-MM-DD */
  fecha: string;
  nombre: string;
  zona: string;
  /** Solo dígitos, con código de país (ej: 5492611234567) */
  telefono: string;
  lat: number | null;
  lng: number | null;
  /** Link de Google Maps (opcional) */
  link?: string;
  /** Mes en formato AAAA-MM */
  mes: string;
  /** "app" si se cargó desde el panel "Nuevo cliente" (guardado en la base) */
  origen?: "app";
};

export type ClienteConId = Cliente & { id: string };

export function tieneCoordenadas<T extends Cliente>(
  c: T,
): c is T & { lat: number; lng: number } {
  return typeof c.lat === "number" && typeof c.lng === "number";
}
