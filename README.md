# Mapa de clientes

Mapa privado de clientes de la distribuidora (Mendoza). Next.js + Leaflet,
protegido con usuario y contraseña.

## Agregar los clientes de un mes nuevo

1. Creá un CSV en `data/csv/`, por ejemplo `data/csv/2026-10.csv`, con este formato
   (el encabezado es opcional):

   ```
   fecha,nombre,zona,telefono,lat,lng,link
   3/10,Laura,Godoy Cruz · 12 km,5492611234567,-32.92,-68.84,
   5/10,Pedro,Luján,5492617654321,,,https://maps.app.goo.gl/XXXX
   7/10,Rosa,Retira por casa,5492619998888,,,
   ```

   - `fecha`: día/mes (ej. `3/10`).
   - `telefono`: con código de país, sin `+` ni espacios (`549` + área + número).
   - `lat`/`lng`: dejalos vacíos si no los tenés.
   - `link`: opcional, un link de Google Maps (sirven los cortos `maps.app.goo.gl`).
   - La zona puede tener comas (`13,2 km`), no hay problema.

2. Importalo (el último número es el año):

   ```bash
   npm run importar -- data/csv/2026-10.csv 2026
   ```

   Si un cliente ya existe (misma fecha y teléfono) no se duplica.

3. Si hay clientes con link y sin coordenadas, resolvé los links:

   ```bash
   npm run resolver-links
   ```

4. Subí los cambios. Vercel publica solo:

   ```bash
   git add data
   git commit -m "Clientes de octubre 2026"
   git push
   ```

También podés editar `data/clientes.json` a mano: cada cliente es
`{ fecha: "AAAA-MM-DD", nombre, zona, telefono, lat, lng, link?, mes: "AAAA-MM" }`.

## Cargar un cliente nuevo desde la app

Tocá **+ Nuevo** en el panel:

1. Elegí dónde está: pegá un link de Google Maps o coordenadas, tocá
   **Tocar en el mapa**, o usá **Estoy acá**. El pin verde se puede arrastrar.
2. Aparecen los clientes a menos de 5 km (en verde en el mapa), ordenados por
   distancia, con WhatsApp, Llamar y Cómo llegar.
3. Completá nombre y teléfono y tocá **Guardar cliente**.

Los clientes cargados así se guardan en la base de datos (no en el JSON) y
llevan la etiqueta "Nuevo". Solo esos se pueden eliminar desde la app.
El radio de 5 km se cambia en `RADIO_KM` (`components/MapaApp.tsx`).

### Conectar la base de datos en Vercel (una sola vez)

1. En el proyecto de Vercel: **Storage → Create Database → Upstash for Redis**
   (plan gratuito) → elegí la región más cercana → **Connect** al proyecto.
2. Eso crea solas las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
3. **Deployments → ⋯ → Redeploy**.

Sin la base conectada la app funciona igual y muestra los cercanos, pero no
deja guardar.

## Desarrollo local

Creá `.env.local` con:

```
APP_USER=tu_usuario
APP_PASSWORD=tu_contraseña
# Opcional, para poder guardar clientes nuevos (copiarlas de Vercel → Storage):
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

y corré `npm run dev` → http://localhost:3000

## Grupos de la lista

- **En el mapa**: tienen lat/lng cargados en el CSV.
- **Ubicación por link**: la ubicación salió de un link de Google Maps
  (aparecen en el mapa en violeta si el link se pudo resolver).
- **Sin ubicación**: ni coordenadas ni link.
