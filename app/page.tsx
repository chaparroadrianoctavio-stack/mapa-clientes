import datos from "@/data/clientes.json";
import type { Cliente, ClienteConId } from "@/lib/tipos";
import MapaApp from "@/components/MapaApp";

// Los datos se leen en el servidor y viajan dentro de la página,
// que está protegida por la contraseña (ver proxy.ts).
const clientes: ClienteConId[] = (datos as Cliente[]).map((c, i) => ({
  ...c,
  id: `${c.fecha}-${c.telefono}-${i}`,
}));

export default function Home() {
  return <MapaApp clientes={clientes} />;
}
