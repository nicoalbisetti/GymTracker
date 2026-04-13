import { ImportWorkout } from "@/components/ImportWorkout"
import { ExportImportDB } from "@/components/ExportImportDB"
import { Settings } from "lucide-react"

export function SettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
          <Settings size={28} />
        </div>
        <h1 className="text-3xl font-bold text-white">Ajustes</h1>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-200 border-b border-white/10 pb-2">Gestión de Datos</h2>
        <ExportImportDB />
        <ImportWorkout />
      </section>
    </div>
  )
}