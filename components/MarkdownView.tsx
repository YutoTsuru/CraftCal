import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownView({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="mb-3 mt-6 text-2xl font-bold text-slate-800 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-5 text-xl font-semibold text-slate-800 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-4 text-lg font-semibold text-slate-700 first:mt-0">{children}</h3>,
        p:  ({ children }) => <p className="mb-3 leading-relaxed text-slate-700 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1 text-slate-700">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1 text-slate-700">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
        em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock ? (
            <code className="block rounded-lg bg-slate-100 px-4 py-3 font-mono text-sm text-slate-800 overflow-x-auto">{children}</code>
          ) : (
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-800">{children}</code>
          );
        },
        pre: ({ children }) => <pre className="mb-3 overflow-x-auto rounded-lg bg-slate-100 p-0">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-4 border-indigo-300 pl-4 italic text-slate-600">{children}</blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800">
            {children}
          </a>
        ),
        hr: () => <hr className="my-4 border-slate-200" />,
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700">{children}</th>,
        td: ({ children }) => <td className="border border-slate-200 px-3 py-2 text-slate-700">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
