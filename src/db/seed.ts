import { db } from './database';

const SEED_VERSION = 4;
const SEED_VERSION_KEY = 'gymtracker_seed_v';

const EXERCISES = [
  // Pecho
  { id:  1, name: 'Barbell Bench Press',         muscleGroup: 'Pecho' },
  { id:  2, name: 'Incline Bench Press',          muscleGroup: 'Pecho' },
  { id:  3, name: 'Decline Bench Press',          muscleGroup: 'Pecho' },
  { id:  4, name: 'Dumbbell Press',               muscleGroup: 'Pecho' },
  { id:  5, name: 'Incline Dumbbell Press',       muscleGroup: 'Pecho' },
  { id:  6, name: 'Dumbbell Flyes',               muscleGroup: 'Pecho' },
  { id:  7, name: 'Cable Crossover',              muscleGroup: 'Pecho' },
  { id:  8, name: 'Chest Dips',                   muscleGroup: 'Pecho' },
  { id:  9, name: 'Dumbbell Pullover',            muscleGroup: 'Pecho' },

  // Espalda
  { id: 10, name: 'Deadlift',                     muscleGroup: 'Espalda' },
  { id: 11, name: 'Wide Grip Pull-ups',           muscleGroup: 'Espalda' },
  { id: 12, name: 'Neutral Grip Pull-ups',        muscleGroup: 'Espalda' },
  { id: 13, name: 'Wide Grip Lat Pulldown',       muscleGroup: 'Espalda' },
  { id: 14, name: 'Close Grip Lat Pulldown',      muscleGroup: 'Espalda' },
  { id: 15, name: 'Barbell Row',                  muscleGroup: 'Espalda' },
  { id: 16, name: 'Dumbbell Row',                 muscleGroup: 'Espalda' },
  { id: 17, name: 'T-Bar Row',                    muscleGroup: 'Espalda' },
  { id: 18, name: 'Seated Cable Row',             muscleGroup: 'Espalda' },
  { id: 19, name: 'Cable Pullover',               muscleGroup: 'Espalda' },
  { id: 20, name: 'Hyperextensions',              muscleGroup: 'Espalda' },

  // Hombros
  { id: 21, name: 'Barbell Overhead Press',       muscleGroup: 'Hombros' },
  { id: 22, name: 'Dumbbell Overhead Press',      muscleGroup: 'Hombros' },
  { id: 23, name: 'Arnold Press',                 muscleGroup: 'Hombros' },
  { id: 24, name: 'Lateral Raises',               muscleGroup: 'Hombros' },
  { id: 25, name: 'Cable Lateral Raises',         muscleGroup: 'Hombros' },
  { id: 26, name: 'Front Raises',                 muscleGroup: 'Hombros' },
  { id: 27, name: 'Rear Delt Flyes',              muscleGroup: 'Hombros' },
  { id: 28, name: 'Face Pull',                    muscleGroup: 'Hombros' },
  { id: 29, name: 'Barbell Shrugs',               muscleGroup: 'Hombros' },
  { id: 30, name: 'Dumbbell Shrugs',              muscleGroup: 'Hombros' },

  // Bíceps
  { id: 31, name: 'Straight Bar Curl',            muscleGroup: 'Bíceps' },
  { id: 32, name: 'EZ Bar Curl',                  muscleGroup: 'Bíceps' },
  { id: 33, name: 'Dumbbell Curl',                muscleGroup: 'Bíceps' },
  { id: 34, name: 'Hammer Curl',                  muscleGroup: 'Bíceps' },
  { id: 35, name: 'Concentration Curl',           muscleGroup: 'Bíceps' },
  { id: 36, name: 'Preacher Curl',                muscleGroup: 'Bíceps' },
  { id: 37, name: 'Cable Curl',                   muscleGroup: 'Bíceps' },
  { id: 38, name: 'Spider Curl',                  muscleGroup: 'Bíceps' },

  // Tríceps
  { id: 39, name: 'EZ Bar Skull Crusher',         muscleGroup: 'Tríceps' },
  { id: 40, name: 'Dumbbell Skull Crusher',       muscleGroup: 'Tríceps' },
  { id: 41, name: 'Tricep Pushdown (Bar)',         muscleGroup: 'Tríceps' },
  { id: 42, name: 'Tricep Pushdown (Rope)',        muscleGroup: 'Tríceps' },
  { id: 43, name: 'Close Grip Bench Press',       muscleGroup: 'Tríceps' },
  { id: 44, name: 'Bench Dips',                   muscleGroup: 'Tríceps' },
  { id: 45, name: 'Tricep Kickback',              muscleGroup: 'Tríceps' },
  { id: 46, name: 'Overhead Tricep Extension',    muscleGroup: 'Tríceps' },

  // Cuádriceps
  { id: 47, name: 'Barbell Squat',                muscleGroup: 'Cuádriceps' },
  { id: 48, name: 'Front Squat',                  muscleGroup: 'Cuádriceps' },
  { id: 49, name: 'Bulgarian Split Squat',        muscleGroup: 'Cuádriceps' },
  { id: 50, name: 'Leg Press',                    muscleGroup: 'Cuádriceps' },
  { id: 51, name: 'Leg Extension',                muscleGroup: 'Cuádriceps' },
  { id: 52, name: 'Barbell Lunges',               muscleGroup: 'Cuádriceps' },
  { id: 53, name: 'Dumbbell Lunges',              muscleGroup: 'Cuádriceps' },
  { id: 54, name: 'Hack Squat',                   muscleGroup: 'Cuádriceps' },

  // Isquiotibiales
  { id: 55, name: 'Lying Leg Curl',               muscleGroup: 'Isquiotibiales' },
  { id: 56, name: 'Seated Leg Curl',              muscleGroup: 'Isquiotibiales' },
  { id: 57, name: 'Romanian Deadlift',            muscleGroup: 'Isquiotibiales' },
  { id: 58, name: 'Good Mornings',                muscleGroup: 'Isquiotibiales' },
  { id: 59, name: 'Stiff-Leg Deadlift',           muscleGroup: 'Isquiotibiales' },

  // Glúteos
  { id: 60, name: 'Barbell Hip Thrust',           muscleGroup: 'Glúteos' },
  { id: 61, name: 'Dumbbell Hip Thrust',          muscleGroup: 'Glúteos' },
  { id: 62, name: 'Cable Glute Kickback',         muscleGroup: 'Glúteos' },
  { id: 63, name: 'Machine Hip Abduction',        muscleGroup: 'Glúteos' },
  { id: 64, name: 'Sumo Squat',                   muscleGroup: 'Glúteos' },
  { id: 65, name: 'Glute Bridge',                 muscleGroup: 'Glúteos' },

  // Pantorrillas
  { id: 66, name: 'Standing Calf Raises',         muscleGroup: 'Pantorrillas' },
  { id: 67, name: 'Seated Calf Raises',           muscleGroup: 'Pantorrillas' },
  { id: 68, name: 'Leg Press Calf Raises',        muscleGroup: 'Pantorrillas' },
  { id: 69, name: 'Donkey Calf Raises',           muscleGroup: 'Pantorrillas' },

  // Core
  { id: 70, name: 'Plank',                        muscleGroup: 'Core' },
  { id: 71, name: 'Side Plank',                   muscleGroup: 'Core' },
  { id: 72, name: 'Crunch',                       muscleGroup: 'Core' },
  { id: 73, name: 'Reverse Crunch',               muscleGroup: 'Core' },
  { id: 74, name: 'Ab Wheel Rollout',             muscleGroup: 'Core' },
  { id: 75, name: 'Hanging Leg Raises',           muscleGroup: 'Core' },
  { id: 76, name: 'Russian Twist',                muscleGroup: 'Core' },
  { id: 77, name: 'Cable Crunch',                 muscleGroup: 'Core' },
  { id: 78, name: 'Dragon Flag',                  muscleGroup: 'Core' },
];

export async function seedExercises() {
  const storedVersion = parseInt(localStorage.getItem(SEED_VERSION_KEY) ?? '0', 10);
  if (storedVersion >= SEED_VERSION) return;

  await db.exercises.bulkPut(EXERCISES);
  localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
}
