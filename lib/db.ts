import "server-only";
import { Redis } from "@upstash/redis";
import type { ClienteConId } from "./tipos";

/**
 * Clientes agregados desde la app. Se guardan en Upstash Redis (se conecta
 * desde Vercel → Storage). Los del JSON siguen estando en data/clientes.json.
 *
 * Vercel crea las variables KV_REST_API_URL y KV_REST_API_TOKEN al conectar
 * la base; también se aceptan las UPSTASH_REDIS_REST_* por si se carga a mano.
 */
const URL_DB = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_DB = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const CLAVE = "clientes:nuevos";

const redis = URL_DB && TOKEN_DB ? new Redis({ url: URL_DB, token: TOKEN_DB }) : null;

export const dbConfigurada = redis !== null;

export async function listarNuevos(): Promise<ClienteConId[]> {
  if (!redis) return [];
  const todos = await redis.hgetall<Record<string, ClienteConId>>(CLAVE);
  return Object.values(todos ?? {});
}

export async function guardarNuevo(c: ClienteConId): Promise<void> {
  if (!redis) throw new Error("Base de datos no configurada");
  await redis.hset(CLAVE, { [c.id]: c });
}

export async function eliminarNuevo(id: string): Promise<boolean> {
  if (!redis) throw new Error("Base de datos no configurada");
  return (await redis.hdel(CLAVE, id)) > 0;
}
