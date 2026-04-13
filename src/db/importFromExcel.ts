// TODO: migrar a Supabase
import * as XLSX from "xlsx"
import { db } from "./database"
import { resolveExercise } from "./utils/exerciseMatcher"

/**
 * Normaliza cualquier valor de fecha proveniente de XLSX a "YYYY-MM-DD".
 * Con cellDates:true, XLSX devuelve JS Date objects para celdas de fecha.
 * Como fallback también maneja strings DD/MM/YYYY y YYYY-MM-DD.
 */
function parseFecha(raw: unknown): string | null {
  if (!raw) return null

  // JS Date object (XLSX con cellDates: true)
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null
    const y = raw.getFullYear()
    const m = String(raw.getMonth() + 1).padStart(2, '0')
    const d = String(raw.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // String: intentar DD/MM/YYYY (formato argentino) o YYYY-MM-DD (ISO)
  if (typeof raw === 'string') {
    const ddmm = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (ddmm) {
      const [, d, m, y] = ddmm
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    const iso = new Date(raw)
    if (!isNaN(iso.getTime())) {
      return iso.toISOString().split('T')[0]
    }
    return null
  }

  // Serial numérico de Excel (fallback si cellDates no funcionó)
  // Excel epoch: 1/1/1900 = serial 1; JS epoch: 1/1/1970
  // Diferencia: 25569 días (descontando el bug del año bisiesto de Excel)
  if (typeof raw === 'number') {
    const jsDate = new Date((raw - 25569) * 86400 * 1000)
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toISOString().split('T')[0]
    }
    return null
  }

  return null
}

export async function importExcel(file: File): Promise<{ success: boolean, errors: string[], importedSets: number }> {
  console.log("📥 Importando historial (usando rutinas existentes)...")

  const errors: string[] = []
  let importedSets = 0

  const data = await file.arrayBuffer()
  // cellDates: true hace que XLSX devuelva JS Date objects en lugar de seriales numéricos
  const workbook = XLSX.read(data, { cellDates: true })

  const sheet = workbook.Sheets["Logs"]
  const rows = XLSX.utils.sheet_to_json<any>(sheet)

  if (!rows.length) {
    console.error("❌ Archivo vacío")
    return { success: false, errors: ["El archivo Excel está vacío o no tiene la hoja 'Logs'."], importedSets: 0 }
  }

  console.log("📊 Filas:", rows.length)

  // =========================
  // AGRUPAR POR FECHA
  // =========================

  const sessions = new Map<string, any[]>()

  for (const row of rows) {
    const fechaKey = parseFecha(row["Fecha"])

    if (!fechaKey) {
      errors.push("Fila sin fecha válida")
      continue
    }

    if (!sessions.has(fechaKey)) {
      sessions.set(fechaKey, [])
    }

    sessions.get(fechaKey)!.push(row)
  }

  // =========================
  // TRANSACCIÓN
  // =========================

  await db.transaction(
    "rw",
    [db.workoutSessions, db.workoutSetRecords, db.routines, db.exercises],
    async () => {
      await db.workoutSessions.clear()
      await db.workoutSetRecords.clear()

      for (const [fechaKey, group] of sessions.entries()) {
        const routineName = group[0]["Rutina"]

        if (!routineName) {
          const msg = `❌ Fecha ${fechaKey}: sin rutina`
          console.warn(msg)
          errors.push(msg)
          continue
        }

        // =========================
        // BUSCAR RUTINA EXISTENTE
        // =========================

        const routines = await db.routines.toArray()

        const routine = routines.find(r => r.name === routineName)

        if (!routine || routine.id === undefined) {
          const msg = `❌ Rutina no encontrada: "${routineName}" (fecha ${fechaKey})`
          console.warn(msg)
          errors.push(msg)
          continue
        }

        const routineId = routine.id

        // =========================
        // CREAR SESIÓN
        // =========================

        const isoDate = new Date(fechaKey + 'T12:00:00.000Z').toISOString()

        const sessionId = await db.workoutSessions.add({
          routineId,
          routineName,
          startedAt: isoDate,
          finishedAt: isoDate,
        })

        // =========================
        // INSERTAR SETS
        // =========================

        for (const r of group) {
          const name = r["Ejercicio"]

          if (!name) {
            const msg = `❌ Fecha ${fechaKey}: fila sin ejercicio`
            console.warn(msg)
            errors.push(msg)
            continue
          }

          const ex = await resolveExercise(name)

          if (!ex || ex.id === undefined) {
            const msg = `❌ Ejercicio no encontrado: "${name}" (${fechaKey})`
            console.warn(msg)
            errors.push(msg)
            continue
          }

          const reps = Number(r["Reps"])
          let weight = Number(r["Peso (kg)"])
          if (isNaN(weight)) weight = 0

          if (!reps || isNaN(reps)) {
            const msg = `⚠️ Número de Reps inválido en ${name} (${fechaKey})`
            console.warn(msg)
            errors.push(msg)
            continue
          }

          const setNumber = Number(r["Serie"]) || 1

          await db.workoutSetRecords.add({
            sessionId,
            exerciseId: ex.id,
            exerciseName: ex.name,
            muscleGroup: ex.muscleGroup,
            setNumber,
            reps,
            weight,
            completedAt: isoDate,
          })

          importedSets++
        }
      }
    }
  )

  // =========================
  // REPORTE FINAL
  // =========================

  return {
    success: errors.length === 0,
    errors,
    importedSets
  }
}
