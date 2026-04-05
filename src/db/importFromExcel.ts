import * as XLSX from "xlsx"
import { db } from "./database"
import { resolveExercise } from "./utils/exerciseMatcher"

export async function importExcel(file: File): Promise<{ success: boolean, errors: string[], importedSets: number }> {
  console.log("📥 Importando historial (usando rutinas existentes)...")

  const errors: string[] = []
  let importedSets = 0

  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data)

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
    const fecha = row["Fecha"]

    if (!fecha) {
      errors.push("Fila sin fecha")
      continue
    }

    if (!sessions.has(fecha)) {
      sessions.set(fecha, [])
    }

    sessions.get(fecha)!.push(row)
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

      for (const [fecha, group] of sessions.entries()) {
        const routineName = group[0]["Rutina"]

        if (!routineName) {
          const msg = `❌ Fecha ${fecha}: sin rutina`
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
          const msg = `❌ Rutina no encontrada: "${routineName}" (fecha ${fecha})`
          console.warn(msg)
          errors.push(msg)
          continue
        }

        const routineId = routine.id

        // =========================
        // CREAR SESIÓN
        // =========================

        const sessionId = await db.workoutSessions.add({
          routineId,
          routineName,
          startedAt: new Date(fecha).toISOString(),
        })

        // =========================
        // INSERTAR SETS
        // =========================

        for (const r of group) {
          const name = r["Ejercicio"]

          if (!name) {
            const msg = `❌ Fecha ${fecha}: fila sin ejercicio`
            console.warn(msg)
            errors.push(msg)
            continue
          }

          const ex = await resolveExercise(name)

          if (!ex || ex.id === undefined) {
            const msg = `❌ Ejercicio no encontrado: "${name}" (${fecha})`
            console.warn(msg)
            errors.push(msg)
            continue
          }

          const reps = Number(r["Reps"])
          let weight = Number(r["Peso (kg)"])
          if (isNaN(weight)) weight = 0

          if (!reps || isNaN(reps)) {
            const msg = `⚠️ Número de Reps inválido en ${name} (${fecha})`
            console.warn(msg)
            errors.push(msg)
            continue
          }

        const setNumber = Number(r["Serie"]) || 1

        await db.workoutSetRecords.add({
        sessionId,
        exerciseId: ex.id,
        exerciseName: ex.name,          // 🔥 FIX
        muscleGroup: ex.muscleGroup,    // 🔥 FIX
        setNumber,                      // 🔥 FIX
        reps,
        weight,
        completedAt: new Date(fecha).toISOString(), // 🔥 FIX
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