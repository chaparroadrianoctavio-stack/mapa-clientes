"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { ClienteConId } from "@/lib/tipos";
import { tieneCoordenadas } from "@/lib/tipos";
import { fechaCorta, inicial, telefonoLindo } from "@/lib/utils";
import Acciones from "./Acciones";

// Centro de Gran Mendoza
const CENTRO: L.LatLngTuple = [-32.97, -68.8];

export type Foco = { id: string; t: number } | null;

type Props = {
  clientes: ClienteConId[];
  seleccionadoId: string | null;
  foco: Foco;
  encuadre: number;
  onSeleccionar: (id: string) => void;
};

const iconos = new Map<string, L.DivIcon>();
function icono(letra: string, tipo: "coord" | "link", activo: boolean) {
  const clave = `${letra}|${tipo}|${activo}`;
  let i = iconos.get(clave);
  if (!i) {
    const seguro = letra.replace(/[<>&"']/g, "");
    i = L.divIcon({
      className: `pin pin-${tipo}${activo ? " pin-activo" : ""}`,
      html: `<div class="pin-cuerpo"><span>${seguro}</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 36],
      popupAnchor: [0, -34],
    });
    iconos.set(clave, i);
  }
  return i;
}

const iconoYo = L.divIcon({
  className: "yo",
  html: "<div></div>",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function Mapa(props: Props) {
  const [satelite, setSatelite] = useState(false);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={CENTRO}
        zoom={11}
        className="h-full w-full"
        zoomControl={false}
      >
        {satelite ? (
          <TileLayer
            key="esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Imágenes &copy; Esri, Maxar, Earthstar Geographics"
            maxZoom={19}
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          // OpenStreetMap exige el encabezado Referer: no usar "no-referrer".
          <TileLayer
            key="osm"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
        <Contenido {...props} />
        <MiUbicacion />
        <ControlZoom />
      </MapContainer>

      <button
        type="button"
        onClick={() => setSatelite((s) => !s)}
        className="absolute right-3 top-3 z-[1000] rounded-xl bg-white/95 px-3 py-2 text-sm font-semibold text-slate-800 shadow-lg backdrop-blur hover:bg-white dark:bg-slate-900/95 dark:text-slate-100"
      >
        {satelite ? "🗺️ Mapa" : "🛰️ Satélite"}
      </button>
    </div>
  );
}

function ControlZoom() {
  const map = useMap();
  useEffect(() => {
    const z = L.control.zoom({
      position: "topleft",
      zoomInTitle: "Acercar",
      zoomOutTitle: "Alejar",
    });
    z.addTo(map);
    return () => {
      z.remove();
    };
  }, [map]);
  return null;
}

function Contenido({
  clientes,
  seleccionadoId,
  foco,
  encuadre,
  onSeleccionar,
}: Props) {
  const map = useMap();
  const marcadores = useRef(new Map<string, L.Marker>());

  const conCoord = useMemo(() => clientes.filter(tieneCoordenadas), [clientes]);

  // Encuadrar todos los pines cuando cambian los filtros.
  useEffect(() => {
    if (!conCoord.length) return;
    const b = L.latLngBounds(conCoord.map((c) => [c.lat, c.lng]));
    map.fitBounds(b, { padding: [40, 40], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encuadre, map]);

  // Ir hasta el cliente elegido en la lista y abrir su popup.
  useEffect(() => {
    if (!foco) return;
    const m = marcadores.current.get(foco.id);
    if (!m) return;
    const destino = m.getLatLng();
    const zoom = Math.max(map.getZoom(), 15);
    map.closePopup();
    map.flyTo(destino, zoom, { duration: 0.8 });
    map.once("moveend", () => m.openPopup());
  }, [foco, map]);

  return (
    <>
      {conCoord.map((c) => (
        <Marker
          key={c.id}
          position={[c.lat, c.lng]}
          icon={icono(inicial(c.nombre), c.link ? "link" : "coord", c.id === seleccionadoId)}
          zIndexOffset={c.id === seleccionadoId ? 1000 : 0}
          ref={(m) => {
            if (m) marcadores.current.set(c.id, m);
            else marcadores.current.delete(c.id);
          }}
          eventHandlers={{ click: () => onSeleccionar(c.id) }}
        >
          <Popup minWidth={260} maxWidth={300}>
            <div className="space-y-2 font-sans">
              <div>
                <p className="text-base font-bold leading-tight">{c.nombre}</p>
                {c.zona && <p className="text-sm opacity-80">{c.zona}</p>}
                <p className="mt-1 text-xs opacity-60">
                  {fechaCorta(c.fecha)} · {telefonoLindo(c.telefono)}
                </p>
              </div>
              <Acciones cliente={c} />
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function MiUbicacion() {
  const map = useMap();
  const [pos, setPos] = useState<{ lat: number; lng: number; precision: number } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const centrar = useRef(false);
  const panel = useRef<HTMLDivElement>(null);

  // Que tocar el botón no haga zoom ni arrastre el mapa.
  useEffect(() => {
    if (!panel.current) return;
    L.DomEvent.disableClickPropagation(panel.current);
    L.DomEvent.disableScrollPropagation(panel.current);
  }, []);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  function activar() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no permite obtener la ubicación.");
      return;
    }
    if (pos) {
      map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 15));
      return;
    }
    setBuscando(true);
    centrar.current = true;
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const nueva = { lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy };
        setPos(nueva);
        setBuscando(false);
        if (centrar.current) {
          centrar.current = false;
          map.flyTo([nueva.lat, nueva.lng], 15);
        }
      },
      (e) => {
        setBuscando(false);
        setError(
          e.code === e.PERMISSION_DENIED
            ? "Permiso de ubicación denegado. Activalo en el navegador."
            : "No se pudo obtener tu ubicación.",
        );
        if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
  }

  return (
    <>
      {pos && (
        <>
          <Circle
            center={[pos.lat, pos.lng]}
            radius={pos.precision}
            pathOptions={{ color: "#0ea5e9", weight: 1, fillOpacity: 0.12 }}
          />
          <Marker position={[pos.lat, pos.lng]} icon={iconoYo} zIndexOffset={2000} />
        </>
      )}
      <div ref={panel} className="absolute right-3 top-16 z-[1000] flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={activar}
          className="rounded-xl bg-white/95 px-3 py-2 text-sm font-semibold text-slate-800 shadow-lg backdrop-blur hover:bg-white dark:bg-slate-900/95 dark:text-slate-100"
        >
          {buscando ? "Buscando…" : "📍 Mi ubicación"}
        </button>
        {error && (
          <p className="max-w-56 rounded-lg bg-red-600 px-3 py-2 text-xs text-white shadow-lg">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
