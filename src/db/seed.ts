import { db } from './database';

const SEED_VERSION = 2;
const SEED_VERSION_KEY = 'gymtracker_seed_v';

const EXERCISES = [
  // Pecho
  { name: 'Press de banca con barra',       muscleGroup: 'Pecho' },
  { name: 'Press de banca inclinado',        muscleGroup: 'Pecho' },
  { name: 'Press de banca declinado',        muscleGroup: 'Pecho' },
  { name: 'Press con mancuernas',            muscleGroup: 'Pecho' },
  { name: 'Press con mancuernas inclinado',  muscleGroup: 'Pecho' },
  { name: 'Aperturas con mancuernas',        muscleGroup: 'Pecho' },
  { name: 'Aperturas en polea cruzada',      muscleGroup: 'Pecho' },
  { name: 'Fondos en paralelas',             muscleGroup: 'Pecho' },
  { name: 'Pullover con mancuerna',          muscleGroup: 'Pecho' },

  // Espalda
  { name: 'Peso muerto',                     muscleGroup: 'Espalda' },
  { name: 'Dominadas agarre ancho',          muscleGroup: 'Espalda' },
  { name: 'Dominadas agarre neutro',         muscleGroup: 'Espalda' },
  { name: 'Jalón al pecho agarre ancho',     muscleGroup: 'Espalda' },
  { name: 'Jalón al pecho agarre cerrado',   muscleGroup: 'Espalda' },
  { name: 'Remo con barra',                  muscleGroup: 'Espalda' },
  { name: 'Remo con mancuerna',              muscleGroup: 'Espalda' },
  { name: 'Remo en T',                       muscleGroup: 'Espalda' },
  { name: 'Remo en polea baja',              muscleGroup: 'Espalda' },
  { name: 'Pullover en polea',               muscleGroup: 'Espalda' },
  { name: 'Hiperextensiones',                muscleGroup: 'Espalda' },

  // Hombros
  { name: 'Press militar con barra',         muscleGroup: 'Hombros' },
  { name: 'Press militar con mancuernas',    muscleGroup: 'Hombros' },
  { name: 'Press Arnold',                    muscleGroup: 'Hombros' },
  { name: 'Elevaciones laterales',           muscleGroup: 'Hombros' },
  { name: 'Elevaciones laterales en polea',  muscleGroup: 'Hombros' },
  { name: 'Elevaciones frontales',           muscleGroup: 'Hombros' },
  { name: 'Pájaros (delta posterior)',       muscleGroup: 'Hombros' },
  { name: 'Face pull',                       muscleGroup: 'Hombros' },
  { name: 'Encogimientos con barra',         muscleGroup: 'Hombros' },
  { name: 'Encogimientos con mancuernas',    muscleGroup: 'Hombros' },

  // Bíceps
  { name: 'Curl con barra recta',            muscleGroup: 'Bíceps' },
  { name: 'Curl con barra Z',                muscleGroup: 'Bíceps' },
  { name: 'Curl con mancuernas',             muscleGroup: 'Bíceps' },
  { name: 'Curl martillo',                   muscleGroup: 'Bíceps' },
  { name: 'Curl concentrado',                muscleGroup: 'Bíceps' },
  { name: 'Curl en banco Scott',             muscleGroup: 'Bíceps' },
  { name: 'Curl en polea baja',              muscleGroup: 'Bíceps' },
  { name: 'Curl araña',                      muscleGroup: 'Bíceps' },

  // Tríceps
  { name: 'Press francés con barra',         muscleGroup: 'Tríceps' },
  { name: 'Press francés con mancuerna',     muscleGroup: 'Tríceps' },
  { name: 'Extensiones en polea (barra)',    muscleGroup: 'Tríceps' },
  { name: 'Extensiones en polea (cuerda)',   muscleGroup: 'Tríceps' },
  { name: 'Press cerrado',                   muscleGroup: 'Tríceps' },
  { name: 'Fondos en banco',                 muscleGroup: 'Tríceps' },
  { name: 'Patada de tríceps',               muscleGroup: 'Tríceps' },
  { name: 'Extensión de tríceps sobre cabeza', muscleGroup: 'Tríceps' },

  // Cuádriceps
  { name: 'Sentadilla con barra',            muscleGroup: 'Cuádriceps' },
  { name: 'Sentadilla frontal',              muscleGroup: 'Cuádriceps' },
  { name: 'Sentadilla búlgara',              muscleGroup: 'Cuádriceps' },
  { name: 'Prensa de piernas',               muscleGroup: 'Cuádriceps' },
  { name: 'Extensiones de cuádriceps',       muscleGroup: 'Cuádriceps' },
  { name: 'Zancadas con barra',              muscleGroup: 'Cuádriceps' },
  { name: 'Zancadas con mancuernas',         muscleGroup: 'Cuádriceps' },
  { name: 'Hack squat',                      muscleGroup: 'Cuádriceps' },

  // Isquiotibiales
  { name: 'Curl femoral tumbado',            muscleGroup: 'Isquiotibiales' },
  { name: 'Curl femoral sentado',            muscleGroup: 'Isquiotibiales' },
  { name: 'Peso muerto rumano',              muscleGroup: 'Isquiotibiales' },
  { name: 'Buenos días',                     muscleGroup: 'Isquiotibiales' },
  { name: 'Peso muerto piernas rígidas',     muscleGroup: 'Isquiotibiales' },

  // Glúteos
  { name: 'Hip thrust con barra',            muscleGroup: 'Glúteos' },
  { name: 'Hip thrust con mancuerna',        muscleGroup: 'Glúteos' },
  { name: 'Patada de glúteo en polea',       muscleGroup: 'Glúteos' },
  { name: 'Abducción de cadera en máquina',  muscleGroup: 'Glúteos' },
  { name: 'Sentadilla sumo',                 muscleGroup: 'Glúteos' },
  { name: 'Puente de glúteos',               muscleGroup: 'Glúteos' },

  // Pantorrillas
  { name: 'Elevaciones de talones de pie',   muscleGroup: 'Pantorrillas' },
  { name: 'Elevaciones de talones sentado',  muscleGroup: 'Pantorrillas' },
  { name: 'Press de talones en prensa',      muscleGroup: 'Pantorrillas' },
  { name: 'Elevaciones de talones en burro', muscleGroup: 'Pantorrillas' },

  // Core
  { name: 'Plancha',                         muscleGroup: 'Core' },
  { name: 'Plancha lateral',                 muscleGroup: 'Core' },
  { name: 'Crunch',                          muscleGroup: 'Core' },
  { name: 'Crunch inverso',                  muscleGroup: 'Core' },
  { name: 'Rueda abdominal',                 muscleGroup: 'Core' },
  { name: 'Elevaciones de piernas colgado',  muscleGroup: 'Core' },
  { name: 'Russian twist',                   muscleGroup: 'Core' },
  { name: 'Encogimientos en polea',          muscleGroup: 'Core' },
  { name: 'Dragon flag',                     muscleGroup: 'Core' },
];

export async function seedExercises() {
  const storedVersion = parseInt(localStorage.getItem(SEED_VERSION_KEY) ?? '0', 10);
  if (storedVersion >= SEED_VERSION) return;

  await db.exercises.clear();
  await db.exercises.bulkAdd(EXERCISES);
  localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
}
