import { useState } from 'react'

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(filename = '', mimeType = '') {
  const name = filename.toLowerCase()
  const mime = mimeType.toLowerCase()

  if (mime.includes('image') || /\.(png|jpg|jpeg|webp|gif)$/.test(name)) return '🖼️'
  if (mime.includes('pdf') || name.endsWith('.pdf')) return '📕'
  if (name.endsWith('.doc') || name.endsWith('.docx') || mime.includes('word')) return '📄'
  if (name.endsWith('.ppt') || name.endsWith('.pptx') || mime.includes('presentation')) return '📊'
  if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv') || mime.includes('sheet') || mime.includes('excel')) return '📈'
  if (name.endsWith('.zip') || mime.includes('zip')) return '📦'
  return '📝'
}

export default function FileCard({
  file,
  onPreview,
  onDelete,
  canDelete = false,
  compact = false
}) {
  const [downloading, setDownloading] = useState(false)

  if (!file) return null

  const fileId = file._id || file.id
  const fileName = file.originalName || file.filename || 'Document'
  const sizeText = formatFileSize(file.size)
  const icon = getFileIcon(fileName, file.mimeType || '')
  const uploader = file.uploaderName || file.uploadedBy?.name || 'User'
  const uploadTime = file.createdAt ? new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''

  const handleDownload = async (e) => {
    e.stopPropagation()
    setDownloading(true)
    try {
      const downloadUrl = fileId
        ? `/api/documents/download/${fileId}`
        : (file.url || '#')

      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Download error:', err)
    } finally {
      setTimeout(() => setDownloading(false), 1000)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2.5 rounded-[12px] border border-[var(--border-main)] bg-[var(--bg-secondary)]/90 p-2 sm:p-2.5 text-xs shadow-xs hover:border-[var(--accent-color)]/50 transition">
        <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => onPreview && onPreview(file)}>
          <span className="text-lg shrink-0">{icon}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[var(--text-primary)] truncate text-xs" title={fileName}>{fileName}</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">{sizeText} • {uploader}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onPreview && (
            <button
              type="button"
              onClick={() => onPreview(file)}
              className="p-1 rounded-[6px] text-xs hover:bg-[var(--accent-color)]/20 text-[var(--accent-color)] transition cursor-pointer"
              title="Preview file"
            >
              👁️
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="p-1 rounded-[6px] text-xs hover:bg-[var(--accent-color)]/20 text-[var(--accent-color)] transition cursor-pointer disabled:opacity-50"
            title="Download file"
          >
            {downloading ? '⌛' : '⬇️'}
          </button>
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(file)}
              className="p-1 rounded-[6px] text-xs hover:bg-red-500/20 text-red-400 transition cursor-pointer"
              title="Delete file"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[16px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3.5 sm:p-4 shadow-sm hover:border-[var(--accent-color)]/40 transition">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-color)]/10 text-xl border border-[var(--accent-color)]/20">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="card-title text-sm font-bold text-[var(--text-primary)] truncate" title={fileName}>
            {fileName}
          </h4>
          <p className="caption-text text-xs text-[var(--text-secondary)] mt-0.5 flex flex-wrap items-center gap-2">
            <span>{sizeText}</span>
            <span>•</span>
            <span>By {uploader}</span>
            {uploadTime && (
              <>
                <span>•</span>
                <span>{uploadTime}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {onPreview && (
          <button
            type="button"
            onClick={() => onPreview(file)}
            className="saas-button-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>👁️</span>
            <span>Preview</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="saas-button-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
        >
          <span>{downloading ? '⌛' : '⬇️'}</span>
          <span>{downloading ? 'Downloading...' : 'Download'}</span>
        </button>

        {canDelete && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(file)}
            className="px-2.5 py-1.5 rounded-[10px] text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition cursor-pointer"
            title="Delete document"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}
