import { useState, useCallback } from "react";
import { getUserByUsername, updateUserPassword } from "../../../lib/api";
import { hashMd5 } from "../../../lib/hash";
import type { AuthUser } from "../../../types";

export interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UsePasswordChangeReturn {
  isSubmitting: boolean;
  error: string;
  clearError: () => void;
  submitPasswordChange: (
    currentUser: AuthUser,
    payload: PasswordChangePayload,
  ) => Promise<boolean>;
}

/**
 * Hook for managing password change validation and submission to Firestore.
 * Validates current password, password requirements, and confirmation.
 * Updates user password in Firestore after validation.
 *
 * @returns {UsePasswordChangeReturn} Object containing:
 *   - isSubmitting: Loading flag during password update
 *   - error: Error message from validation or submission
 *   - clearError: Reset error state
 *   - submitPasswordChange: Async function to change password (currentUser, payload) -> boolean
 *
 * @example
 * const { isSubmitting, error, submitPasswordChange } = usePasswordChange();
 * const success = await submitPasswordChange(user, {
 *   currentPassword: 'old',
 *   newPassword: 'new',
 *   confirmPassword: 'new'
 * });
 */
export function usePasswordChange(): UsePasswordChangeReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const clearError = useCallback(() => {
    setError("");
  }, []);

  const submitPasswordChange = useCallback(
    async (
      currentUser: AuthUser,
      payload: PasswordChangePayload,
    ): Promise<boolean> => {
      const currentPassword = String(payload.currentPassword || "");
      const newPassword = String(payload.newPassword || "");
      const confirmPassword = String(payload.confirmPassword || "");

      if (!currentPassword || !newPassword || !confirmPassword) {
        setError("Please fill all fields");
        return false;
      }

      if (newPassword.length < 4) {
        setError("New password must be at least 4 characters");
        return false;
      }

      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        return false;
      }

      if (newPassword === currentPassword) {
        setError("New password must be different from current password");
        return false;
      }

      setIsSubmitting(true);
      setError("");

      try {
        const userRecord = await getUserByUsername(currentUser.username);
        if (!userRecord || userRecord.id !== currentUser.userId) {
          throw new Error("Account not found");
        }

        const currentPasswordHash = hashMd5(currentPassword);
        if (currentPasswordHash !== userRecord.password) {
          throw new Error("Current password is incorrect");
        }

        await updateUserPassword(userRecord.id, hashMd5(newPassword));
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to change password",
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return {
    isSubmitting,
    error,
    clearError,
    submitPasswordChange,
  };
}
