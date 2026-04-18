import { useEffect } from "react";
import { formatK, formatSessionDateLabel, normalizeKLabels } from "../lib/core";
import { Copy, X } from "react-feather";
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
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            Lịch sử buổi gần đây
          </h4>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Đóng lịch sử"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div className="p-5 text-sm text-slate-500">Đang tải dữ liệu...</div>
        )}
        {!loading && error && (
          <div className="p-5 text-sm text-slate-500">{error}</div>
        )}
        {!loading && !error && sessions.length === 0 && (
          <div className="p-5 text-sm text-slate-500">
            Chưa có dữ liệu phiên nào.
          </div>
        )}

        {!loading && !error && sessions.length > 0 && (
          <div className="p-5 overflow-y-auto space-y-3">
            {sessions.map((session) => {
              const summaryText = String(session.summaryText || "").trim();
              return (
                <article
                  key={session.id}
                  className="border border-slate-200 rounded-xl p-4 bg-white"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-slate-800">
                      {formatSessionDateLabel(session)}
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Tổng: {formatK(session.total || 0)}
                      </span>
                      {canRemove ? (
                        <button
                          type="button"
                          onClick={() => onRemove(session.id)}
                          className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          title="Xóa buổi này"
                        >
                          Xóa
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Nam: {session.malesCount || 0} người (
                    {formatK(session.maleFee || 0)}/người) | Nữ:{" "}
                    {session.femalesCount || 0} người (
                    {formatK(session.femaleFee || 0)}/người) | Đánh set:{" "}
                    {session.setPlayersCount || 0} người
                  </p>
                  {summaryText ? (
                    <div className="relative mt-1">
                      <button
                        type="button"
                        className="absolute top-2 right-2 text-slate-400 hover:text-blue-600 z-10 bg-white/80 rounded p-1"
                        title="Copy note"
                        onClick={() =>
                          onCopyNote(normalizeKLabels(summaryText))
                        }
                      >
                        <Copy className="inline h-4 w-4" />
                      </button>
                      <pre className="text-xs bg-slate-50 border border-slate-100 rounded-lg p-3 text-slate-600 whitespace-pre-wrap break-words">
                        {summaryText}
                      </pre>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
