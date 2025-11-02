import React, { useRef, useState, useEffect } from 'react'

// PhotoFrameSite — React + Tailwind
// 画像をアップロードすると正方形の白枠を自動で付けてプレビュー＆ダウンロードできるツール。

export default function PhotoFrameSite() {
  const canvasRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [image, setImage] = useState(null)
  const [framePct, setFramePct] = useState(8)
  const [outputSize, setOutputSize] = useState(2000)
  const [format, setFormat] = useState('jpeg')
  const [dragging, setDragging] = useState(false)

  // ✅ 画像変更時に自動プレビュー＆自動ダウンロード
  useEffect(() => {
    if (!image) return

    const timer = setTimeout(() => {
      draw()
      setTimeout(() => {
        downloadImage()
      }, 300)
    }, 300)

    return () => clearTimeout(timer)
  }, [image])

  // ✅ ファイル選択時
  const handleFiles = (files) => {
    if (!files || !files.length) return
    const f = files[0]
    setFileName(f.name)
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => {
      setImage(img)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  // ✅ ドラッグ&ドロップ処理
  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  // ✅ 描画処理
  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas || !image) return

    const ctx = canvas.getContext('2d')
    const size = outputSize
    canvas.width = size
    canvas.height = size

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)

    const border = Math.round((framePct / 100) * size)
    const innerSize = size - border * 2

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(border, border, innerSize, innerSize)

    const scale = Math.min(innerSize / image.width, innerSize / image.height)
    const w = image.width * scale
    const h = image.height * scale
    const x = border + (innerSize - w) / 2
    const y = border + (innerSize - h) / 2

    ctx.drawImage(image, x, y, w, h)
  }

  // ✅ ダウンロード処理
  const downloadImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    const ext = format === 'jpeg' ? 'jpg' : 'png'
    canvas.toBlob((blob) => {
      const a = document.createElement('a')
      const url = URL.createObjectURL(blob)
      a.href = url
      a.download = (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'framed-image') + `.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    }, mime)
  }

  // ✅ 表示部
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <h1 className="text-2xl font-semibold mb-8 text-gray-800">写真に白いフレームを付けるサイト</h1>

      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        className={`w-full max-w-4xl p-8 border-2 ${dragging ? 'border-gray-400 bg-white' : 'border-gray-200 bg-white/70'} border-dashed rounded-xl flex flex-col md:flex-row gap-8 items-center`}
      >
        <div className="flex-1 w-full">
          <p className="text-sm text-gray-600">画像をドラッグ＆ドロップ、またはファイルを選択してください。</p>
          <div className="mt-4 flex gap-3">
            <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded text-sm hover:bg-gray-200">
              ファイルを選ぶ
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </label>
            <button onClick={() => { setImage(null); setFileName('') }} className="text-sm px-4 py-2 border rounded bg-white hover:bg-gray-50">消去</button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <label>フレーム厚さ (%):
              <input type="range" min="2" max="20" value={framePct} onChange={(e) => setFramePct(Number(e.target.value))} className="w-full" />
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

            <div>
              <p className="mb-2">操作:</p>
              <div className="flex gap-2">
                <button onClick={draw} className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800">プレビュー更新</button>
                <button onClick={downloadImage} disabled={!image} className="px-4 py-2 bg-white border rounded hover:bg-gray-50">ダウンロード</button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-80 flex-shrink-0">
          <div className="bg-white p-3 rounded shadow-sm">
            <p className="text-xs text-gray-500 mb-2">プレビュー</p>
            <div className="w-full h-80 flex items-center justify-center">
              {image ? (
                <canvas ref={canvasRef} className="w-full h-full object-contain" />
              ) : (
                <p className="text-gray-400 text-center">ここにプレビューが表示されます</p>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">アップロード後にプレビューを確認し、白枠付き画像を保存できます。</p>
        </div>
      </div>

      <footer className="mt-10 text-sm text-gray-500">© 2025 TIALA.</footer>
    </div>
  )
}
