type Props = {
  courtFee: string;
  shuttleCount: string;
  courtCount: string;
  showCourtCount: boolean;
  onCourtFeeChange: (value: string) => void;
  onShuttleCountChange: (value: string) => void;
  onCourtCountChange: (value: string) => void;
};

export default function ExpensesSection({
  courtFee,
  shuttleCount,
  courtCount,
  showCourtCount,
  onCourtFeeChange,
  onShuttleCountChange,
  onCourtCountChange,
}: Props) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-slate-500 mb-4 px-1 uppercase tracking-wider">
        Chi phí (k)
      </h2>
      <div
        className={`grid ${showCourtCount ? "grid-cols-3" : "grid-cols-2"} gap-3`}
      >
        <div>
          <label htmlFor="courtFee" className="block text-xs text-slate-500 mb-2">
            Tiền sân (k)
          </label>
          <input
            type="number"
            id="courtFee"
            className="input-minimal px-4 py-3 text-sm font-medium w-full"
            value={courtFee}
            onChange={(e) => onCourtFeeChange(e.target.value)}
          />
        </div>
        {showCourtCount ? (
          <div>
            <label htmlFor="courtCount" className="block text-xs text-slate-500 mb-2">
              Số sân
            </label>
            <input
              type="number"
              id="courtCount"
              className="input-minimal px-4 py-3 text-sm font-medium w-full"
              value={courtCount}
              min={0}
              onChange={(e) => onCourtCountChange(e.target.value)}
            />
          </div>
        ) : null}
        <div>
          <label htmlFor="shuttleCount" className="block text-xs text-slate-500 mb-2">
            Số cầu
          </label>
          <input
            type="number"
            id="shuttleCount"
            className="input-minimal px-4 py-3 text-sm font-medium w-full"
            value={shuttleCount}
            onChange={(e) => onShuttleCountChange(e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}
