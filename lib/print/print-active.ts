// lib/print/print-active.ts
// Obsidian ERP v4.0 — 2Y-R3: coordinate which PrintMenu is printing.
//
// Every PrintMenu renders a hidden PrintDocument. If ALL of them were in the
// DOM at print time, window.print() would print the SO + WO + every JC at
// once. We track the single "active" printer so only its PrintDocument is
// mounted when the print dialog opens.

let activeId: string | null = null;
const listeners = new Set<() => void>();

export function setActivePrintId(id: string | null): void {
  activeId = id;
  listeners.forEach((l) => l());
}

export function getActivePrintId(): string | null {
  return activeId;
}

export function subscribeActivePrintId(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
