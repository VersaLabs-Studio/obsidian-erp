// hooks/useDeleteWithConfirmation.ts
// Obsidian ERP v4.0 - Reusable Delete with Confirmation Hook

import { useState, useCallback } from "react";
import { useFrappeDelete } from "@/hooks/generic";

interface DeleteTarget {
  name: string;
  displayName?: string;
}

interface UseDeleteWithConfirmationOptions {
  /** Success callback after deletion */
  onSuccess?: () => void;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Custom success message */
  successMessage?: string;
}

/**
 * Reusable hook for delete operations with confirmation dialog
 *
 * @example
 * ```tsx
 * function ItemsListPage() {
 *   const deleteHandler = useDeleteWithConfirmation("Item", {
 *     onSuccess: () => router.push("/stock/item"),
 *   });
 *
 *   return (
 *     <>
 *       <Button onClick={() => deleteHandler.open({ name: item.name, displayName: item.item_name })}>
 *         Delete
 *       </Button>
 *
 *       <ConfirmDialog
 *         open={deleteHandler.isOpen}
 *         onOpenChange={(open) => !open && deleteHandler.close()}
 *         title="Delete Item"
 *         description={`Are you sure you want to delete "${deleteHandler.target?.displayName}"?`}
 *         confirmText="Delete"
 *         variant="destructive"
 *         onConfirm={deleteHandler.confirm}
 *         loading={deleteHandler.isPending}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useDeleteWithConfirmation(
  doctype: string,
  options?: UseDeleteWithConfirmationOptions
) {
  const [target, setTarget] = useState<DeleteTarget | null>(null);

  const deleteMutation = useFrappeDelete(doctype, {
    successMessage:
      options?.successMessage || `${doctype} deleted successfully`,
    onSuccess: () => {
      setTarget(null);
      options?.onSuccess?.();
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });

  /**
   * Open the confirmation dialog for a specific item
   */
  const open = useCallback((item: DeleteTarget) => {
    setTarget(item);
  }, []);

  /**
   * Close the confirmation dialog without deleting
   */
  const close = useCallback(() => {
    setTarget(null);
  }, []);

  /**
   * Confirm the deletion
   */
  const confirm = useCallback(async () => {
    if (!target) return;
    await deleteMutation.mutateAsync(target.name);
  }, [target, deleteMutation]);

  return {
    /** The item targeted for deletion */
    target,
    /** Whether the confirmation dialog should be open */
    isOpen: target !== null,
    /** Open the confirmation dialog */
    open,
    /** Close the confirmation dialog */
    close,
    /** Confirm and execute the deletion */
    confirm,
    /** Whether the deletion is in progress */
    isPending: deleteMutation.isPending,
    /** Whether the deletion failed */
    isError: deleteMutation.isError,
    /** The error if deletion failed */
    error: deleteMutation.error,
  };
}

export default useDeleteWithConfirmation;
