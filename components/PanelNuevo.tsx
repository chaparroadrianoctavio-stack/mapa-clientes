"use client";

import { useState } from "react";
import type { ClienteConId } from "@/lib/tipos";
import {
  esLinkGoogleMaps,
  extraerCoordenadas,
  parsearCoordenadas,
  type Coord,
} from "@/lib/coordenadas";
import { normalizarTelefono, telefonoValido } from "@/lib/telefono";
import { inicial, telefonoLindo } from "@/lib/utils";
import Acciones from "./Acciones";

export type Cercano = { cliente: ClienteConId; km: number };

type Props = {
  punto: Coord | null;
  eligiendo: boolean;
  radioKm: number;
  cercanos: Cercano[];
  dbOk: boolean | null;
  onPunto: (c: Coord) => void;
  onEligiendo: (v: boolean) => void;
  onVerCliente: (c: ClienteConId) => void;
  onGuardado: (c: ClienteConId) => void;
};

function hoyMendoza() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Mendoza",
  }).format(new Date());
}

const formatoKm = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

const input =
  "w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/30 dark:border-slate-700 dark:bg-slate-800 md:text-sm";
const boton =
  "flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800";

export default function PanelNuevo({
  punto,
  eligiendo,
  radioKm,
  cercanos,
  dbOk,
  onPunto,
  onEligiendo,
  onVerCliente,
  onGuardado,
}: Props) {
  const [ubicacionTxt, setUbicacionTxt] = useState("");
  const [link, setLink] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [zona, setZona] = useState("");
  const [fecha, setFecha] = useState(hoyMendoza);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscarUbicacion() {
    setError(null);
    const t = ubicacionTxt.trim();
    if (!t) return;

    const coord = parsearCoordenadas(t);
    if (coord) {
      onPunto(coord);
      return;
    }
    if (!esLinkGoogleMaps(t)) {
      setError("Pegá un link de Google Maps o coordenadas (ej: -32.95, -68.83).");
      return;
    }
    setLink(t);
    const directo = extraerCoordenadas(t);
    if (directo) {
      onPunto(directo);
      return;
    }
    // Link corto: lo resuelve el servidor (el navegador no puede seguirlo).
    setBuscando(true);
    try {
      const r = await fetch("/api/resolver-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: t }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "No se pudo leer el link.");
      onPunto(d as Coord);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBuscando(false);
    }
  }

  function usarMiUbicacion() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no permite obtener la ubicación.");
      return;
    }
    setBuscando(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBuscando(false);
        onPunto({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      (e) => {
        setBuscando(false);
        setError(
          e.code === e.PERMISSION_DENIED
            ? "Permiso de ubicación denegado. Activalo en el navegador."
            : "No se pudo obtener tu ubicación.",
        );
      },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  }

  const telNormal = normalizarTelefono(telefono);
  const telOk = telefonoValido(telNormal);
  const puedeGuardar = !!punto && telOk && dbOk === true && !guardando;

  async function guardar() {
    if (!punto || !puedeGuardar) return;
    setError(null);
    setGuardando(true);
    try {
      const r = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          telefono: telNormal,
          zona,
          fecha,
          link: link || undefined,
          lat: punto.lat,
          lng: punto.lng,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "No se pudo guardar.");
      onGuardado(d.cliente as ClienteConId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-5 px-4 pb-6 pt-3">
      {/* 1. Ubicación */}
      <section className="space-y-2">
        <h3 className="text-sm font-bold">1. ¿Dónde está?</h3>
        <div className="flex gap-2">
          <input
            value={ubicacionTxt}
            onChange={(e) => setUbicacionTxt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscarUbicacion()}
            placeholder="Link de Google Maps o coordenadas"
            className={input}
          />
          <button
            type="button"
            onClick={buscarUbicacion}
            disabled={buscando || !ubicacionTxt.trim()}
            className="shrink-0 rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {buscando ? "…" : "Buscar"}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEligiendo(!eligiendo)}
            className={`${boton} ${eligiendo ? "border-green-600 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" : ""}`}
          >
            👆 {eligiendo ? "Tocá el mapa…" : "Tocar en el mapa"}
          </button>
          <button type="button" onClick={usarMiUbicacion} disabled={buscando} className={boton}>
            📍 Estoy acá
          </button>
        </div>
        {punto && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ubicación: {punto.lat.toFixed(5)}, {punto.lng.toFixed(5)} · Podés arrastrar el pin
            verde para ajustarla.
          </p>
        )}
      </section>

      {/* 2. Cercanos */}
      {punto && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold">
            2. Clientes a menos de {radioKm} km{" "}
            <span className="font-normal text-slate-500">({cercanos.length})</span>
          </h3>
          {cercanos.length === 0 ? (
            <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-500 dark:bg-slate-800">
              No hay clientes cerca de este punto.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {cercanos.map(({ cliente: c, km }) => (
                <li key={c.id} className="space-y-2 p-3">
                  <button
                    type="button"
                    onClick={() => onVerCliente(c)}
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
          )}
        </section>
      )}

      {/* 3. Datos y guardar */}
      <section className="space-y-2">
        <h3 className="text-sm font-bold">{punto ? "3." : "2."} Datos del cliente</h3>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          className={input}
          maxLength={80}
        />
        <div>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Teléfono (ej: 261 555-1234)"
            inputMode="tel"
            className={input}
          />
          {telefono && (
            <p className={`mt-1 text-xs ${telOk ? "text-slate-500" : "text-red-600"}`}>
              {telOk ? `Se guarda como ${telefonoLindo(telNormal)}` : "Teléfono incompleto"}
            </p>
          )}
        </div>
        <input
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          placeholder="Zona o dirección (opcional)"
          className={input}
          maxLength={120}
        />
        <label className="flex items-center gap-2 text-sm">
          <span className="shrink-0 text-slate-500">Fecha</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={input}
          />
        </label>

        {dbOk === false && (
          <p className="rounded-xl bg-amber-100 p-3 text-xs text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
            Todavía no está conectada la base de datos en Vercel, así que no se puede guardar.
            Igual podés ver los clientes cercanos.
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-red-100 p-3 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-200">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={guardar}
          disabled={!puedeGuardar}
          className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar cliente"}
        </button>
        {!punto && (
          <p className="text-center text-xs text-slate-500">Primero elegí la ubicación.</p>
        )}
      </section>
    </div>
  );
}
