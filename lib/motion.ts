// lib/motion.ts
// Obsidian ERP v4.0 — Framer Motion animation presets.
//
// Centralized motion variants for stagger entrance animations.
// Every page and report uses these — no bespoke animation configs.

import { Variants } from "framer-motion";

/** Container variant: stagger children with a 100ms delay between each. */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

/** Item variant: slide up and fade in. */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

/** Fast item variant: reduced delay for tight layouts. */
export const fastItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
    },
  },
};
