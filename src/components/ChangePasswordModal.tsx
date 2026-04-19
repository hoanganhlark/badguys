import { Button, Form, Input, Modal, Space } from "antd";
import type { FormInstance } from "antd/es/form";
import { useTranslation } from "react-i18next";

type ChangePasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type Props = {
  open: boolean;
  submitting: boolean;
  error: string;
  form: FormInstance<ChangePasswordValues>;
  onCancel: () => void;
  onSubmit: (values: ChangePasswordValues) => Promise<void>;
  onClearError: () => void;
};

export default function ChangePasswordModal({
  open,
  submitting,
  error,
  form,
  onCancel,
  onSubmit,
  onClearError,
}: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      title={t("app.changePasswordTitle")}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={onSubmit}
        onValuesChange={() => {
          if (error) onClearError();
        }}
      >
        <Form.Item
          name="currentPassword"
          label={t("app.currentPassword")}
          rules={[{ required: true, message: t("app.fillAllFields") }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label={t("app.newPassword")}
          rules={[
            { required: true, message: t("app.fillAllFields") },
            { min: 4, message: t("app.newPasswordMinLength") },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label={t("app.confirmNewPassword")}
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: t("app.fillAllFields") },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(t("app.confirmPasswordMismatch")),
                );
              },
            }),
          ]}
          validateStatus={error ? "error" : ""}
          help={error || undefined}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>

        <Space style={{ width: "100%", justifyContent: "end" }}>
          <Button onClick={onCancel}>{t("common.cancel")}</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {submitting ? t("app.saving") : t("app.savePassword")}
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}
