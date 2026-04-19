import { useEffect, useState } from "react";
import { Button, Form, Input, Modal, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

type LoginModalProps = {
  open: boolean;
  redirectTo: string;
  onClose: () => void;
  onSuccess: (target: string) => void;
};

export default function LoginModal({
  open,
  redirectTo,
  onClose,
  onSuccess,
}: LoginModalProps) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [form] = Form.useForm<{ username: string; password: string }>();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setError("");
      setSubmitting(false);
    }
  }, [form, open]);

  async function handleSubmit(values: { username: string; password: string }) {
    setSubmitting(true);
    setError("");

    try {
      await login(values.username.trim(), values.password);
      onSuccess(redirectTo);
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : t("login.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      title={
        <div>
          <Typography.Title
            level={3}
            style={{ margin: 0, fontSize: 24, lineHeight: 1.2 }}
          >
            {t("login.title")}
          </Typography.Title>
          <Typography.Paragraph
            style={{ margin: "6px 0 0", color: "rgba(0, 0, 0, 0.65)" }}
          >
            {t("login.subtitleModal")}
          </Typography.Paragraph>
        </div>
      }
      centered
      styles={{
        body: {
          paddingTop: 12,
        },
      }}
      width={480}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
        onValuesChange={() => {
          if (error) setError("");
        }}
      >
        <Form.Item
          name="username"
          label={t("login.username")}
          rules={[{ required: true, message: "Vui lòng nhập tên đăng nhập." }]}
        >
          <Input autoFocus autoComplete="username" />
        </Form.Item>

        <Form.Item
          name="password"
          label={t("login.password")}
          rules={[{ required: true, message: "Vui lòng nhập mật khẩu." }]}
          validateStatus={error ? "error" : ""}
          help={error || undefined}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={submitting}
          block
          size="large"
          style={{ marginTop: 8 }}
        >
          {submitting ? t("login.submitting") : t("common.login")}
        </Button>
      </Form>
    </Modal>
  );
}
