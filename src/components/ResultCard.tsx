type Props = {
  visible: boolean;
  totalLabel: string;
  maleFeeLabel: string;
  femaleFeeLabel: string;
  setPriceLabel: string;
  onCopy: () => void;
};

export default function ResultCard({
  visible,
  totalLabel,
  maleFeeLabel,
  femaleFeeLabel,
  setPriceLabel,
  onCopy,
}: Props) {
  if (!visible) return null;

  return (
    <section className="animate-fade mb-10">
      <div className="card p-6 mb-4">
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Tổng cộng
            </p>
            <h3 className="text-3xl font-bold">{totalLabel}</h3>
          </div>
          <div className="flex items-end gap-6 text-right">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Nữ
              </p>
              <p className="text-lg font-semibold text-rose-700">
                {femaleFeeLabel}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Mỗi set
              </p>
              <p className="text-lg font-semibold text-blue-700">
                {setPriceLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-50">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Mỗi Nam đóng:</span>
            <span className="font-bold text-lg">{maleFeeLabel}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onCopy}
        className="w-full bg-slate-900 text-white py-4 rounded-xl text-sm font-semibold hover:bg-black transition-all active:scale-[0.98]"
      >
        Sao chép bảng kê
      </button>
    </section>
  );
}
