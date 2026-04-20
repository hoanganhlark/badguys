import { Button, Card, Divider, Flex, Statistic, Typography } from "antd";
import { memo } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  visible: boolean;
  totalLabel: string;
  maleFeeLabel: string;
  femaleFeeLabel: string;
  setPriceLabel: string;
  onCopy: () => void;
};

function ResultCard({
  visible,
  totalLabel,
  maleFeeLabel,
  femaleFeeLabel,
  setPriceLabel,
  onCopy,
}: Props) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <section className="mb-10">
      <Card style={{ marginBottom: 16 }}>
        <Flex align="end" justify="space-between" gap={16}>
          <Statistic title={t("resultCard.total")} value={totalLabel} />
          <Flex align="end" gap={24}>
            <Statistic title={t("resultCard.female")} value={femaleFeeLabel} />
            <Statistic title={t("resultCard.perSet")} value={setPriceLabel} />
          </Flex>
        </Flex>

        <Divider style={{ margin: "16px 0" }} />

        <Flex align="center" justify="space-between">
          <Typography.Text type="secondary">
            {t("resultCard.eachMalePays")}
          </Typography.Text>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {maleFeeLabel}
          </Typography.Title>
        </Flex>
      </Card>

      <Button type="primary" onClick={onCopy} block size="large">
        {t("resultCard.copySummary")}
      </Button>
    </section>
  );
}

export default memo(ResultCard);
