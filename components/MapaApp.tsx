"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ClienteConId } from "@/lib/tipos";
import {
  fechaCorta,
  grupoDe,
  inicial,
  nombreMes,
  normalizar,
  telefonoLindo,
  type Grupo,
} from "@/lib/utils";
import Acciones from "./Acciones";
import type { Foco } from "./Mapa";

const Mapa = dynamic(() => import("./Mapa"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
      Cargando mapa…
    </div>
  ),
});

const GRUPOS: { id: Grupo; titulo: string; color: string }[] = [
  { id: "mapa", titulo: "En el mapa", color: "bg-blue-600" },
  { id: "link", titulo: "Ubicación por link", color: "bg-purple-600" },
  { id: "sin", titulo: "Sin ubicación", color: "bg-slate-400" },
];

// Alturas del panel deslizable (solo celular)
const ALTO_MIN = 196;
const puntos = () => {
  const h = window.innerHeight;
  return [ALTO_MIN, Math.round(h * 0.5), Math.round(h * 0.88)];
};
const esEscritorio = () => window.matchMedia("(min-width: 768px)").matches;

export default function MapaApp({ clientes }: { clientes: ClienteConId[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [mes, setMes] = useState("todos");
  const [fecha, setFecha] = useState("todas");
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [foco, setFoco] = useState<Foco>(null);
  const [encuadre, setEncuadre] = useState(0);
  const [alto, setAlto] = useState<number | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const desdeMapa = useRef(false);
  const lista = useRef<HTMLDivElement>(null);

  const meses = useMemo(
    () => [...new Set(clientes.map((c) => c.mes))].sort().reverse(),
    [clientes],
  );
  const fechas = useMemo(
    () =>
      [
        ...new Set(
          clientes.filter((c) => mes === "todos" || c.mes === mes).map((c) => c.fecha),
        ),
      ]
        .sort()
        .reverse(),
    [clientes, mes],
  );

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda);
    const qDigitos = busqueda.replace(/\D/g, "");
    return clientes.filter((c) => {
      if (mes !== "todos" && c.mes !== mes) return false;
      if (fecha !== "todas" && c.fecha !== fecha) return false;
      if (!q) return true;
      return (
        normalizar(c.nombre).includes(q) ||
        normalizar(c.zona).includes(q) ||
        (qDigitos.length >= 3 && c.telefono.includes(qDigitos))
      );
    });
  }, [clientes, busqueda, mes, fecha]);

  const porGrupo = useMemo(() => {
    const g: Record<Grupo, ClienteConId[]> = { mapa: [], link: [], sin: [] };
    for (const c of filtrados) g[grupoDe(c)].push(c);
    return g;
  }, [filtrados]);

  // Al tocar un pin: resaltar y mostrar ese cliente en la lista.
  useEffect(() => {
    if (!seleccionadoId || !desdeMapa.current) return;
    desdeMapa.current = false;
    const el = lista.current?.querySelector(`[data-id="${CSS.escape(seleccionadoId)}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [seleccionadoId]);

  function elegirDesdeLista(c: ClienteConId) {
    setSeleccionadoId(c.id);
    if (typeof c.lat === "number" && typeof c.lng === "number") {
      setFoco((f) => ({ id: c.id, t: (f?.t ?? 0) + 1 }));
      if (!esEscritorio()) setAlto(ALTO_MIN);
    }
  }

  function elegirDesdeMapa(id: string) {
    desdeMapa.current = true;
    setSeleccionadoId(id);
  }

  function cambiarMes(v: string) {
    setMes(v);
    setFecha("todas");
    setEncuadre((n) => n + 1);
  }

  function cambiarFecha(v: string) {
    setFecha(v);
    setEncuadre((n) => n + 1);
  }

  // ---------- Arrastre del panel (celular) ----------
  const drag = useRef<{ y: number; alto: number; movio: boolean } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (esEscritorio()) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, alto: alto ?? ALTO_MIN, movio: false };
    setArrastrando(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 4) d.movio = true;
    const [min, , max] = puntos();
    setAlto(Math.min(max, Math.max(min, d.alto - dy)));
  }
  function onPointerUp() {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setArrastrando(false);
    const p = puntos();
    const actual = alto ?? ALTO_MIN;
    if (!d.movio) {
      // Un toque: alterna entre cerrado y a media altura.
      setAlto(actual > ALTO_MIN + 10 ? ALTO_MIN : p[1]);
      return;
    }
    const masCercano = p.reduce((a, b) =>
      Math.abs(b - actual) < Math.abs(a - actual) ? b : a,
    );
    setAlto(masCercano);
  }

  function alternarTema() {
    const oscuro = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("tema", oscuro ? "oscuro" : "claro");
    } catch {}
  }

  const total = filtrados.length;

  return (
    <div className="relative h-dvh w-full overflow-hidden md:flex">
      <main className="absolute inset-0 md:relative md:order-2 md:flex-1">
        <Mapa
          clientes={filtrados}
          seleccionadoId={seleccionadoId}
          foco={foco}
          encuadre={encuadre}
          onSeleccionar={elegirDesdeMapa}
        />
      </main>

      <aside
        style={{ "--alto": `${alto ?? ALTO_MIN}px` } as React.CSSProperties}
        className={`absolute inset-x-0 bottom-0 z-[1100] flex h-[var(--alto)] flex-col rounded-t-2xl border-t border-slate-200 bg-white shadow-[0_-8px_30px_rgb(0_0_0/0.15)] dark:border-slate-800 dark:bg-slate-900 md:relative md:order-1 md:h-full md:w-[380px] md:rounded-none md:border-r md:border-t-0 md:shadow-none ${
          arrastrando ? "" : "transition-[height] duration-200 ease-out"
        }`}
      >
        {/* Encabezado: se usa como manija para arrastrar en el celular */}
        <div
          className="cursor-grab touch-none select-none px-4 pt-2 md:cursor-default md:pt-4"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 md:hidden" />
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">
              Clientes{" "}
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                ({total})
              </span>
            </h1>
            <button
              type="button"
              onClick={alternarTema}
              onPointerDown={(e) => e.stopPropagation()}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Cambiar modo claro / oscuro"
              title="Cambiar modo claro / oscuro"
            >
              <span className="dark:hidden">🌙</span>
              <span className="hidden dark:inline">☀️</span>
            </button>
          </div>
        </div>

        <div className="space-y-2 px-4 pb-3 pt-1">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onFocus={() => {
              if (!esEscritorio()) setAlto(puntos()[2]);
            }}
            placeholder="Buscar por nombre, zona o teléfono"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 md:text-sm"
          />
          <div className="flex gap-2">
            <select
              value={mes}
              onChange={(e) => cambiarMes(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              aria-label="Filtrar por mes"
            >
              <option value="todos">Todos los meses</option>
              {meses.map((m) => (
                <option key={m} value={m}>
                  {nombreMes(m)}
                </option>
              ))}
            </select>
            <select
              value={fecha}
              onChange={(e) => cambiarFecha(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              aria-label="Filtrar por fecha"
            >
              <option value="todas">Todas las fechas</option>
              {fechas.map((f) => (
                <option key={f} value={f}>
                  {fechaCorta(f)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          ref={lista}
          className="flex-1 overflow-y-auto overscroll-contain border-t border-slate-200 pb-[env(safe-area-inset-bottom)] dark:border-slate-800"
        >
          {total === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">
              No hay clientes que coincidan.
            </p>
          )}
          {GRUPOS.map((g) =>
            porGrupo[g.id].length ? (
              <section key={g.id}>
                <h2 className="sticky top-0 z-10 flex items-center gap-2 bg-slate-100/95 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 backdrop-blur dark:bg-slate-800/95 dark:text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${g.color}`} />
                  {g.titulo} · {porGrupo[g.id].length}
                </h2>
                <ul>
                  {porGrupo[g.id].map((c) => (
                    <ItemCliente
                      key={c.id}
                      cliente={c}
                      grupo={g.id}
                      activo={c.id === seleccionadoId}
                      onClick={() => elegirDesdeLista(c)}
                    />
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      </aside>
    </div>
  );
}

function ItemCliente({
  cliente: c,
  grupo,
  activo,
  onClick,
}: {
  cliente: ClienteConId;
  grupo: Grupo;
  activo: boolean;
  onClick: () => void;
}) {
  const color =
    activo ? "bg-orange-500" : grupo === "mapa" ? "bg-blue-600" : grupo === "link" ? "bg-purple-600" : "bg-slate-400";
  const sinResolver = grupo === "link" && c.lat === null;

  return (
    <li
      data-id={c.id}
      className={`border-b border-slate-100 dark:border-slate-800 ${
        activo ? "bg-orange-50 dark:bg-orange-500/10" : ""
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${color}`}
        >
          {inicial(c.nombre)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{c.nombre}</span>
          <span className="block truncate text-sm text-slate-500 dark:text-slate-400">
            {c.zona || "Sin zona"}
          </span>
        </span>
        <span className="shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
          {fechaCorta(c.fecha)}
        </span>
      </button>
      {activo && (
        <div className="space-y-2 px-4 pb-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {telefonoLindo(c.telefono)}
            {sinResolver && " · ubicación solo por link"}
            {grupo === "sin" && " · sin ubicación cargada"}
          </p>
          <Acciones cliente={c} />
        </div>
      )}
    </li>
  );
}
