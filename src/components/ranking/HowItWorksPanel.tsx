import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import md from "../../assets/USER_GUIDE.md?raw";

export default function HowItWorksPanel() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 md:p-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 text-2xl font-bold leading-tight text-slate-900 md:text-3xl">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 mb-3 text-xl font-semibold leading-snug text-slate-900 md:text-2xl">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 mb-2 text-lg font-semibold leading-snug text-slate-800 md:text-xl">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 leading-7 text-slate-700">{children}</p>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm text-slate-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 text-slate-800">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-slate-300 px-3 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-slate-200 px-3 py-2 align-top">
              {children}
            </td>
          ),
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}
