import { InputNumber, Typography } from "antd";
import { memo } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  courtFee: string;
  shuttleCount: string;
  courtCount: string;
  showCourtCount: boolean;
  onCourtFeeChange: (value: string) => void;
  onShuttleCountChange: (value: string) => void;
  onCourtCountChange: (value: string) => void;
};

function ExpensesSection({
  courtFee,
  shuttleCount,
  courtCount,
  showCourtCount,
  onCourtFeeChange,
  onShuttleCountChange,
  onCourtCountChange,
}: Props) {
  const { t } = useTranslation();

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">
        {t("expenses.title")}
      </h2>
      <div
        className={`grid ${showCourtCount ? "grid-cols-3" : "grid-cols-2"} gap-3`}
      >
        <div>
          <Typography.Text type="secondary">
            {t("expenses.courtFee")}
          </Typography.Text>
          <InputNumber
            style={{ width: "100%", marginTop: 8 }}
            value={courtFee === "" ? null : Number(courtFee)}
            onChange={(value) =>
              onCourtFeeChange(value == null ? "" : String(value))
            }
          />
        </div>
        {showCourtCount ? (
          <div>
            <Typography.Text type="secondary">
              {t("expenses.courtCount")}
            </Typography.Text>
            <InputNumber
              min={0}
              style={{ width: "100%", marginTop: 8 }}
              value={courtCount === "" ? null : Number(courtCount)}
              onChange={(value) =>
                onCourtCountChange(value == null ? "" : String(value))
              }
            />
          </div>
        ) : null}
        <div>
          <Typography.Text type="secondary">
            {t("expenses.shuttleCount")}
          </Typography.Text>
          <InputNumber
            style={{ width: "100%", marginTop: 8 }}
            value={shuttleCount === "" ? null : Number(shuttleCount)}
            onChange={(value) =>
              onShuttleCountChange(value == null ? "" : String(value))
            }
          />
        </div>
      </div>
    </section>
  );
}

export default memo(ExpensesSection);
