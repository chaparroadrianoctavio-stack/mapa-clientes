import type { ClienteConId } from "@/lib/tipos";
import { inicial, telefonoLindo } from "@/lib/utils";
import Acciones from "./Acciones";

export type Cercano = { cliente: ClienteConId; km: number };

const formatoKm = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

/** Lista de clientes cercanos, ordenados por distancia, con botones de contacto. */
export default function ListaCercanos({
  cercanos,
  onVer,
}: {
  cercanos: Cercano[];
  onVer: (c: ClienteConId) => void;
}) {
  if (cercanos.length === 0) {
    return (
      <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-500 dark:bg-slate-800">
        No hay clientes cerca de este punto.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {cercanos.map(({ cliente: c, km }) => (
        <li key={c.id} className="space-y-2 p-3">
          <button
            type="button"
            onClick={() => onVer(c)}
            className="flex w-full items-center gap-3 text-left"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
              {inicial(c.nombre)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{c.nombre}</span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {c.zona || telefonoLindo(c.telefono)}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-500/15 dark:text-green-300">
              {formatoKm.format(km)} km
            </span>
          </button>
          <Acciones cliente={c} />
        </li>
      ))}
    </ul>
  );
}
