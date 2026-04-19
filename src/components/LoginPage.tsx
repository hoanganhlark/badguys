import { useState } from "react";
import { Button, Card, Flex, Form, Input, Space, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [form] = Form.useForm<{ username: string; password: string }>();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo =
    (
      (location.state as LocationState | null)?.from || "/dashboard/ranking"
    ).trim() || "/dashboard/ranking";

  async function handleSubmit(values: { username: string; password: string }) {
    setSubmitting(true);
    setError("");

    try {
      await login(values.username.trim(), values.password);
      navigate(redirectTo, { replace: true });
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : t("login.failed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Flex
      align="center"
      justify="center"
      style={{
        minHeight: "100vh",
        padding: 16,
        background:
          "radial-gradient(circle at 15% 20%, #e2e8f0 0%, #f0f9ff 35%, #ecfeff 100%)",
      }}
    >
      <Card
        style={{ width: "100%", maxWidth: 460 }}
        styles={{ body: { padding: 28 } }}
      >
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <Typography.Title level={2} style={{ margin: 0, fontSize: 30 }}>
            {t("login.titleDashboard")}
          </Typography.Title>
          <Typography.Paragraph
            style={{ margin: 0, color: "rgba(0, 0, 0, 0.65)" }}
          >
            {t("login.subtitlePage")}
          </Typography.Paragraph>
        </Space>

        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          style={{ marginTop: 20 }}
          onFinish={handleSubmit}
          onValuesChange={() => {
            if (error) setError("");
          }}
        >
          <Form.Item
            name="username"
            label={t("login.username")}
            rules={[
              { required: true, message: "Vui lòng nhập tên đăng nhập." },
            ]}
          >
            <Input autoComplete="username" />
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
          >
            {submitting ? t("login.submitting") : t("common.login")}
          </Button>

          <Button
            type="default"
            onClick={() => navigate("/")}
            block
            size="large"
            style={{ marginTop: 12 }}
          >
            {t("login.backHome")}
          </Button>
        </Form>
      </Card>
    </Flex>
  );
}
