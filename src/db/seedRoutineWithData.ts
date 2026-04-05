import { db } from './database'

export async function seedRoutineWithData() {
    console.log("🧹 Limpiando datos de entrenamiento...")

    await db.transaction(
        "rw",
        [db.routines,
        db.routineExercises,
        db.sets,
        db.workoutSessions,
        db.workoutSetRecords],
        async () => {
            await db.routines.clear()
            await db.routineExercises.clear()
            await db.sets.clear()
            await db.workoutSessions.clear()
            await db.workoutSetRecords.clear()
        }
    )

    console.log("✅ Limpieza completa")

    // =====================
    // CREAR RUTINA
    // =====================

    const routineId = await db.routines.add({
        name: "Rutina Nico Fuerza",
        createdAt: new Date().toISOString(),
    })

    // =====================
    // EJERCICIOS (IDs reales del seed)
    // =====================

    const EX = {
        bench: 1,          // Barbell Bench Press
        latPulldown: 13,   // Wide Grip Lat Pulldown
        shoulderPress: 21, // Barbell Overhead Press
        squat: 47          // Barbell Squat
    }

    // =====================
    // RELACIONAR EJERCICIOS
    // =====================

    const reBench = await db.routineExercises.add({
        routineId,
        exerciseId: EX.bench,
        orderIndex: 1,
        restSeconds: 90,
    })

    const reLat = await db.routineExercises.add({
        routineId,
        exerciseId: EX.latPulldown,
        orderIndex: 2,
        restSeconds: 90,
    })

    const reShoulder = await db.routineExercises.add({
        routineId,
        exerciseId: EX.shoulderPress,
        orderIndex: 3,
        restSeconds: 90,
    })

    const reSquat = await db.routineExercises.add({
        routineId,
        exerciseId: EX.squat,
        orderIndex: 4,
        restSeconds: 120,
    })

    // =====================
    // SETS TEMPLATE (12-10-8-8)
    // =====================

    const createSets = (routineExerciseId: number) =>
        db.sets.bulkAdd([
            { routineExerciseId, setNumber: 1, reps: 12, weight: 0 },
            { routineExerciseId, setNumber: 2, reps: 10, weight: 0 },
            { routineExerciseId, setNumber: 3, reps: 8, weight: 0 },
            { routineExerciseId, setNumber: 4, reps: 8, weight: 0 },
        ])

    await createSets(reBench)
    await createSets(reLat)
    await createSets(reShoulder)
    await createSets(reSquat)

    console.log("✅ Rutina creada")

    // =====================
    // SESIÓN REAL (VIERNES)
    // =====================

    const sessionId = await db.workoutSessions.add({
        routineId,
        routineName: "Rutina Nico Fuerza",
        startedAt: new Date("2026-04-03").toISOString(),
    })

    // =====================
    // PESOS REALES (AJUSTAMOS DESPUÉS)
    // =====================

    await db.workoutSetRecords.bulkAdd([
        // Bench
        { sessionId, exerciseId: EX.bench, exerciseName: "Barbell Bench Press", muscleGroup: "Chest", setNumber: 1,  reps: 12, weight: 60, completedAt: new Date().toISOString() },
        { sessionId, exerciseId: EX.bench, exerciseName: "Barbell Bench Press", muscleGroup: "Chest", setNumber: 2,  reps: 10, weight: 70, completedAt: new Date().toISOString() },
        { sessionId, exerciseId: EX.bench, exerciseName: "Barbell Bench Press", muscleGroup: "Chest", setNumber: 3,  reps: 8, weight: 80, completedAt: new Date().toISOString() },
        { sessionId, exerciseId: EX.bench, exerciseName: "Barbell Bench Press", muscleGroup: "Chest", setNumber: 4,  reps: 8, weight: 80, completedAt: new Date().toISOString() },

        // Lat Pulldown
        { sessionId, exerciseId: EX.latPulldown, exerciseName: "Wide Grip Lat Pulldown", muscleGroup: "Back", setNumber: 1, reps: 12, weight: 40, completedAt: new Date().toISOString() },
        { sessionId, exerciseId: EX.latPulldown, exerciseName: "Wide Grip Lat Pulldown", muscleGroup: "Back", setNumber: 2, reps: 10, weight: 45, completedAt: new Date().toISOString() },
        { sessionId, exerciseId: EX.latPulldown, exerciseName: "Wide Grip Lat Pulldown", muscleGroup: "Back", setNumber: 3, reps: 8, weight: 50, completedAt: new Date().toISOString() },
        { sessionId, exerciseId: EX.latPulldown, exerciseName: "Wide Grip Lat Pulldown", muscleGroup: "Back", setNumber: 4, reps: 8, weight: 50, completedAt: new Date().toISOString() },

        // Shoulder
        { sessionId, exerciseId: EX.shoulderPress, exerciseName: "Barbell Overhead Press", muscleGroup: "Shoulders", setNumber: 1, reps: 12, weight: 30, completedAt: new Date().toISOString() },
        { sessionId, exerciseId: EX.shoulderPress, exerciseName: "Barbell Overhead Press", muscleGroup: "Shoulders", setNumber: 2, reps: 10, weight: 35, completedAt: new Date().toISOString() },
        { sessionId, exerciseId: EX.shoulderPress, exerciseName: "Barbell Overhead Press", muscleGroup: "Shoulders", setNumber: 3, reps: 8, weight: 40, completedAt: new Date().toISOString() },
        { sessionId, exerciseId: EX.shoulderPress, exerciseName: "Barbell Overhead Press", muscleGroup: "Shoulders", setNumber: 4, reps: 8, weight: 40, completedAt: new Date().toISOString() },

        // Squat
        { sessionId, exerciseId: EX.squat, exerciseName: "Barbell Squat", muscleGroup: "Legs", setNumber: 1, reps: 12, weight: 80, completedAt: new Date().toISOString() },
        { sessionId, exerciseId: EX.squat, exerciseName: "Barbell Squat", muscleGroup: "Legs", setNumber: 2, reps: 10, weight: 90, completedAt: new Date().toISOString() },
        { sessionId, exerciseId: EX.squat, exerciseName: "Barbell Squat", muscleGroup: "Legs", setNumber: 3, reps: 8, weight: 100, completedAt: new Date().toISOString() },
        { sessionId, exerciseId: EX.squat, exerciseName: "Barbell Squat", muscleGroup: "Legs", setNumber: 4, reps: 8, weight: 100, completedAt: new Date().toISOString() },
    ])

    console.log("🏁 Seed completo con datos reales")
}