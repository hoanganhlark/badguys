type Props = {
  message: string;
};

export default function Toast({ message }: Props) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[2147483647] bg-slate-900 text-white text-[13px] px-5 py-3 rounded-full shadow-xl opacity-100 transition-all duration-300 pointer-events-none">
      {message}
    </div>
  );
}
