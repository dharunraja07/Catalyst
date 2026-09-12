import ReactMarkdown from 'react-markdown'
import CopyButton from './CopyButton.jsx'

function highlightCodeTokens(code, lang) {
  if (!code) return code

  const KEYWORDS = new Set([
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'break', 'continue', 'import', 'export', 'default', 'from', 'as',
    'class', 'extends', 'public', 'private', 'protected', 'static', 'new', 'this', 'super',
    'try', 'catch', 'finally', 'throw', 'async', 'await', 'void', 'int', 'float', 'double',
    'char', 'bool', 'boolean', 'auto', 'struct', 'typedef', 'enum', 'namespace', 'using',
    'def', 'self', 'elif', 'in', 'is', 'not', 'and', 'or', 'lambda', 'pass', 'with', 'yield',
    'select', 'from', 'where', 'insert', 'into', 'update', 'delete', 'join', 'left', 'right',
    'inner', 'on', 'group', 'by', 'order', 'having', 'limit', 'create', 'table', 'drop',
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'DELETE', 'JOIN', 'LEFT', 'RIGHT',
    'INNER', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'CREATE', 'TABLE', 'DROP'
  ])

  const TYPES = new Set([
    'vector', 'string', 'String', 'int', 'float', 'double', 'char', 'bool', 'boolean',
    'void', 'auto', 'Promise', 'Set', 'Map', 'Array', 'Object', 'Number', 'Boolean',
    'uint8_t', 'size_t', 'any', 'unknown', 'never'
  ])

  const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_]\w*\b|[^\s\w]+|\s+)/g

  const tokens = []
  let match
  let key = 0

  while ((match = tokenRegex.exec(code)) !== null) {
    const text = match[0]

    // Comments
    if (text.startsWith('//') || text.startsWith('/*') || (lang === 'python' && text.startsWith('#'))) {
      tokens.push(
        <span key={key++} className="italic text-[var(--ai-syntax-comment)]">{text}</span>
      )
    }
    // Strings
    else if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")) || (text.startsWith('`') && text.endsWith('`'))) {
      tokens.push(
        <span key={key++} className="text-[var(--ai-syntax-string)]">{text}</span>
      )
    }
    // Numbers
    else if (/^\d+(?:\.\d+)?$/.test(text)) {
      tokens.push(
        <span key={key++} className="text-[var(--ai-syntax-number)] font-semibold">{text}</span>
      )
    }
    // Keywords / Types / Functions / Identifiers
    else if (/^[a-zA-Z_]\w*$/.test(text)) {
      if (KEYWORDS.has(text) || KEYWORDS.has(text.toUpperCase())) {
        tokens.push(
          <span key={key++} className="font-bold text-[var(--ai-syntax-keyword)]">{text}</span>
        )
      } else if (TYPES.has(text)) {
        tokens.push(
          <span key={key++} className="font-semibold text-[var(--ai-syntax-type)]">{text}</span>
        )
      } else if (code.slice(match.index + text.length).trim().startsWith('(')) {
        tokens.push(
          <span key={key++} className="font-medium text-[var(--ai-syntax-function)]">{text}</span>
        )
      } else {
        tokens.push(text)
      }
    }
    else {
      tokens.push(text)
    }
  }

  return tokens
}

function CodeBlock({ language, codeString }) {
  const langLabel = language ? language.toLowerCase() : 'code'

  return (
    <div className="my-3 min-w-0 max-w-full overflow-hidden rounded-xl border border-[var(--ai-code-block-border)] bg-[var(--ai-code-block-bg)] shadow-md font-mono text-xs sm:text-sm">
      {/* Code Block Header Bar */}
      <div className="flex items-center justify-between border-b border-[var(--ai-code-block-border)] bg-[var(--ai-code-block-header)] px-4 py-2 text-[var(--ai-text-secondary)] select-none">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          {langLabel}
        </span>
        <CopyButton text={codeString} />
      </div>

      {/* Code Container with Syntax Highlighting & Internal Scrollbar */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar p-4 text-[var(--ai-code-block-text)] leading-relaxed whitespace-pre font-mono">
        <code>{highlightCodeTokens(codeString, langLabel)}</code>
      </div>
    </div>
  )
}

export default function MarkdownRenderer({ children, className = '' }) {
  if (!children) return null
  const content = typeof children === 'string' ? children : String(children)

  return (
    <div className={`prose prose-invert max-w-none text-sm leading-relaxed text-[var(--ai-text-primary)] min-w-0 ${className}`}>
      <ReactMarkdown
        components={{
          code({ node, inline, className: codeClassName, children: codeChildren, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '')
            const codeText = String(codeChildren).replace(/\n$/, '')
            const isMultiLine = codeText.includes('\n')

            if (!inline && (match || isMultiLine)) {
              return (
                <CodeBlock
                  language={match ? match[1] : ''}
                  codeString={codeText}
                />
              )
            }

            return (
              <span className="inline-block my-0.5 align-baseline">
                <code
                  className="rounded-md bg-[var(--ai-inline-code-bg)] border border-[var(--ai-inline-code-border)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--ai-inline-code-text)] font-semibold break-words shadow-xs select-text"
                  {...props}
                >
                  {codeChildren}
                </code>
              </span>
            )
          },
          strong({ children: strongChildren }) {
            return (
              <strong className="font-bold text-[var(--ai-bold-text)]">
                {strongChildren}
              </strong>
            )
          },
          a({ href, children: linkChildren }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--ai-link)] hover:underline font-medium transition"
              >
                {linkChildren}
              </a>
            )
          },
          pre({ children: preChildren }) {
            return (
              <div className="min-w-0 max-w-full my-2">
                {preChildren}
              </div>
            )
          },
          table({ children: tableChildren }) {
            return (
              <div className="my-3 min-w-0 max-w-full overflow-x-auto rounded-xl border border-[var(--ai-bubble-border)] bg-[var(--ai-card-bg)]/50 p-1 shadow-sm">
                <table className="min-w-full divide-y divide-[var(--ai-bubble-border)] text-left text-xs sm:text-sm">
                  {tableChildren}
                </table>
              </div>
            )
          },
          th({ children: thChildren }) {
            return (
              <th className="bg-[var(--ai-code-block-header)] px-3 py-2 font-bold text-[var(--ai-text-primary)] border-b border-[var(--ai-bubble-border)] whitespace-nowrap">
                {thChildren}
              </th>
            )
          },
          td({ children: tdChildren }) {
            return (
              <td className="px-3 py-2 text-[var(--ai-text-secondary)] border-b border-[var(--ai-bubble-border)]">
                {tdChildren}
              </td>
            )
          },
          p({ children: pChildren }) {
            return (
              <p className="my-1.5 break-words [overflow-wrap:anywhere] leading-relaxed text-[var(--ai-text-primary)]">
                {pChildren}
              </p>
            )
          },
          ul({ children: ulChildren }) {
            return (
              <ul className="my-2 list-disc list-inside space-y-1 pl-1 text-xs sm:text-sm leading-relaxed text-[var(--ai-text-primary)]">
                {ulChildren}
              </ul>
            )
          },
          ol({ children: olChildren }) {
            return (
              <ol className="my-2 list-decimal list-inside space-y-1 pl-1 text-xs sm:text-sm leading-relaxed text-[var(--ai-text-primary)]">
                {olChildren}
              </ol>
            )
          },
          blockquote({ children: bqChildren }) {
            return (
              <blockquote className="my-3 border-l-4 border-amber-400 bg-[var(--ai-card-bg)]/60 py-2 px-4 rounded-r-xl italic text-xs sm:text-sm text-[var(--ai-text-secondary)]">
                {bqChildren}
              </blockquote>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
