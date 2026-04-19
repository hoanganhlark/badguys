import {
  Button,
  Card,
  Empty,
  List,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Typography,
  Alert,
} from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { formatK, formatSessionDateLabel, normalizeKLabels } from "../lib/core";
import { useTranslation } from "react-i18next";
import type { SessionRecord } from "../types";

type Props = {
  open: boolean;
  loading: boolean;
  error: string;
  sessions: SessionRecord[];
  canRemove: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onCopyNote: (text: string) => void;
};

export default function SessionsModal({
  open,
  loading,
  error,
  sessions,
  canRemove,
  onClose,
  onRemove,
  onCopyNote,
}: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={t("sessions.title")}
      destroyOnClose
      width={720}
      styles={{
        body: {
          maxHeight: "70vh",
          overflowY: "auto",
        },
      }}
    >
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "32px 0",
          }}
        >
          <Spin tip={t("sessions.loading")} />
        </div>
      ) : null}

      {!loading && error ? (
        <Alert type="error" message={error} showIcon />
      ) : null}

      {!loading && !error && sessions.length === 0 ? (
        <Empty description={t("sessions.empty")} />
      ) : null}

      {!loading && !error && sessions.length > 0 ? (
        <List
          dataSource={sessions}
          split={false}
          renderItem={(session) => {
            const summaryText = String(session.summaryText || "").trim();

            return (
              <List.Item key={session.id} style={{ padding: "0 0 12px" }}>
                <Card size="small" style={{ width: "100%" }}>
                  <Space
                    align="start"
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <div>
                      <Typography.Text strong>
                        {formatSessionDateLabel(session)}
                      </Typography.Text>
                      <div>
                        <Typography.Text type="secondary">
                          {t("sessions.total")}: {formatK(session.total || 0)}
                        </Typography.Text>
                      </div>
                    </div>

                    {canRemove ? (
                      <Popconfirm
                        title={t("common.confirmDelete")}
                        onConfirm={() => onRemove(session.id)}
                        okText={t("sessions.delete")}
                        cancelText={t("common.cancel")}
                      >
                        <Button type="text" danger size="small">
                          {t("sessions.delete")}
                        </Button>
                      </Popconfirm>
                    ) : null}
                  </Space>

                  <Typography.Paragraph
                    type="secondary"
                    style={{ margin: "8px 0" }}
                  >
                    {t("sessions.summaryLine", {
                      males: session.malesCount || 0,
                      maleFee: formatK(session.maleFee || 0),
                      females: session.femalesCount || 0,
                      femaleFee: formatK(session.femaleFee || 0),
                      setPlayers: session.setPlayersCount || 0,
                    })}
                  </Typography.Paragraph>

                  {summaryText ? (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginBottom: 6,
                        }}
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() =>
                            onCopyNote(normalizeKLabels(summaryText))
                          }
                        >
                          {t("sessions.copyNote")}
                        </Button>
                      </div>
                      <Typography.Paragraph
                        style={{
                          margin: 0,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          background: "rgba(0, 0, 0, 0.02)",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        {summaryText}
                      </Typography.Paragraph>
                    </div>
                  ) : null}
                </Card>
              </List.Item>
            );
          }}
        />
      ) : null}
    </Modal>
  );
}
