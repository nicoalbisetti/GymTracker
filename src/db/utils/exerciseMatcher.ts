import { db } from "../database"

// 🔧 normalización base
export function normalize(text: string) {
  return text.trim().toLowerCase()
}

// 🔧 mapping controlado (tu Excel → DB)
const NAME_MAP: Record<string, string> = {
  "shoulder press": "Barbell Overhead Press",
  "leg press": "Leg Press",
  "leg extension": "Leg Extension",
  "leg curl": "Lying Leg Curl",
  "lateral raises": "Lateral Raises",
  "reverse fly": "Rear Delt Flyes",
  "face pull": "Face Pull",
  "peck deck": "Dumbbell Flyes",
}

// 🔥 función única de resolución
export async function resolveExercise(name: string) {
  const normalized = normalize(name)
  const exercises = await db.exercises.toArray()

  // 1. Check exact match first
  let match = exercises.find((e) => normalize(e.name) === normalized)
  if (match) return match

  // 2. Fallback to mapped name
  const mappedName = NAME_MAP[normalized]
  if (mappedName) {
    match = exercises.find((e) => normalize(e.name) === normalize(mappedName))
  }

  return match || null
}