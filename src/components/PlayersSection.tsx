import { useLayoutEffect, useRef } from "react";
import { X } from "react-feather";
import { useTranslation } from "react-i18next";
import type { Player } from "../types";

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const frame = window.requestAnimationFrame(() => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [bulkInput]);

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
      <textarea
        ref={textareaRef}
        id="bulkInput"
        rows={2}
        className="input-minimal w-full px-4 py-3 text-sm mb-4 resize-none overflow-hidden"
        placeholder={t("players.placeholder")}
        value={bulkInput}
        onChange={(e) => onBulkInputChange(e.target.value)}
      />

      {hasDuplicateNames ? (
        <p className="text-xs text-amber-700 mb-3 px-1">
          {t("players.duplicateWarning")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 min-h-[20px]">
        {players.map((player, index) => {
          let typeClass = "tag-male";
          let label = player.name;

          if (player.sets > 0) {
            typeClass = "tag-set";
            label += ` (${player.sets}s)`;
          } else if (player.isFemale) {
            typeClass = "tag-female";
            label += " (n)";
          }
          if (player.customFee != null) {
            label += ` [${player.customFee}k]`;
          }
          if (player.extraFee != null) {
            label += ` [+${player.extraFee}k]`;
          }

          return (
            <div
              key={`${player.name}-${index}`}
              className={`tag ${typeClass} ${duplicateIndexes.has(index) ? "tag-duplicate" : ""} px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center animate-fade`}
              onClick={() => onTogglePlayer(index)}
            >
              <span className="mr-1.5 opacity-40">#</span>
              <span>{label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePlayer(index);
                }}
                className="ml-2 opacity-40 hover:opacity-100"
                aria-label={t("players.removeLabel", { name: player.name })}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
