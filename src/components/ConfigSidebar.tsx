import { Button, Drawer, InputNumber, Space, Switch, Typography } from "antd";
import type { AppConfig } from "../types";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  backdropInteractive: boolean;
  config: AppConfig;
  isAdmin: boolean;
  currentUsername: string;
  onClose: () => void;
  onOpenSessions: () => void;
  onConfigChange: (next: AppConfig) => void;
  onLogout: () => void;
  appVersion: string;
};

export default function ConfigSidebar({
  open,
  backdropInteractive,
  config,
  isAdmin,
  currentUsername,
  onClose,
  onOpenSessions,
  onConfigChange,
  onLogout,
  appVersion,
}: Props) {
  const { t } = useTranslation();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="left"
      title={t("configSidebar.title")}
      width={360}
      maskClosable={backdropInteractive}
      destroyOnClose={false}
      extra={
        <Typography.Text type="secondary">
          {t("configSidebar.on")}
        </Typography.Text>
      }
      styles={{
        body: {
          display: "flex",
          flexDirection: "column",
          gap: 20,
          paddingBottom: 12,
        },
      }}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography.Text>
            {t("configSidebar.enableCourtCount")}
          </Typography.Text>
          <Switch
            checked={config.enableCourtCount}
            onChange={(checked) =>
              onConfigChange({
                ...config,
                enableCourtCount: checked,
              })
            }
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography.Text>{t("configSidebar.roundResult")}</Typography.Text>
          <Switch
            checked={config.roundResult}
            onChange={(checked) =>
              onConfigChange({
                ...config,
                roundResult: checked,
              })
            }
          />
        </div>

        <div>
          <Typography.Text>{t("configSidebar.femaleMax")}</Typography.Text>
          <InputNumber
            min={0}
            value={config.femaleMax}
            onChange={(value) =>
              onConfigChange({
                ...config,
                femaleMax: Math.max(0, Number(value) || 0),
              })
            }
            style={{ width: "100%", marginTop: 8 }}
          />
        </div>

        <div>
          <Typography.Text>{t("configSidebar.tubePrice")}</Typography.Text>
          <InputNumber
            min={0}
            value={config.tubePrice}
            onChange={(value) =>
              onConfigChange({
                ...config,
                tubePrice: Math.max(0, Number(value) || 0),
              })
            }
            style={{ width: "100%", marginTop: 8 }}
          />
        </div>

        <div>
          <Typography.Text>{t("configSidebar.setPrice")}</Typography.Text>
          <InputNumber
            min={0}
            value={config.setPrice}
            onChange={(value) =>
              onConfigChange({
                ...config,
                setPrice: Math.max(0, Number(value) || 0),
              })
            }
            style={{ width: "100%", marginTop: 8 }}
          />
        </div>
      </Space>

      <Typography.Paragraph type="secondary" style={{ margin: "4px 0 0" }}>
        {t("configSidebar.note")}
      </Typography.Paragraph>

      <Button block onClick={onOpenSessions}>
        {t("configSidebar.recentSessions")}
      </Button>

      <div style={{ marginTop: "auto", paddingTop: 12 }}>
        {currentUsername ? (
          <Button block onClick={onLogout}>
            {t("common.logout")} ({currentUsername})
          </Button>
        ) : null}
        <Typography.Text
          type="secondary"
          style={{ display: "inline-block", marginTop: 10, fontSize: 11 }}
        >
          {appVersion}
          {isAdmin ? " admin" : ""}
        </Typography.Text>
      </div>
    </Drawer>
  );
}
