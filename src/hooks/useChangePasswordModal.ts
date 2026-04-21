import { useState } from "react";
import { Form } from "antd";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import {
  getUserByUsername,
  updateUserPassword,
} from "../lib/api";
import { hashMd5 } from "../lib/hash";

export interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function useChangePasswordModal(onSuccess: (message: string) => void) {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [form] = Form.useForm<ChangePasswordValues>();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    setError("");
    form.resetFields();
  };

  const handleClose = () => {
    setOpen(false);
    setError("");
    form.resetFields();
  };

  const handleSubmit = async (values: ChangePasswordValues) => {
    if (!currentUser) {
      setError(t("app.notLoggedIn"));
      return;
    }

    const currentPassword = String(values.currentPassword || "");
    const newPassword = String(values.newPassword || "");
    const confirmPassword = String(values.confirmPassword || "");

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t("app.fillAllFields"));
      return;
    }

    if (newPassword.length < 4) {
      setError(t("app.newPasswordMinLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("app.confirmPasswordMismatch"));
      return;
    }

    if (newPassword === currentPassword) {
      setError(t("app.newPasswordMustDiffer"));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const userRecord = await getUserByUsername(currentUser.username);
      if (!userRecord || userRecord.id !== currentUser.userId) {
        throw new Error(t("app.currentAccountNotFound"));
      }

      const currentPasswordHash = hashMd5(currentPassword);
      if (currentPasswordHash !== userRecord.password) {
        throw new Error(t("app.currentPasswordIncorrect"));
      }

      await updateUserPassword(userRecord.id, hashMd5(newPassword));

      form.resetFields();
      handleClose();
      onSuccess(t("app.toastPasswordChanged"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("app.changePasswordFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return {
    open,
    error,
    submitting,
    form,
    handleOpen,
    handleClose,
    handleSubmit,
    clearError: () => setError(""),
  };
}
