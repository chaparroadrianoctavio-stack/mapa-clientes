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
  useMapEvents,
} from "react-leaflet";
import type { ClienteConId } from "@/lib/tipos";
import type { Coord } from "@/lib/coordenadas";
import { tieneCoordenadas } from "@/lib/tipos";
import { fechaCorta, inicial, telefonoLindo } from "@/lib/utils";
import Acciones from "./Acciones";

// Centro de Gran Mendoza
const CENTRO: L.LatLngTuple = [-32.97, -68.8];

/**
 * Pedido de "ir hasta" un cliente. Si trae radioKm, encuadra todo el círculo
 * a su alrededor; padAbajo deja lugar para el panel del celular.
 */
export type Foco = {
  id: string;
  t: number;
  radioKm?: number;
  padAbajo?: number;
  sinPopup?: boolean;
} | null;

/**
 * Círculo de búsqueda de cercanos. Se usa al cargar un cliente nuevo
 * (editable: el pin verde se arrastra y se puede tocar el mapa) y al elegir un
 * cliente con pedido (fijo, centrado en ese cliente).
 */
export type Radio = {
  punto: Coord | null;
  radioKm: number;
  eligiendo: boolean;
  cercanos: Set<string>;
  editable: boolean;
};

export type InfoPedido = { cuando: string; cercanos: number };

type Props = {
  clientes: ClienteConId[];
  seleccionadoId: string | null;
  foco: Foco;
  encuadre: number;
  onSeleccionar: (id: string) => void;
  radio: Radio | null;
  onElegirPunto: (c: Coord) => void;
  pedidos: Map<string, InfoPedido>;
};

type Estado = "normal" | "activo" | "cerca" | "pedido";

const iconos = new Map<string, L.DivIcon>();
function icono(letra: string, tipo: "coord" | "link", estado: Estado) {
  const clave = `${letra}|${tipo}|${estado}`;
  let i = iconos.get(clave);
  if (!i) {
    const seguro = letra.replace(/[<>&"']/g, "");
    i = L.divIcon({
      className: `pin pin-${tipo}${estado === "normal" ? "" : ` pin-${estado}`}`,
      html: `<div class="pin-cuerpo"><span>${seguro}</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 36],
      popupAnchor: [0, -34],
    });
    iconos.set(clave, i);
  }
  return i;
}

const iconoNuevo = L.divIcon({
  className: "pin pin-nuevo",
  html: '<div class="pin-cuerpo"><span>+</span></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 36],
});

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
        {props.radio && (
          <CapaRadio radio={props.radio} onElegirPunto={props.onElegirPunto} />
        )}
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
  radio,
  pedidos,
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
    map.closePopup();
    if (foco.radioKm) {
      map.flyToBounds(destino.toBounds(foco.radioKm * 2000), {
        duration: 0.8,
        paddingTopLeft: [20, 20],
        paddingBottomRight: [20, 20 + (foco.padAbajo ?? 0)],
      });
    } else {
      map.flyTo(destino, Math.max(map.getZoom(), 15), { duration: 0.8 });
    }
    if (!foco.sinPopup) map.once("moveend", () => m.openPopup());
  }, [foco, map]);

  return (
    <>
      {conCoord.map((c) => (
        <Marker
          key={c.id}
          position={[c.lat, c.lng]}
          icon={icono(
            inicial(c.nombre),
            c.link ? "link" : "coord",
            c.id === seleccionadoId
              ? "activo"
              : radio?.cercanos.has(c.id)
                ? "cerca"
                : pedidos.has(c.id)
                  ? "pedido"
                  : "normal",
          )}
          zIndexOffset={c.id === seleccionadoId ? 1000 : pedidos.has(c.id) ? 500 : 0}
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
                {pedidos.has(c.id) && (
                  <p className="mt-1.5 rounded-md bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-500/20 dark:text-rose-200">
                    📦 Pedido {pedidos.get(c.id)!.cuando} · {pedidos.get(c.id)!.cercanos}{" "}
                    {pedidos.get(c.id)!.cercanos === 1 ? "cliente" : "clientes"} a menos de 5 km
                  </p>
                )}
              </div>
              <Acciones cliente={c} />
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

/** Círculo del radio de búsqueda (+ pin verde arrastrable si es un cliente nuevo). */
function CapaRadio({
  radio,
  onElegirPunto,
}: {
  radio: Radio;
  onElegirPunto: (c: Coord) => void;
}) {
  const map = useMap();
  const { punto, radioKm, eligiendo, editable } = radio;

  useMapEvents({
    click(e) {
      if (eligiendo) onElegirPunto({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  // Cursor en cruz mientras se elige el lugar.
  useEffect(() => {
    const el = map.getContainer();
    el.classList.toggle("eligiendo", eligiendo);
    return () => el.classList.remove("eligiendo");
  }, [map, eligiendo]);

  // Cliente nuevo: mostrar todo el círculo si quedó fuera de la vista.
  useEffect(() => {
    if (!punto || !editable) return;
    const b = L.latLng(punto.lat, punto.lng).toBounds(radioKm * 2000);
    if (!map.getBounds().contains(b)) map.fitBounds(b, { padding: [20, 20] });
  }, [map, punto, radioKm, editable]);

  if (!punto) return null;
  return (
    <>
      <Circle
        center={[punto.lat, punto.lng]}
        radius={radioKm * 1000}
        pathOptions={{
          color: editable ? "#16a34a" : "#e11d48",
          weight: 2,
          dashArray: "6 6",
          fillOpacity: 0.08,
        }}
        interactive={false}
      />
      {editable && (
      <Marker
        position={[punto.lat, punto.lng]}
        icon={iconoNuevo}
        draggable
        zIndexOffset={1500}
        eventHandlers={{
          dragend: (e) => {
            const ll = (e.target as L.Marker).getLatLng();
            onElegirPunto({ lat: ll.lat, lng: ll.lng });
          },
        }}
      />
      )}
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
