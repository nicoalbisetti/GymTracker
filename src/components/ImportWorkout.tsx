import { importExcel } from "@/db/importFromExcel"
import { useState, useRef } from "react"
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

export function ImportWorkout() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; errors: string[]; importedSets: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setResult(null)

    try {
      const res = await importExcel(file)
      setResult(res)
    } catch (err: any) {
      console.error(err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      setResult({ success: false, errors: [`Error al procesar el archivo: ${errorMsg}`], importedSets: 0 })
    } finally {
      setLoading(false)
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 flex flex-col gap-4 text-white">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
          <FileSpreadsheet size={24} />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Importar Sesiones</h2>
          <p className="text-sm text-gray-400">Importa tu historial de entrenamiento desde Excel.</p>
        </div>
      </div>

      <label className="relative cursor-pointer group flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-xl hover:border-blue-400/50 hover:bg-white/5 transition-all">
        <input
          type="file"
          accept=".xlsx"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImport}
          disabled={loading}
        />
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-blue-400" size={32} />
            <span className="text-sm font-medium">Procesando archivo...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-gray-300 group-hover:text-white transition-colors">
            <Upload size={32} />
            <span className="text-sm font-medium">Haz click para seleccionar tu archivo .xlsx</span>
          </div>
        )}
      </label>

      {result && (
        <div className={`p-4 rounded-xl text-sm border flex flex-col gap-2 ${result.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <div className="flex items-center gap-2 font-semibold">
            {result.success ? <CheckCircle2 className="text-green-400" size={20} /> : <AlertCircle className="text-red-400" size={20} />}
            <span className={result.success ? "text-green-400" : "text-red-400"}>
              {result.success ? "¡Importación exitosa!" : "Importación finalizada con errores."}
            </span>
          </div>
          
          <p className="text-gray-300 font-medium">Se importaron {result.importedSets} sets (series).</p>
          
          {result.errors.length > 0 && (
            <div className="mt-2 text-xs text-red-300">
              <span className="font-semibold mb-1 block">Detalles de errores ({result.errors.length}):</span>
              <ul className="list-disc pl-4 space-y-1 max-h-32 overflow-y-auto w-full break-words">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}