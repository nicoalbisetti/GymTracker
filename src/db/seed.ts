import { db } from './database';

const SEED_VERSION = 3;
const SEED_VERSION_KEY = 'gymtracker_seed_v';

const EXERCISES = [
  // Pecho
  { name: 'Barbell Bench Press',            muscleGroup: 'Pecho' },
  { name: 'Incline Bench Press',            muscleGroup: 'Pecho' },
  { name: 'Decline Bench Press',            muscleGroup: 'Pecho' },
  { name: 'Dumbbell Press',                 muscleGroup: 'Pecho' },
  { name: 'Incline Dumbbell Press',         muscleGroup: 'Pecho' },
  { name: 'Dumbbell Flyes',                 muscleGroup: 'Pecho' },
  { name: 'Cable Crossover',                muscleGroup: 'Pecho' },
  { name: 'Chest Dips',                     muscleGroup: 'Pecho' },
  { name: 'Dumbbell Pullover',              muscleGroup: 'Pecho' },

  // Espalda
  { name: 'Deadlift',                       muscleGroup: 'Espalda' },
  { name: 'Wide Grip Pull-ups',             muscleGroup: 'Espalda' },
  { name: 'Neutral Grip Pull-ups',          muscleGroup: 'Espalda' },
  { name: 'Wide Grip Lat Pulldown',         muscleGroup: 'Espalda' },
  { name: 'Close Grip Lat Pulldown',        muscleGroup: 'Espalda' },
  { name: 'Barbell Row',                    muscleGroup: 'Espalda' },
  { name: 'Dumbbell Row',                   muscleGroup: 'Espalda' },
  { name: 'T-Bar Row',                      muscleGroup: 'Espalda' },
  { name: 'Seated Cable Row',               muscleGroup: 'Espalda' },
  { name: 'Cable Pullover',                 muscleGroup: 'Espalda' },
  { name: 'Hyperextensions',                muscleGroup: 'Espalda' },

  // Hombros
  { name: 'Barbell Overhead Press',         muscleGroup: 'Hombros' },
  { name: 'Dumbbell Overhead Press',        muscleGroup: 'Hombros' },
  { name: 'Arnold Press',                   muscleGroup: 'Hombros' },
  { name: 'Lateral Raises',                 muscleGroup: 'Hombros' },
  { name: 'Cable Lateral Raises',           muscleGroup: 'Hombros' },
  { name: 'Front Raises',                   muscleGroup: 'Hombros' },
  { name: 'Rear Delt Flyes',                muscleGroup: 'Hombros' },
  { name: 'Face Pull',                      muscleGroup: 'Hombros' },
  { name: 'Barbell Shrugs',                 muscleGroup: 'Hombros' },
  { name: 'Dumbbell Shrugs',                muscleGroup: 'Hombros' },

  // Bíceps
  { name: 'Straight Bar Curl',              muscleGroup: 'Bíceps' },
  { name: 'EZ Bar Curl',                    muscleGroup: 'Bíceps' },
  { name: 'Dumbbell Curl',                  muscleGroup: 'Bíceps' },
  { name: 'Hammer Curl',                    muscleGroup: 'Bíceps' },
  { name: 'Concentration Curl',             muscleGroup: 'Bíceps' },
  { name: 'Preacher Curl',                  muscleGroup: 'Bíceps' },
  { name: 'Cable Curl',                     muscleGroup: 'Bíceps' },
  { name: 'Spider Curl',                    muscleGroup: 'Bíceps' },

  // Tríceps
  { name: 'EZ Bar Skull Crusher',           muscleGroup: 'Tríceps' },
  { name: 'Dumbbell Skull Crusher',         muscleGroup: 'Tríceps' },
  { name: 'Tricep Pushdown (Bar)',           muscleGroup: 'Tríceps' },
  { name: 'Tricep Pushdown (Rope)',          muscleGroup: 'Tríceps' },
  { name: 'Close Grip Bench Press',         muscleGroup: 'Tríceps' },
  { name: 'Bench Dips',                     muscleGroup: 'Tríceps' },
  { name: 'Tricep Kickback',                muscleGroup: 'Tríceps' },
  { name: 'Overhead Tricep Extension',      muscleGroup: 'Tríceps' },

  // Cuádriceps
  { name: 'Barbell Squat',                  muscleGroup: 'Cuádriceps' },
  { name: 'Front Squat',                    muscleGroup: 'Cuádriceps' },
  { name: 'Bulgarian Split Squat',          muscleGroup: 'Cuádriceps' },
  { name: 'Leg Press',                      muscleGroup: 'Cuádriceps' },
  { name: 'Leg Extension',                  muscleGroup: 'Cuádriceps' },
  { name: 'Barbell Lunges',                 muscleGroup: 'Cuádriceps' },
  { name: 'Dumbbell Lunges',                muscleGroup: 'Cuádriceps' },
  { name: 'Hack Squat',                     muscleGroup: 'Cuádriceps' },

  // Isquiotibiales
  { name: 'Lying Leg Curl',                 muscleGroup: 'Isquiotibiales' },
  { name: 'Seated Leg Curl',                muscleGroup: 'Isquiotibiales' },
  { name: 'Romanian Deadlift',              muscleGroup: 'Isquiotibiales' },
  { name: 'Good Mornings',                  muscleGroup: 'Isquiotibiales' },
  { name: 'Stiff-Leg Deadlift',             muscleGroup: 'Isquiotibiales' },

  // Glúteos
  { name: 'Barbell Hip Thrust',             muscleGroup: 'Glúteos' },
  { name: 'Dumbbell Hip Thrust',            muscleGroup: 'Glúteos' },
  { name: 'Cable Glute Kickback',           muscleGroup: 'Glúteos' },
  { name: 'Machine Hip Abduction',          muscleGroup: 'Glúteos' },
  { name: 'Sumo Squat',                     muscleGroup: 'Glúteos' },
  { name: 'Glute Bridge',                   muscleGroup: 'Glúteos' },

  // Pantorrillas
  { name: 'Standing Calf Raises',           muscleGroup: 'Pantorrillas' },
  { name: 'Seated Calf Raises',             muscleGroup: 'Pantorrillas' },
  { name: 'Leg Press Calf Raises',          muscleGroup: 'Pantorrillas' },
  { name: 'Donkey Calf Raises',             muscleGroup: 'Pantorrillas' },

  // Core
  { name: 'Plank',                          muscleGroup: 'Core' },
  { name: 'Side Plank',                     muscleGroup: 'Core' },
  { name: 'Crunch',                         muscleGroup: 'Core' },
  { name: 'Reverse Crunch',                 muscleGroup: 'Core' },
  { name: 'Ab Wheel Rollout',               muscleGroup: 'Core' },
  { name: 'Hanging Leg Raises',             muscleGroup: 'Core' },
  { name: 'Russian Twist',                  muscleGroup: 'Core' },
  { name: 'Cable Crunch',                   muscleGroup: 'Core' },
  { name: 'Dragon Flag',                    muscleGroup: 'Core' },
];

export async function seedExercises() {
  const storedVersion = parseInt(localStorage.getItem(SEED_VERSION_KEY) ?? '0', 10);
  if (storedVersion >= SEED_VERSION) return;

  await db.exercises.clear();
  await db.exercises.bulkAdd(EXERCISES);
  localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
}
