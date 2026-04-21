import ChangePasswordModal from "./ChangePasswordModal";
import { useChangePasswordContext } from "../context/ChangePasswordContext";

export default function GlobalChangePasswordModal() {
  const {
    open,
    error,
    submitting,
    form,
    handleClose,
    handleSubmit,
    clearError,
  } = useChangePasswordContext();

  return (
    <ChangePasswordModal
      open={open}
      submitting={submitting}
      error={error}
      form={form}
      onCancel={handleClose}
      onSubmit={handleSubmit}
      onClearError={clearError}
    />
  );
}
