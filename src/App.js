import React, { useRef, useState, useEffect } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

// PhotoFrameSite — React + Tailwind
// 単一選択 → 白枠画像を自動ダウンロード
// 複数選択 → ZIPにまとめて自動ダウンロード（ローディング付き）

const FRAME_PRESETS = [
  { label: "XS", pct: 3 },
  { label: "S",  pct: 5 },
  { label: "M",  pct: 8 },
  { label: "L",  pct: 12 },
  { label: "XL", pct: 16 },
]

export default function PhotoFrameSite() {
  const canvasRef = useRef(null)
  const [images, setImages] = useState([])
  const [framePct, setFramePct] = useState(8)
  const [outputSize, setOutputSize] = useState(2000)
  const [format, setFormat] = useState('jpeg')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false) // 🧵 ローディング状態

  // ✅ ファイル選択時
  const handleFiles = (files) => {
    if (!files || !files.length) return

    const imgs = []
    Array.from(files).forEach((f) => {
      const url = URL.createObjectURL(f)
      const img = new Image()
      img.onload = () => {
        imgs.push({ file: f, image: img })
        if (imgs.length === files.length) {
          setImages(imgs)
        }
        URL.revokeObjectURL(url)
      }
      img.src = url
    })
  }

  // ✅ ドラッグ&ドロップ処理
  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  // ✅ 共通：白枠合成を「指定canvas」に描く
  const drawFrameToCanvas = (canvas, img) => {
    const ctx = canvas.getContext('2d')
    const size = outputSize
    canvas.width = size
    canvas.height = size

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)

    const border = Math.round((framePct / 100) * size)
    const innerSize = size - border * 2
    const scale = Math.min(innerSize / img.width, innerSize / img.height)
    const w = img.width * scale
    const h = img.height * scale
    const x = border + (innerSize - w) / 2
    const y = border + (innerSize - h) / 2

    ctx.drawImage(img, x, y, w, h)
  }

  // ✅ 白枠付き画像の描画（Blobを返す：ZIP/単体DL用）
  const drawToBlob = (img) => {
    return new Promise((resolve) => {
      // ZIPの安定性優先：毎回新しいcanvasで生成
      const canvas = document.createElement('canvas')
      drawFrameToCanvas(canvas, img)

      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
      canvas.toBlob((blob) => resolve(blob), mime, 0.95)
    })
  }

  // ✅ プレビュー描画（画面のcanvasRefへ）
  const drawPreview = (img) => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawFrameToCanvas(canvas, img)
  }

  // ✅ 画像1枚 → 自動DL
  const downloadSingle = async (fileName, img) => {
    const blob = await drawToBlob(img)
    const ext = format === 'jpeg' ? 'jpg' : 'png'
    const a = document.createElement('a')
    const url = URL.createObjectURL(blob)
    a.href = url
    a.download = (fileName.replace(/\.[^/.]+$/, '') || 'framed-image') + `.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ✅ 複数画像 → ZIP化（ローディングつき）
  const downloadZip = async (imageList) => {
    setLoading(true)
    try {
      const zip = new JSZip()
      for (const { file, image } of imageList) {
        const blob = await drawToBlob(image)
        if (!blob) continue
        const ext = format === 'jpeg' ? 'jpg' : 'png'
        zip.file(file.name.replace(/\.[^/.]+$/, '') + `.${ext}`, blob)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, 'framed-images.zip')
    } finally {
      setLoading(false)
    }
  }

  // ✅ 自動ダウンロード処理（imagesがセットされた時だけ）
  useEffect(() => {
    if (images.length === 0) return

    const timer = setTimeout(async () => {
      if (images.length === 1) {
        await downloadSingle(images[0].file.name, images[0].image)
      } else {
        await downloadZip(images)
      }
    }, 400)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images])

  // ✅ プレビュー更新（テンプレ/スライダー/サイズ/フォーマット変更で反映）
  useEffect(() => {
    if (images.length !== 1) return
    drawPreview(images[0].image)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images, framePct, outputSize, format])

  // ✅ UI部
  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      {/* 🌸 ローディングオーバーレイ */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-50 transition">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-gray-600 animate-pulse">包んでいます…</p>
        </div>
      )}

      <h1 className="text-2xl font-semibold mb-8 text-gray-800">写真に白いフレームを付けるサイト</h1>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        className={`w-full max-w-4xl p-8 border-2 ${
          dragging ? 'border-gray-400 bg-white' : 'border-gray-200 bg-white/70'
        } border-dashed rounded-xl flex flex-col md:flex-row gap-8 items-center`}
      >
        <div className="flex-1 w-full">
          <p className="text-sm text-gray-600">画像をドラッグ＆ドロップ、または複数選択してください。</p>

          <div className="mt-4 flex gap-3 items-center">
            <button
              onClick={() => document.getElementById('fileInput').click()}
              className="bg-gray-100 px-4 py-2 rounded text-sm hover:bg-gray-200"
            >
              ファイルを選ぶ
            </button>

            <input
              id="fileInput"
              type="file"
              accept="image/*"
              multiple
              onClick={(e) => (e.target.value = null)} // 同じファイルを選び直せる
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />

            <button
              onClick={() => setImages([])}
              className="text-sm px-4 py-2 border rounded bg-white hover:bg-gray-50"
            >
              消去
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <label>フレーム厚さ (%):
              <div className="mt-2 flex flex-wrap gap-2">
                {FRAME_PRESETS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setFramePct(p.pct)}
                    className={[
                      "px-3 py-1 rounded-full text-xs border transition",
                      framePct === p.pct
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"
                    ].join(" ")}
                    aria-pressed={framePct === p.pct}
                    title={`${p.pct}%`}
                  >
                    {p.label} <span className="opacity-70">{p.pct}%</span>
                  </button>
                ))}
              </div>

              <input
                type="range"
                min="2"
                max="20"
                value={framePct}
                onChange={(e) => setFramePct(Number(e.target.value))}
                className="w-full mt-2"
              />
            </label>

            <label>出力サイズ (px):
              <select value={outputSize} onChange={(e) => setOutputSize(Number(e.target.value))} className="w-full p-2 border rounded">
                <option value={1200}>1200</option>
                <option value={1600}>1600</option>
                <option value={2000}>2000</option>
                <option value={3000}>3000</option>
              </select>
            </label>

            <label>フォーマット:
              <div className="flex gap-3 mt-1">
                <label><input type="radio" checked={format === 'png'} onChange={() => setFormat('png')} /> PNG</label>
                <label><input type="radio" checked={format === 'jpeg'} onChange={() => setFormat('jpeg')} /> JPEG</label>
              </div>
            </label>
          </div>
        </div>

        <div className="w-80 flex-shrink-0">
          <div className="bg-white p-3 rounded shadow-sm">
            <p className="text-xs text-gray-500 mb-2">プレビュー</p>
            <div className="w-full h-80 flex items-center justify-center">
              {images.length === 1 ? (
                <canvas ref={canvasRef} className="w-full h-full object-contain" />
              ) : images.length > 1 ? (
                <p className="text-gray-400 text-center">複数画像を処理中です…</p>
              ) : (
                <p className="text-gray-400 text-center">ここにプレビューが表示されます</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-10 text-sm text-gray-500">© 2025 TIALA.</footer>
    </div>
  )
}
