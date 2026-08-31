// lib/accounting/payment-allocation.ts
// Obsidian ERP v4.0 — Payment Entry allocation reconciliation (2U §A3).
//
// THE BUG THIS FIXES: the PE wizard let `paid_amount` (step 1) and each
// reference's `allocated_amount` (step 2) drift apart. ERPNext's
// `payment_entry.on_submit` enforces `difference_amount == 0`, i.e.
// `paid_amount === Σ allocated_amount` (single-currency). A partial payment
// — type 5,000 against a 10,000 invoice whose allocation auto-filled to the
// full 10,000 — therefore failed submit with "Difference Amount must be zero".
//
// THE MODEL: `paid_amount` is authoritative. We distribute it across the
// referenced invoices in order, capping each allocation at that invoice's
// outstanding amount. The posted `paid_amount` is the SUM of the resulting
// allocations (i.e. min(typed, total outstanding)), so the difference is
// always zero and a partial payment "just works":
//
//   distribute(5000, [{outstanding: 10000}])  → alloc 5000,  paid 5000
//   distribute(10000,[{outstanding: 10000}])  → alloc 10000, paid 10000
//   distribute(15000,[{out:10000},{out:8000}])→ alloc 10000+5000, paid 15000
//
// With no named references it's an on-account payment: keep the typed amount.

export interface AllocatableRef {
  reference_doctype?: string;
  reference_name?: string;
  allocated_amount?: number;
  total_amount?: number;
  outstanding_amount?: number;
}

export interface DistributedAllocation<T extends AllocatableRef> {
  /** References with a positive allocation (empties dropped). */
  references: T[];
  /** Σ allocated — the amount to post as paid_amount / received_amount. */
  paidAmount: number;
}

export function distributeAllocations<T extends AllocatableRef>(
  paidAmount: number,
  references: readonly T[],
): DistributedAllocation<T> {
  const named = references.filter((r) => r.reference_name);
  if (named.length === 0) {
    // On-account payment — no invoice references; keep the typed amount.
    return { references: [], paidAmount: Math.max(0, Number(paidAmount) || 0) };
  }

  let remaining = Math.max(0, Number(paidAmount) || 0);
  const distributed: T[] = [];
  for (const r of named) {
    const outstanding = Number(r.outstanding_amount) || 0;
    // Cap to the invoice's outstanding when known; otherwise let it absorb
    // whatever is left (drafts may not carry outstanding_amount).
    const cap = outstanding > 0 ? outstanding : remaining;
    const alloc = Math.max(0, Math.min(remaining, cap));
    remaining -= alloc;
    if (alloc > 0) {
      distributed.push({ ...r, allocated_amount: alloc });
    }
  }

  const paid = distributed.reduce(
    (sum, r) => sum + (Number(r.allocated_amount) || 0),
    0,
  );
  return { references: distributed, paidAmount: paid };
}
