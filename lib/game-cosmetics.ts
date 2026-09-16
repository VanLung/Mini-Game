export const AVATARS = [
  { id: "fox", emoji: "🦊", name: "Cáo Lửa", color: "#ff8a55" },
  { id: "panda", emoji: "🐼", name: "Gấu Trúc", color: "#d9d9e3" },
  { id: "robot", emoji: "🤖", name: "Robot", color: "#8bd8ff" },
  { id: "alien", emoji: "👽", name: "Người Ngoài Hành Tinh", color: "#9aef9b" },
  { id: "ninja", emoji: "🥷", name: "Ninja", color: "#b9a8ff" },
  { id: "dino", emoji: "🦖", name: "Khủng Long", color: "#ffd66b" },
] as const;

export const THROW_ITEMS = [
  { id: "egg", emoji: "🥚", name: "Trứng lắc lư", splat: "🍳" },
  { id: "tomato", emoji: "🍅", name: "Cà chua siêu tốc", splat: "💥" },
  { id: "water", emoji: "💧", name: "Bóng nước", splat: "💦" },
  { id: "slime", emoji: "🟢", name: "Slime xanh", splat: "🫠" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];
export type ThrowItemId = (typeof THROW_ITEMS)[number]["id"];

export function avatarFor(id?: string) {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[2];
}

export function throwItemFor(id?: string) {
  return THROW_ITEMS.find((item) => item.id === id) ?? THROW_ITEMS[0];
}
