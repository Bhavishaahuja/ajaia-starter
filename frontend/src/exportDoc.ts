import TurndownService from 'turndown'

const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' })

// Markdown has no underline, so underlined text comes out as plain text
export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html)
}

// "Q3 plan!" becomes "Q3-plan"
export function safeFileName(title: string): string {
  const name = title
    .trim()
    .replace(/[^\w\- ]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80)
  return name || 'document'
}

export function downloadMarkdown(title: string, html: string) {
  const blob = new Blob([htmlToMarkdown(html)], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeFileName(title)}.md`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
