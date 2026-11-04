"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
import PanelNuevo from "./PanelNuevo";
import ListaCercanos, { type Cercano } from "./ListaCercanos";
import type { Foco, InfoPedido, Radio } from "./Mapa";
import { distanciaKm, type Coord } from "@/lib/coordenadas";
import { tieneCoordenadas } from "@/lib/tipos";
import { cuandoPedido, hoyMendoza, pedidoPendiente } from "@/lib/fechas";

const Mapa = dynamic(() => import("./Mapa"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
      Cargando mapa…
    </div>
  ),
});

const GRUPOS: { id: Grupo; titulo: string; color: string }[] = [
  { id: "pedido", titulo: "Con pedido", color: "bg-rose-600" },
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

/** Radio para buscar clientes cercanos a uno nuevo o con pedido. */
const RADIO_KM = 5;

/** Clientes con coordenadas a menos de RADIO_KM de un punto, del más cerca al más lejos. */
function buscarCercanos(todos: ClienteConId[], punto: Coord, excluir?: string): Cercano[] {
  return todos
    .filter(tieneCoordenadas)
    .filter((c) => c.id !== excluir)
    .map((c) => ({ cliente: c as ClienteConId, km: distanciaKm(punto, c) }))
    .filter((x) => x.km <= RADIO_KM)
    .sort((a, b) => a.km - b.km);
}

// "Hoy" solo existe en el navegador: en el servidor (página prerenderizada) es "".
const sinSuscripcion = () => () => {};

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

  // Clientes guardados desde la app (base de datos)
  const [extras, setExtras] = useState<ClienteConId[]>([]);
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  // Panel "Nuevo cliente"
  const [modo, setModo] = useState<"lista" | "nuevo">("lista");
  const [punto, setPunto] = useState<Coord | null>(null);
  const [eligiendo, setEligiendo] = useState(false);

  useEffect(() => {
    let vigente = true;
    fetch("/api/clientes", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { dbConfigurada: boolean; clientes: ClienteConId[] }) => {
        if (!vigente) return;
        setDbOk(d.dbConfigurada);
        setExtras(d.clientes);
      })
      .catch(() => {
        if (vigente) setDbOk(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const todos = useMemo(() => [...clientes, ...extras], [clientes, extras]);
  const hoy = useSyncExternalStore(sinSuscripcion, hoyMendoza, () => "");

  // Cercanos al punto que se está cargando en "Nuevo cliente"
  const cercanos = useMemo<Cercano[]>(
    () => (punto ? buscarCercanos(todos, punto) : []),
    [todos, punto],
  );

  // Clientes con pedido pendiente y sus vecinos a menos de RADIO_KM
  const vecinosPedido = useMemo(() => {
    const m = new Map<string, Cercano[]>();
    for (const c of todos) {
      if (pedidoPendiente(c.pedido, hoy) && tieneCoordenadas(c)) {
        m.set(c.id, buscarCercanos(todos, c, c.id));
      }
    }
    return m;
  }, [todos, hoy]);

  const infoPedidos = useMemo(() => {
    const m = new Map<string, InfoPedido>();
    for (const c of todos) {
      if (pedidoPendiente(c.pedido, hoy)) {
        m.set(c.id, {
          cuando: cuandoPedido(c.pedido!, hoy),
          cercanos: vecinosPedido.get(c.id)?.length ?? 0,
        });
      }
    }
    return m;
  }, [todos, hoy, vecinosPedido]);

  const seleccionado = todos.find((c) => c.id === seleccionadoId) ?? null;

  const radio = useMemo<Radio | null>(() => {
    if (modo === "nuevo") {
      return {
        punto,
        radioKm: RADIO_KM,
        eligiendo,
        cercanos: new Set(cercanos.map((x) => x.cliente.id)),
        editable: true,
      };
    }
    // Cliente con pedido elegido: su círculo y sus vecinos
    const vecinos = seleccionado ? vecinosPedido.get(seleccionado.id) : undefined;
    if (seleccionado && vecinos && tieneCoordenadas(seleccionado)) {
      return {
        punto: { lat: seleccionado.lat, lng: seleccionado.lng },
        radioKm: RADIO_KM,
        eligiendo: false,
        cercanos: new Set(vecinos.map((x) => x.cliente.id)),
        editable: false,
      };
    }
    return null;
  }, [modo, punto, eligiendo, cercanos, seleccionado, vecinosPedido]);

  const meses = useMemo(
    () => [...new Set(todos.map((c) => c.mes))].sort().reverse(),
    [todos],
  );
  const fechas = useMemo(
    () =>
      [
        ...new Set(
          todos.filter((c) => mes === "todos" || c.mes === mes).map((c) => c.fecha),
        ),
      ]
        .sort()
        .reverse(),
    [todos, mes],
  );

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda);
    const qDigitos = busqueda.replace(/\D/g, "");
    return todos.filter((c) => {
      if (mes !== "todos" && c.mes !== mes) return false;
      if (fecha !== "todas" && c.fecha !== fecha) return false;
      if (!q) return true;
      return (
        normalizar(c.nombre).includes(q) ||
        normalizar(c.zona).includes(q) ||
        (qDigitos.length >= 3 && c.telefono.includes(qDigitos))
      );
    });
  }, [todos, busqueda, mes, fecha]);

  const porGrupo = useMemo(() => {
    const g: Record<Grupo, ClienteConId[]> = { pedido: [], mapa: [], link: [], sin: [] };
    for (const c of filtrados) g[infoPedidos.has(c.id) ? "pedido" : grupoDe(c)].push(c);
    g.pedido.sort((a, b) => a.pedido!.localeCompare(b.pedido!));
    return g;
  }, [filtrados, infoPedidos]);

  /** Foco en un cliente; si tiene pedido, encuadra su círculo de 5 km. */
  function enfocar(c: ClienteConId, conRadio: boolean) {
    const escritorio = esEscritorio();
    setFoco((f) => ({
      id: c.id,
      t: (f?.t ?? 0) + 1,
      radioKm: conRadio ? RADIO_KM : undefined,
      padAbajo: conRadio && !escritorio ? Math.round(window.innerHeight * 0.5) : 0,
      // En el celular los datos ya están en el panel: el popup taparía el círculo.
      sinPopup: conRadio && !escritorio,
    }));
    if (!escritorio) setAlto(conRadio ? puntos()[1] : ALTO_MIN);
  }

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
      enfocar(c, vecinosPedido.has(c.id));
    }
  }

  function elegirDesdeMapa(id: string) {
    desdeMapa.current = true;
    setSeleccionadoId(id);
    // Al tocar un cliente con pedido, mostrar todo su círculo.
    const c = todos.find((x) => x.id === id);
    if (c && vecinosPedido.has(id)) enfocar(c, true);
  }

  /** Mostrar un vecino en el mapa sin perder el cliente con pedido elegido. */
  function verVecino(c: ClienteConId) {
    setFoco((f) => ({ id: c.id, t: (f?.t ?? 0) + 1 }));
    if (!esEscritorio()) setAlto(ALTO_MIN);
  }

  // ---------- Nuevo cliente ----------
  function abrirNuevo() {
    setModo("nuevo");
    setSeleccionadoId(null);
    if (!esEscritorio()) setAlto(puntos()[1]);
  }

  function cerrarNuevo() {
    setModo("lista");
    setPunto(null);
    setEligiendo(false);
  }

  function elegirPunto(c: Coord) {
    setPunto(c);
    setEligiendo(false);
    if (!esEscritorio()) setAlto(puntos()[1]);
  }

  function cambiarEligiendo(v: boolean) {
    setEligiendo(v);
    if (v && !esEscritorio()) setAlto(ALTO_MIN);
  }

  function verCercano(c: ClienteConId) {
    setSeleccionadoId(c.id);
    setFoco((f) => ({ id: c.id, t: (f?.t ?? 0) + 1 }));
    if (!esEscritorio()) setAlto(ALTO_MIN);
  }

  function guardado(c: ClienteConId) {
    setExtras((e) => [...e, c]);
    cerrarNuevo();
    setBusqueda("");
    setMes("todos");
    setFecha("todas");
    setSeleccionadoId(c.id);
    enfocar(c, pedidoPendiente(c.pedido, hoy) && tieneCoordenadas(c));
  }

  async function eliminar(c: ClienteConId) {
    if (!confirm(`¿Eliminar a ${c.nombre}? Esto no se puede deshacer.`)) return;
    const r = await fetch(`/api/clientes/${encodeURIComponent(c.id)}`, { method: "DELETE" });
    if (r.ok || r.status === 404) {
      setExtras((e) => e.filter((x) => x.id !== c.id));
      setSeleccionadoId(null);
    } else {
      const d = await r.json().catch(() => ({}));
      alert(d.error ?? "No se pudo eliminar.");
    }
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
          clientes={modo === "nuevo" ? todos : filtrados}
          seleccionadoId={seleccionadoId}
          foco={foco}
          encuadre={encuadre}
          onSeleccionar={elegirDesdeMapa}
          radio={radio}
          onElegirPunto={elegirPunto}
          pedidos={infoPedidos}
        />
        {modo === "nuevo" && eligiendo && (
          <div className="pointer-events-none absolute inset-x-0 top-28 z-[1000] flex justify-center px-4 md:top-3">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-green-700 py-2 pl-4 pr-2 text-sm font-semibold text-white shadow-lg">
              Tocá el mapa donde está el cliente
              <button
                type="button"
                onClick={() => setEligiendo(false)}
                className="rounded-full bg-white/20 px-3 py-1 text-xs hover:bg-white/30"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
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
            {modo === "nuevo" ? (
              <h1 className="flex items-center gap-1 text-lg font-bold">
                <button
                  type="button"
                  onClick={cerrarNuevo}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="-ml-2 rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Volver a la lista"
                >
                  ←
                </button>
                Nuevo cliente
              </h1>
            ) : (
              <h1 className="text-lg font-bold">
                Clientes{" "}
                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                  ({total})
                </span>
              </h1>
            )}
            <div className="flex items-center gap-1">
              {modo === "lista" && (
                <button
                  type="button"
                  onClick={abrirNuevo}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
                >
                  + Nuevo
                </button>
              )}
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
        </div>

        {modo === "nuevo" ? (
          <div className="flex-1 overflow-y-auto overscroll-contain border-t border-slate-200 pb-[env(safe-area-inset-bottom)] dark:border-slate-800">
            <PanelNuevo
              punto={punto}
              eligiendo={eligiendo}
              radioKm={RADIO_KM}
              cercanos={cercanos}
              dbOk={dbOk}
              onPunto={elegirPunto}
              onEligiendo={cambiarEligiendo}
              onVerCliente={verCercano}
              onGuardado={guardado}
            />
          </div>
        ) : (
        <>

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
                      onEliminar={() => eliminar(c)}
                      pedido={infoPedidos.get(c.id)}
                      vecinos={vecinosPedido.get(c.id)}
                      onVerVecino={verVecino}
                    />
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
        </>
        )}
      </aside>
    </div>
  );
}

function ItemCliente({
  cliente: c,
  grupo,
  activo,
  onClick,
  onEliminar,
  pedido,
  vecinos,
  onVerVecino,
}: {
  cliente: ClienteConId;
  grupo: Grupo;
  activo: boolean;
  onClick: () => void;
  onEliminar: () => void;
  pedido?: InfoPedido;
  vecinos?: Cercano[];
  onVerVecino: (c: ClienteConId) => void;
}) {
  const color = activo
    ? "bg-orange-500"
    : {
        pedido: "bg-rose-600",
        mapa: "bg-blue-600",
        link: "bg-purple-600",
        sin: "bg-slate-400",
      }[grupo];
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
          <span className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{c.nombre}</span>
            {c.origen === "app" && (
              <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-800 dark:bg-green-500/15 dark:text-green-300">
                Nuevo
              </span>
            )}
          </span>
          <span className="block truncate text-sm text-slate-500 dark:text-slate-400">
            {c.zona || "Sin zona"}
          </span>
          {pedido && (
            <span className="mt-0.5 block text-xs font-semibold text-rose-700 dark:text-rose-300">
              📦 Pedido {pedido.cuando} · {pedido.cercanos} a menos de 5 km
            </span>
          )}
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
          {vecinos && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-bold">
                Clientes a menos de 5 km{" "}
                <span className="font-normal text-slate-500">({vecinos.length})</span>
              </p>
              <ListaCercanos cercanos={vecinos} onVer={onVerVecino} />
            </div>
          )}
          {c.origen === "app" && (
            <button
              type="button"
              onClick={onEliminar}
              className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
            >
              Eliminar este cliente
            </button>
          )}
        </div>
      )}
    </li>
  );
}
