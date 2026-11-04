/** Radios disponibles para buscar clientes cercanos (en km). */
export const RADIOS = [5, 10, 15] as const;

export default function SelectorRadio({
  valor,
  onCambiar,
}: {
  valor: number;
  onCambiar: (km: number) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Radio de búsqueda"
      className="inline-flex shrink-0 rounded-lg border border-slate-300 p-0.5 dark:border-slate-700"
    >
      {RADIOS.map((km) => (
        <button
          key={km}
          type="button"
          role="radio"
          aria-checked={valor === km}
          onClick={(e) => {
            e.stopPropagation();
            onCambiar(km);
          }}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            valor === km
              ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {km} km
        </button>
      ))}
    </div>
  );
}
