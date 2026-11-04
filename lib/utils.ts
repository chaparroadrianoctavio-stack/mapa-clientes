import type { Cliente } from "./tipos";

/** Minúsculas y sin acentos, para buscar sin distinguir "Maipú" de "maipu". */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function inicial(nombre: string): string {
  const limpio = nombre.trim();
  return limpio ? limpio[0].toUpperCase() : "?";
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-09" → "Septiembre 2026" */
export function nombreMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  const n = MESES[m - 1] ?? mes;
  return `${n[0].toUpperCase()}${n.slice(1)} ${a}`;
}

/** "2026-09-29" → "29/9" */
export function fechaCorta(fecha: string): string {
  const [, m, d] = fecha.split("-").map(Number);
  return `${d}/${m}`;
}

/** "5492616447328" → "+54 9 261 644-7328" (si tiene el formato esperado) */
export function telefonoLindo(tel: string): string {
  const m = tel.match(/^549(\d{3})(\d{3})(\d{4})$/);
  return m ? `+54 9 ${m[1]} ${m[2]}-${m[3]}` : `+${tel}`;
}

/** Mensaje que aparece ya escrito al abrir WhatsApp (se puede editar antes de enviar). */
export const MENSAJE_WHATSAPP = "Mañana estamos cerca de tu domicilio\nNecesitas algun pedido?";

export function urlWhatsapp(c: Cliente) {
  return `https://wa.me/${c.telefono}?text=${encodeURIComponent(MENSAJE_WHATSAPP)}`;
}

export function urlLlamar(c: Cliente) {
  return `tel:+${c.telefono}`;
}

/** Devuelve null si no hay forma de saber dónde queda. */
export function urlComoLlegar(c: Cliente): string | null {
  if (typeof c.lat === "number" && typeof c.lng === "number") {
    return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
  }
  return c.link ?? null;
}

export type Grupo = "pedido" | "mapa" | "link" | "sin";

/**
 * - "link": la ubicación vino de un link de Google Maps (tenga o no
 *   coordenadas ya resueltas).
 * - "mapa": tiene coordenadas cargadas directamente.
 * - "sin": no hay ubicación.
 */
export function grupoDe(c: Cliente): Grupo {
  if (c.link) return "link";
  if (typeof c.lat === "number" && typeof c.lng === "number") return "mapa";
  return "sin";
}
