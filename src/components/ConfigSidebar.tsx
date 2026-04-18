import type { AppConfig } from "../types";
import { X } from "react-feather";

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

function toSafeNumber(value: string): number {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
}

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
  return (
    <>
      <div
        onClick={onClose}
        className={`${open ? "" : "hidden"} ${backdropInteractive ? "" : "pointer-events-none"} fixed inset-0 panel-backdrop z-40`}
      />
      <aside
        className={`${open ? "" : "hidden"} fixed left-0 top-0 h-full w-full max-w-sm sidebar-panel z-50 p-6 overflow-y-auto`}
      >
        <div className="min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Cấu hình
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Đóng cấu hình"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="cfgEnableCourtCount"
                className="block text-xs text-slate-500 mb-2"
              >
                Hiển thị ô nhập số sân
              </label>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="cfgEnableCourtCount"
                  className="form-checkbox h-5 w-5 text-blue-600"
                  checked={config.enableCourtCount}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      enableCourtCount: e.target.checked,
                    })
                  }
                />
                <span className="ml-2 text-xs text-slate-500">Bật</span>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label
                htmlFor="cfgRoundResult"
                className="block text-xs text-slate-500 mb-2"
              >
                Làm tròn kết quả
              </label>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="cfgRoundResult"
                  className="form-checkbox h-5 w-5 text-blue-600"
                  checked={config.roundResult}
                  onChange={(e) =>
                    onConfigChange({ ...config, roundResult: e.target.checked })
                  }
                />
                <span className="ml-2 text-xs text-slate-500">Bật</span>
              </label>
            </div>

            <div>
              <label
                htmlFor="cfgFemaleMax"
                className="block text-xs text-slate-500 mb-2"
              >
                Giá cố định cho nữ (k / buổi)
              </label>
              <input
                type="number"
                id="cfgFemaleMax"
                className="input-minimal px-4 py-3 text-sm font-medium w-full"
                value={config.femaleMax === 0 ? "" : config.femaleMax}
                min={0}
                onChange={(e) => {
                  const val = e.target.value;
                  // Allow empty string for user editing
                  if (val === "") {
                    onConfigChange({ ...config, femaleMax: 0 });
                  } else {
                    onConfigChange({ ...config, femaleMax: toSafeNumber(val) });
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === "" || isNaN(Number(e.target.value))) {
                    onConfigChange({ ...config, femaleMax: 0 });
                  }
                }}
              />
            </div>

            <div>
              <label
                htmlFor="cfgTubePrice"
                className="block text-xs text-slate-500 mb-2"
              >
                Giá 1 ống cầu (12 trái) (k / ống)
              </label>
              <input
                type="number"
                id="cfgTubePrice"
                className="input-minimal px-4 py-3 text-sm font-medium w-full"
                value={config.tubePrice === 0 ? "" : config.tubePrice}
                min={0}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    onConfigChange({ ...config, tubePrice: 0 });
                  } else {
                    onConfigChange({ ...config, tubePrice: toSafeNumber(val) });
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === "" || isNaN(Number(e.target.value))) {
                    onConfigChange({ ...config, tubePrice: 0 });
                  }
                }}
              />
            </div>

            <div>
              <label
                htmlFor="cfgSetPrice"
                className="block text-xs text-slate-500 mb-2"
              >
                Giá đánh theo set (k / set)
              </label>
              <input
                type="number"
                id="cfgSetPrice"
                className="input-minimal px-4 py-3 text-sm font-medium w-full"
                value={config.setPrice === 0 ? "" : config.setPrice}
                min={0}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    onConfigChange({ ...config, setPrice: 0 });
                  } else {
                    onConfigChange({ ...config, setPrice: toSafeNumber(val) });
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === "" || isNaN(Number(e.target.value))) {
                    onConfigChange({ ...config, setPrice: 0 });
                  }
                }}
              />
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-6 leading-relaxed">
            Trường "Số cầu" ngoài màn hình chính sẽ tự quy đổi ra tiền cầu theo
            giá ống hiện tại.
          </p>

          <button
            type="button"
            onClick={onOpenSessions}
            className="mt-5 w-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-3 rounded-xl text-sm font-semibold transition-colors"
          >
            Lịch sử buổi gần đây
          </button>

          <div className="mt-auto pt-8 space-y-2">
            {currentUsername ? (
              <button
                type="button"
                onClick={onLogout}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đăng xuất ({currentUsername})
              </button>
            ) : null}
            <p className="text-[11px] text-slate-300 tracking-wide">
              {appVersion}
              {isAdmin ? " admin" : ""}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
