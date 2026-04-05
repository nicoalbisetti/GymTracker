import { db } from './database'

export async function seedFullRoutine() {
    console.log("🧹 Limpiando datos...")

    await db.transaction(
        "rw",
        db.routines,
        db.routineExercises,
        db.sets,
        db.workoutSessions,
        db.workoutSetRecords,
        async () => {
            await db.routines.clear()
            await db.routineExercises.clear()
            await db.sets.clear()
            await db.workoutSessions.clear()
            await db.workoutSetRecords.clear()
        }
    )

    console.log("✅ Base limpia")

    // =========================
    // CREAR RUTINAS
    // =========================

    const routineAId = await db.routines.add({
        name: "Día A - Pecho & Espalda",
        createdAt: new Date().toISOString(),
    })

    const routineBId = await db.routines.add({
        name: "Día B - Hombros & Piernas",
        createdAt: new Date().toISOString(),
    })

    // =========================
    // EJERCICIOS (IDs del seed)
    // =========================

    const EX = {
        // A
        bench: 1,
        lat: 13,
        incline: 2,
        row: 18,
        peck: 6,
        facepull: 28,
        crunch: 72,
        reverseCrunch: 73,
        hammer: 34,
        tricep: 42,

        // B
        legPress: 50,
        shoulderSmith: 21,
        legExtension: 51,
        lateralRaise: 24,
        legCurl: 55,
        reverseFly: 27,
        calf: 67,
        uprightRow: 15,
    }

    const weightsA = {
        bench: [65, 70, 75, 80],
        lat: [75, 80, 85, 90],
        incline: [60, 65, 70, 75],
        row: [75, 80, 85, 90],
        peck: [70, 75, 80, 80],
        facepull: [35, 40, 45, 45],
        hammer: [14, 16, 18, 18],
        tricep: [60, 60, 65, 65],
    }

    const weightsB = {
        legPress: [100, 110, 120, 130],   // + 135 extra set (ahora vemos esto)
        shoulderSmith: [40, 45, 50, 55],
        legExtension: [80, 85, 90, 95],
        lateralRaise: [12, 14, 16, 18],
        legCurl: [60, 65, 70, 70],
        reverseFly: [10, 10, 12, 12],
        calf: [90, 95, 100, 100],
        uprightRow: [35, 40, 45, 45],
    }


    // =========================
    // HELPERS
    // =========================

    const addExercise = async (
        routineId: number,
        exerciseId: number,
        order: number,
        weights?: number[]
    ) => {
        const reId = await db.routineExercises.add({
            routineId,
            exerciseId,
            order,
            restSeconds: 60,
        })

        // 👉 SI NO hay weights (ej: crunch)
        if (!weights) {
            await db.sets.bulkAdd([
                { routineExerciseId: reId, targetReps: 30 },
                { routineExerciseId: reId, targetReps: 30 },
                { routineExerciseId: reId, targetReps: 30 },
                { routineExerciseId: reId, targetReps: 30 },
            ])
            return
        }

        // 👉 SI hay weights
        await db.sets.bulkAdd([
            { routineExerciseId: reId, targetReps: 12, weight: weights[0] },
            { routineExerciseId: reId, targetReps: 10, weight: weights[1] },
            { routineExerciseId: reId, targetReps: 8, weight: weights[2] },
            { routineExerciseId: reId, targetReps: 8, weight: weights[3] },
        ])
    }

    // =========================
    // RUTINA A
    // =========================

    await addExercise(routineAId, EX.bench, 1, weightsA.bench)
    await addExercise(routineAId, EX.lat, 2, weightsA.lat)
    await addExercise(routineAId, EX.incline, 3, weightsA.incline)
    await addExercise(routineAId, EX.row, 4, weightsA.row)
    await addExercise(routineAId, EX.peck, 5, weightsA.peck)
    await addExercise(routineAId, EX.facepull, 6, weightsA.facepull)
    await addExercise(routineAId, EX.crunch, 7)
    await addExercise(routineAId, EX.reverseCrunch, 8)
    await addExercise(routineAId, EX.hammer, 9, weightsA.hammer)
    await addExercise(routineAId, EX.tricep, 10, weightsA.tricep)

    // =========================
    // RUTINA B
    // =========================

    await addExercise(routineBId, EX.legPress, 1, weightsB.legPress)
    await addExercise(routineBId, EX.shoulderSmith, 2, weightsB.shoulderSmith)
    await addExercise(routineBId, EX.legExtension, 3, weightsB.legExtension)
    await addExercise(routineBId, EX.lateralRaise, 4, weightsB.lateralRaise)
    await addExercise(routineBId, EX.legCurl, 5, weightsB.legCurl)
    await addExercise(routineBId, EX.reverseFly, 6, weightsB.reverseFly)
    await addExercise(routineBId, EX.calf, 7, weightsB.calf)
    await addExercise(routineBId, EX.uprightRow, 8, weightsB.uprightRow)
    await addExercise(routineBId, EX.reverseCrunch, 9)

    console.log("✅ Rutinas creadas")

    // =========================
    // SESIÓN A
    // =========================

    const sessionA = await db.workoutSessions.add({
        routineId: routineAId,
        startedAt: new Date("2026-04-03").toISOString(),
    })

    await db.workoutSetRecords.bulkAdd([
        { sessionId: sessionA, exerciseId: EX.bench, reps: 12, weight: 65 },
        { sessionId: sessionA, exerciseId: EX.bench, reps: 12, weight: 70 },
        { sessionId: sessionA, exerciseId: EX.bench, reps: 8, weight: 75 },
        { sessionId: sessionA, exerciseId: EX.bench, reps: 8, weight: 80 },

        { sessionId: sessionA, exerciseId: EX.lat, reps: 12, weight: 75 },
        { sessionId: sessionA, exerciseId: EX.lat, reps: 10, weight: 80 },
        { sessionId: sessionA, exerciseId: EX.lat, reps: 8, weight: 85 },
        { sessionId: sessionA, exerciseId: EX.lat, reps: 7, weight: 90 },
    ])

    // =========================
    // SESIÓN B
    // =========================

    const sessionB = await db.workoutSessions.add({
        routineId: routineBId,
        startedAt: new Date("2026-04-02").toISOString(),
    })

    await db.workoutSetRecords.bulkAdd([
        { sessionId: sessionB, exerciseId: EX.legPress, reps: 15, weight: 100 },
        { sessionId: sessionB, exerciseId: EX.legPress, reps: 12, weight: 110 },
        { sessionId: sessionB, exerciseId: EX.legPress, reps: 10, weight: 120 },
        { sessionId: sessionB, exerciseId: EX.legPress, reps: 8, weight: 130 },
        { sessionId: sessionB, exerciseId: EX.legPress, reps: 8, weight: 135 },
    ])

    console.log("🏁 Seed completo listo")
}