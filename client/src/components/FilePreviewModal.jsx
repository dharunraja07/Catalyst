import { useState, useEffect } from 'react'

export default function FilePreviewModal({ file, onClose }) {
  const [textContent, setTextContent] = useState('')
  const [loadingText, setLoadingText] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  if (!file) return null

  const fileId = file._id || file.id
  const fileName = file.originalName || file.filename || 'Document'
  const fileUrl = file.url || (file.filename ? `/api/documents/file/${file.filename}` : '#')
  const ext = fileName.split('.').pop().toLowerCase()

  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) || file.mimeType?.includes('image')
  const isPdf = ext === 'pdf' || file.mimeType?.includes('pdf')
  const isText = ['txt', 'csv', 'json', 'js', 'html', 'css', 'md'].includes(ext) || file.mimeType?.includes('text')

  useEffect(() => {
    if (isText && fileUrl && fileUrl !== '#') {
      setLoadingText(true)
      fetch(fileUrl)
        .then((res) => res.text())
        .then((data) => {
          setTextContent(data)
        })
        .catch(() => {
          setTextContent('Failed to load text content preview.')
        })
        .finally(() => {
          setLoadingText(false)
        })
    }
  }, [isText, fileUrl])

  const handleDownload = () => {
    const downloadUrl = fileId
      ? `/api/documents/download/${fileId}`
      : fileUrl

    const link = document.createElement('a')
    link.href = downloadUrl
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
      <div className="saas-card max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl relative border border-[var(--border-main)] rounded-2xl overflow-hidden bg-[var(--bg-surface)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-main)] p-3 sm:p-4 bg-[var(--bg-secondary)] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="text-xl shrink-0">
              {isImage ? '🖼️' : isPdf ? '📕' : isText ? '📝' : '📦'}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="card-title text-sm sm:text-base font-bold truncate text-[var(--text-primary)]" title={fileName}>
                {fileName}
              </h3>
              <p className="caption-text text-xs text-[var(--text-muted)] truncate">
                {file.uploaderName || file.uploadedBy?.name ? `Uploaded by ${file.uploaderName || file.uploadedBy?.name}` : 'Document Preview'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isImage && (
              <div className="flex items-center gap-1 bg-[var(--bg-primary)] px-2 py-1 rounded-lg border border-[var(--border-main)] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="px-1.5 hover:text-[var(--accent-color)] cursor-pointer"
                  title="Zoom Out"
                >
                  -
                </button>
                <span>{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="px-1.5 hover:text-[var(--accent-color)] cursor-pointer"
                  title="Zoom In"
                >
                  +
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="saas-button-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>⬇️</span>
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition cursor-pointer"
              title="Close preview"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 min-h-0 bg-slate-950/60 overflow-auto flex items-center justify-center p-3 custom-scrollbar relative">
          {isImage && (
            <div className="w-full h-full flex items-center justify-center overflow-auto custom-scrollbar">
              <img
                src={fileUrl}
                alt={fileName}
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                className="max-w-full max-h-full object-contain transition-transform duration-200 shadow-2xl rounded-lg"
              />
            </div>
          )}

          {isPdf && (
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-full border-none rounded-lg bg-white"
            />
          )}

          {isText && (
            <div className="w-full h-full p-4 bg-slate-900 text-slate-100 font-mono text-xs overflow-auto rounded-lg custom-scrollbar border border-slate-800">
              {loadingText ? (
                <div className="flex h-full items-center justify-center gap-2 text-slate-400">
                  <span className="animate-spin text-base">⏳</span>
                  <span>Loading text preview...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words">{textContent}</pre>
              )}
            </div>
          )}

          {!isImage && !isPdf && !isText && (
            <div className="text-center p-6 space-y-4 max-w-md bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-2xl shadow-xl">
              <div className="text-4xl">📄</div>
              <div>
                <h4 className="text-base font-bold text-[var(--text-primary)]">{fileName}</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Direct inline preview is not available for this file type ({ext.toUpperCase()}).
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="saas-button-primary py-2.5 px-6 font-bold text-xs shadow-sm cursor-pointer"
              >
                Download to View File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
