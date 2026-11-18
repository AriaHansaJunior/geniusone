import { useCallback, useState } from "react";

export interface UseMasterDeleteResult<T> {
  deleteTarget: T | null;
  isDeleting: boolean;
  requestDelete: (item: T) => void;
  cancelDelete: () => void;
  confirmDelete: () => Promise<void>;
}

/**
 * Shared confirmation state + async delete executor for Master listing tables.
 */
export function useMasterDelete<T>(
  getId: (item: T) => string,
  onDelete?: (id: string) => Promise<void> | void
): UseMasterDeleteResult<T> {
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const requestDelete = useCallback((item: T) => {
    setDeleteTarget(item);
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteTarget((current) => (isDeleting ? current : null));
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || !onDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(getId(deleteTarget));
      setDeleteTarget(null);
    } catch {
      // Error notification is handled by caller callback; close modal so user is never trapped.
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, getId, isDeleting, onDelete]);

  return {
    deleteTarget,
    isDeleting,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
