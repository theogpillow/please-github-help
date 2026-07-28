import type { Prototype } from '@workspace/api-client-react';

const KEY = 'nitra_saved_prototypes';

export function getSaved(): Prototype[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePrototype(proto: Prototype): void {
  const existing = getSaved();
  if (!existing.find(p => p.id === proto.id)) {
    localStorage.setItem(KEY, JSON.stringify([proto, ...existing]));
  }
}

export function unsavePrototype(id: number): void {
  const existing = getSaved();
  localStorage.setItem(KEY, JSON.stringify(existing.filter(p => p.id !== id)));
}

export function isSaved(id: number): boolean {
  return getSaved().some(p => p.id === id);
}
