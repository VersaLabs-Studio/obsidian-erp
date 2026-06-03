// hooks/useCommandPalette.ts
// Obsidian ERP v4.0 — Command Palette State (Zustand-backed)

"use client";

import { create } from "zustand";

interface CommandPaletteState {
  /** Whether the palette is open */
  isOpen: boolean;
  /** Open the palette */
  open: () => void;
  /** Close the palette */
  close: () => void;
  /** Toggle the palette */
  toggle: () => void;
  /** Search query */
  query: string;
  /** Set search query */
  setQuery: (query: string) => void;
}

/**
 * Command palette state management via Zustand
 *
 * @example
 * ```tsx
 * const { isOpen, open, close, toggle } = useCommandPalette();
 *
 * // Open programmatically
 * open();
 *
 * // Toggle from keyboard shortcut
 * toggle();
 * ```
 */
export const useCommandPalette = create<CommandPaletteState>((set) => ({
  isOpen: false,
  query: "",
  open: () => set({ isOpen: true, query: "" }),
  close: () => set({ isOpen: false, query: "" }),
  toggle: () =>
    set((state) => ({
      isOpen: !state.isOpen,
      query: state.isOpen ? "" : state.query,
    })),
  setQuery: (query) => set({ query }),
}));
