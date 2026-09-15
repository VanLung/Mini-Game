import { Redis } from "@upstash/redis";
import type { GameRoom } from "@/lib/game-types";

const ROOM_TTL_SECONDS = 6 * 60 * 60;
const keyFor = (code: string) => `cyber-city:room:${code}`;

type MemoryState = Map<string, GameRoom>;

declare global {
  var __cyberCityRooms: MemoryState | undefined;
}

const memoryRooms = globalThis.__cyberCityRooms ?? new Map<string, GameRoom>();
const allowMemoryStore = process.env.NODE_ENV !== "production" || process.env["ALLOW_MEMORY_STORE"] === "1";
if (allowMemoryStore) globalThis.__cyberCityRooms = memoryRooms;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function storageReady() {
  return allowMemoryStore || Boolean(getRedis());
}

export async function createRoom(room: GameRoom): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    if (!allowMemoryStore) throw new Error("STORAGE_NOT_CONFIGURED");
    if (memoryRooms.has(room.code)) return false;
    memoryRooms.set(room.code, clone(room));
    return true;
  }

  const result = await redis.set(keyFor(room.code), room, { ex: ROOM_TTL_SECONDS, nx: true });
  return result === "OK";
}

export async function readRoom(code: string): Promise<GameRoom | null> {
  const redis = getRedis();
  if (!redis) {
    if (!allowMemoryStore) throw new Error("STORAGE_NOT_CONFIGURED");
    const room = memoryRooms.get(code);
    return room ? clone(room) : null;
  }
  return redis.get<GameRoom>(keyFor(code));
}

const CAS_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return -1 end
local current = cjson.decode(raw)
if tonumber(current.revision) ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3]))
return 1
`;

export async function mutateRoom<T>(
  code: string,
  mutate: (room: GameRoom) => { room: GameRoom; result: T } | { error: string },
): Promise<{ result: T } | { error: string }> {
  const redis = getRedis();

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const current = await readRoom(code);
    if (!current) return { error: "ROOM_NOT_FOUND" };
    const outcome = mutate(clone(current));
    if ("error" in outcome) return outcome;
    outcome.room.revision = current.revision + 1;

    if (!redis) {
      const latest = memoryRooms.get(code);
      if (!latest) return { error: "ROOM_NOT_FOUND" };
      if (latest.revision !== current.revision) continue;
      memoryRooms.set(code, clone(outcome.room));
      return { result: outcome.result };
    }

    const saved = await redis.eval<string[], number>(
      CAS_SCRIPT,
      [keyFor(code)],
      [String(current.revision), JSON.stringify(outcome.room), String(ROOM_TTL_SECONDS)],
    );
    if (saved === 1) return { result: outcome.result };
    if (saved === -1) return { error: "ROOM_NOT_FOUND" };
    await new Promise((resolve) => setTimeout(resolve, 8 + Math.random() * 18));
  }

  return { error: "ROOM_BUSY" };
}
