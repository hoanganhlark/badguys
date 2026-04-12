type Props = {
  courtFee: string;
  shuttleCount: string;
  onCourtFeeChange: (value: string) => void;
  onShuttleCountChange: (value: string) => void;
};

export default function ExpensesSection({
  courtFee,
  shuttleCount,
  onCourtFeeChange,
  onShuttleCountChange,
}: Props) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-slate-500 mb-4 px-1 uppercase tracking-wider">
        Chi phí (k)
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          placeholder="Tiền sân"
          className="input-minimal px-4 py-3 text-sm font-medium w-full"
          value={courtFee}
          onChange={(e) => onCourtFeeChange(e.target.value)}
        />
        <input
          type="number"
          placeholder="Số cầu"
          className="input-minimal px-4 py-3 text-sm font-medium w-full"
          value={shuttleCount}
          onChange={(e) => onShuttleCountChange(e.target.value)}
        />
      </div>
    </section>
  );
}
