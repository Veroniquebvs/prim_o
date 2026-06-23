export const AVATAR_COUNT = 6;

export function getAvatarUrl(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const index = (hash % AVATAR_COUNT) + 1;
  return `/assets/av_${index}.png`;
}

export function getStoredAvatar(userId: string): number {
  const saved = localStorage.getItem(`primo_avatar_${userId}`);
  if (saved) {
    const n = parseInt(saved);
    if (n >= 1 && n <= AVATAR_COUNT) return n;
  }
  return 1;
}

export function saveAvatar(userId: string, index: number): void {
  localStorage.setItem(`primo_avatar_${userId}`, String(index));
}
