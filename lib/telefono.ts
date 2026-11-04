/**
 * Lleva un teléfono argentino al formato que usa WhatsApp: 549 + área + número.
 *   "261 555-1234"      → "5492615551234"
 *   "0261 15 555-1234"  → "5492615551234"
 *   "+54 9 261 5551234" → "5492615551234"
 * Si no lo reconoce, devuelve solo los dígitos.
 */
export function normalizarTelefono(texto: string): string {
  let d = texto.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("549") && d.length === 13) return d;
  if (d.startsWith("54") && d.length === 12) return `549${d.slice(2)}`;
  if (d.startsWith("0")) d = d.slice(1);
  // Área de Mendoza con el "15" de celular: 261 15 5551234
  const con15 = d.match(/^(261|263|260|2622|2624|2625|2626)15(\d{6,8})$/);
  if (con15 && (con15[1] + con15[2]).length === 10) d = con15[1] + con15[2];
  if (d.length === 10) return `549${d}`;
  return d;
}

export function telefonoValido(tel: string): boolean {
  return /^\d{8,15}$/.test(tel);
}
