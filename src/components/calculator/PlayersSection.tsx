import { Alert, Input, Tag, Typography } from "antd";
import { useTranslation } from "react-i18next";
import type { Player } from "../../types";

const { TextArea } = Input;

type Props = {
  bulkInput: string;
  players: Player[];
  onBulkInputChange: (value: string) => void;
  onTogglePlayer: (index: number) => void;
  onRemovePlayer: (index: number) => void;
};

export default function PlayersSection({
  bulkInput,
  players,
  onBulkInputChange,
  onTogglePlayer,
  onRemovePlayer,
}: Props) {
  const { t } = useTranslation();

  const normalizeName = (name: string) => name.trim().toLowerCase();

  const duplicateNameCounts = new Map<string, number>();
  players.forEach((player) => {
    const key = normalizeName(player.name);
    if (!key) return;
    duplicateNameCounts.set(key, (duplicateNameCounts.get(key) || 0) + 1);
  });

  const duplicateIndexes = new Set<number>();
  players.forEach((player, index) => {
    const key = normalizeName(player.name);
    if (!key) return;
    if ((duplicateNameCounts.get(key) || 0) > 1) {
      duplicateIndexes.add(index);
    }
  });

  const hasDuplicateNames = duplicateIndexes.size > 0;

  return (
    <section className="mb-8">
      <div className="flex justify-between items-center mb-4 px-1">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          {t("players.title")}
        </h2>
        <span className="text-xs font-medium text-slate-400">
          {t("players.count", { count: players.length })}
        </span>
      </div>

      <label
        htmlFor="bulkInput"
        className="block text-xs text-slate-500 mb-2 px-1"
      >
        {t("players.help")}
      </label>
      <TextArea
        id="bulkInput"
        autoSize={{ minRows: 2, maxRows: 10 }}
        style={{ marginBottom: 16 }}
        placeholder={t("players.placeholder")}
        value={bulkInput}
        onChange={(e) => onBulkInputChange(e.target.value)}
      />

      {hasDuplicateNames ? (
        <Alert
          type="warning"
          showIcon
          message={t("players.duplicateWarning")}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <div className="flex flex-wrap gap-2 min-h-[20px]">
        {players.map((player, index) => {
          let color: string = "default";
          let label = player.name;

          if (player.sets > 0) {
            color = "blue";
            label += ` (${player.sets}s)`;
          } else if (player.isFemale) {
            color = "magenta";
            label += " (n)";
          }
          if (player.customFee != null) {
            label += ` [${player.customFee}k]`;
          }
          if (player.extraFee != null) {
            label += ` [+${player.extraFee}k]`;
          }

          return (
            <Tag
              key={`${player.name}-${index}`}
              color={duplicateIndexes.has(index) ? "gold" : color}
              closable
              onClose={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemovePlayer(index);
              }}
              onClick={() => onTogglePlayer(index)}
              style={{
                cursor: "pointer",
                userSelect: "none",
                paddingInline: 10,
                paddingBlock: 4,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <Typography.Text style={{ fontSize: 12 }} ellipsis>
                {`# ${label}`}
              </Typography.Text>
            </Tag>
          );
        })}
      </div>
    </section>
  );
}
