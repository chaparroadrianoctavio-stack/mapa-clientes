const ZONA = "America/Argentina/Mendoza";

/** Fecha de hoy en Mendoza, formato AAAA-MM-DD. */
export function hoyMendoza(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

/** Suma días a una fecha AAAA-MM-DD. */
export function sumarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return f.toISOString().slice(0, 10);
}

/** "hoy", "mañana" o "7/11" según la fecha del pedido. */
export function cuandoPedido(pedido: string, hoy: string): string {
  if (pedido === hoy) return "hoy";
  if (pedido === sumarDias(hoy, 1)) return "mañana";
  const [, m, d] = pedido.split("-").map(Number);
  return `el ${d}/${m}`;
}

/** Un pedido está pendiente si es de hoy en adelante. */
export function pedidoPendiente(pedido: string | undefined, hoy: string): boolean {
  return !!pedido && !!hoy && pedido >= hoy;
}
