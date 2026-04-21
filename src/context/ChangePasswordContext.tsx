import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Form } from "antd";
import { useAuth } from "./AuthContext";
import { useTranslation } from "react-i18next";
import {
  getUserByUsername,
  updateUserPassword,
} from "../lib/api";
import { hashMd5 } from "../lib/hash";

interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type ChangePasswordContextValue = {
  open: boolean;
  error: string;
  submitting: boolean;
  form: any;
  handleOpen: () => void;
  handleClose: () => void;
  handleSubmit: (values: ChangePasswordValues) => Promise<void>;
  clearError: () => void;
};

const ChangePasswordContext = createContext<
  ChangePasswordContextValue | undefined
>(undefined);

interface ChangePasswordProviderProps {
  children: ReactNode;
  showToast: (message: string) => void;
}

export function ChangePasswordProvider({
  children,
  showToast,
}: ChangePasswordProviderProps) {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [form] = Form.useForm<ChangePasswordValues>();

  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Close modal when user logs out
  useEffect(() => {
    if (!currentUser && open) {
      setOpen(false);
      setError("");
    }
  }, [currentUser, open]);

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
      showToast(t("app.toastPasswordChanged"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("app.changePasswordFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const value: ChangePasswordContextValue = {
    open,
    error,
    submitting,
    form,
    handleOpen,
    handleClose,
    handleSubmit,
    clearError: () => setError(""),
  };

  return (
    <ChangePasswordContext.Provider value={value}>
      {children}
    </ChangePasswordContext.Provider>
  );
}

export function useChangePasswordContext() {
  const context = useContext(ChangePasswordContext);
  if (!context) {
    throw new Error(
      "useChangePasswordContext must be used within ChangePasswordProvider"
    );
  }
  return context;
}
