import { useState, useRef } from 'react'

const ALLOWED_TYPES_LABEL = 'PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, CSV, ZIP, JPG, PNG, WEBP, GIF'
const MAX_SIZE_MB = 50

export default function FileUploadZone({
  onUploadSuccess,
  api,
  moduleName,
  assessmentId = null,
  questionId = null,
  groupId = null,
  meetId = null,
  compact = false
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const fileInputRef = useRef(null)
  const xhrRef = useRef(null)

  const validateFiles = (files) => {
    const allowedExts = [
      'pdf', 'doc', 'docx', 'ppt', 'pptx',
      'xls', 'xlsx', 'txt', 'csv', 'zip',
      'jpg', 'jpeg', 'png', 'webp', 'gif'
    ]

    for (const f of files) {
      const ext = f.name.split('.').pop().toLowerCase()
      if (!allowedExts.includes(ext)) {
        return `File "${f.name}" has an unsupported format. Allowed formats: ${ALLOWED_TYPES_LABEL}`
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        return `File "${f.name}" exceeds the maximum upload size limit of ${MAX_SIZE_MB}MB.`
      }
    }
    return null
  }

  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList)

    const validationError = validateFiles(files)
    if (validationError) {
      setErrorMsg(validationError)
      setSuccessMsg('')
      return
    }

    setErrorMsg('')
    setSuccessMsg('')
    setUploading(true)
    setProgress(10)

    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    formData.append('module', moduleName)
    if (assessmentId) formData.append('assessmentId', assessmentId)
    if (questionId) formData.append('questionId', questionId)
    if (groupId) formData.append('groupId', groupId)
    if (meetId) formData.append('meetId', meetId)

    try {
      // Use XMLHttpRequest for precise upload progress tracking
      const token = localStorage.getItem('catalyst_token') || sessionStorage.getItem('catalyst_token')
      const xhr = new XMLHttpRequest()
      xhrRef.current = xhr

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          setProgress(percent)
        }
      }

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.open('POST', '/api/documents/upload')
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText))
            } catch {
              resolve([])
            }
          } else {
            try {
              const res = JSON.parse(xhr.responseText)
              reject(new Error(res.error || 'Upload failed'))
            } catch {
              reject(new Error('Upload failed with status ' + xhr.status))
            }
          }
        }
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.onabort = () => reject(new Error('Upload cancelled'))
        xhr.send(formData)
      })

      const createdDocs = await uploadPromise
      setProgress(100)
      setSuccessMsg(`Successfully uploaded ${createdDocs.length} file(s)!`)
      if (onUploadSuccess) {
        onUploadSuccess(createdDocs)
      }
    } catch (err) {
      if (err.message !== 'Upload cancelled') {
        setErrorMsg(err.message || 'Failed to upload document(s). Please try again.')
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort()
      xhrRef.current = null
    }
    setUploading(false)
    setProgress(0)
    setErrorMsg('Upload cancelled.')
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer?.files?.length) {
      handleUpload(e.dataTransfer.files)
    }
  }

  if (compact) {
    return (
      <div className="w-full">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.jpg,.jpeg,.png,.webp,.gif"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`flex items-center justify-between gap-3 p-2.5 rounded-[12px] border-2 border-dashed transition cursor-pointer ${
            isDragging
              ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10'
              : 'border-[var(--border-main)] hover:border-[var(--accent-color)]/50 bg-[var(--bg-secondary)]'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] min-w-0 truncate">
            <span className="text-base shrink-0">📁</span>
            <span className="truncate">
              {uploading ? `Uploading... ${progress}%` : 'Click or drop files here'}
            </span>
          </div>

          <button
            type="button"
            className="saas-button-primary py-1 px-2.5 text-[11px] font-bold shrink-0 cursor-pointer"
          >
            Upload
          </button>
        </div>

        {uploading && (
          <div className="mt-1.5 space-y-1">
            <div className="h-1.5 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border-main)]">
              <div
                style={{ width: `${progress}%` }}
                className="h-full bg-[var(--accent-color)] transition-all duration-200"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)]">
              <span>{progress}% completed</span>
              <button
                type="button"
                onClick={handleCancelUpload}
                className="text-red-400 hover:underline cursor-pointer font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {errorMsg && <p className="mt-1 text-[11px] text-[var(--error-color)]">{errorMsg}</p>}
      </div>
    )
  }

  return (
    <div className="w-full space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => handleUpload(e.target.files)}
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.jpg,.jpeg,.png,.webp,.gif"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed transition cursor-pointer text-center ${
          isDragging
            ? 'border-[var(--accent-color)] bg-[var(--accent-color)]/10 scale-[1.01]'
            : 'border-[var(--border-main)] hover:border-[var(--accent-color)]/60 bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)]'
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-color)]/10 text-2xl text-[var(--accent-color)] mb-3 border border-[var(--accent-color)]/20 shadow-xs">
          📤
        </div>
        <h4 className="text-sm font-bold text-[var(--text-primary)]">
          {isDragging ? 'Drop files to upload' : 'Click to Upload or Drag & Drop'}
        </h4>
        <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md">
          Supported: {ALLOWED_TYPES_LABEL} (Max {MAX_SIZE_MB}MB per file)
        </p>
      </div>

      {uploading && (
        <div className="rounded-[14px] border border-[var(--border-main)] bg-[var(--bg-secondary)] p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
            <span className="flex items-center gap-2">
              <span className="animate-spin text-sm">⏳</span>
              <span>Uploading files... ({progress}%)</span>
            </span>
            <button
              type="button"
              onClick={handleCancelUpload}
              className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
            >
              ✕ Cancel
            </button>
          </div>
          <div className="h-2 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border-main)]">
            <div
              style={{ width: `${progress}%` }}
              className="h-full bg-[var(--accent-color)] transition-all duration-200"
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-between gap-2 rounded-[14px] bg-[var(--error-bg)] border border-[var(--error-color)]/30 p-3 text-xs text-[var(--error-color)]">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="saas-button-secondary py-1 px-2.5 text-[11px] font-bold cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {successMsg && (
        <p className="rounded-[14px] bg-[var(--success-bg)] border border-[var(--success-color)]/30 p-3 text-xs text-[var(--success-color)]">
          ✓ {successMsg}
        </p>
      )}
    </div>
  )
}
