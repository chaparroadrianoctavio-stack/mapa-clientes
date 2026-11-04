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
import { telefonoLindo } from "@/lib/utils";
import { cuandoPedido, hoyMendoza, sumarDias } from "@/lib/fechas";
import ListaCercanos, { type Cercano } from "./ListaCercanos";

export type { Cercano };

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
  const [tienePedido, setTienePedido] = useState(true);
  const [pedido, setPedido] = useState(() => sumarDias(hoyMendoza(), 1));
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
  const puedeGuardar =
    !!punto && telOk && dbOk === true && !guardando && (!tienePedido || !!pedido);

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
          pedido: tienePedido ? pedido : undefined,
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
          <ListaCercanos cercanos={cercanos} onVer={onVerCliente} />
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
        <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/30 dark:bg-rose-500/10">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={tienePedido}
              onChange={(e) => setTienePedido(e.target.checked)}
              className="h-4 w-4 accent-rose-600"
            />
            📦 Tiene pedido
          </label>
          {tienePedido && (
            <label className="flex items-center gap-2 text-sm">
              <span className="shrink-0 text-slate-600 dark:text-slate-300">Entrega</span>
              <input
                type="date"
                value={pedido}
                onChange={(e) => setPedido(e.target.value)}
                className={input}
              />
            </label>
          )}
          {tienePedido && pedido && (
            <p className="text-xs text-rose-800 dark:text-rose-200">
              Queda marcado con pedido {cuandoPedido(pedido, hoyMendoza())} y con sus clientes a
              menos de {radioKm} km.
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="shrink-0 text-slate-500">Alta</span>
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
