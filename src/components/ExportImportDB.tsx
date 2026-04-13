import { useState, useRef } from 'react';
import { Download, Upload, Database, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { db } from '@/db/database';

interface DBSnapshot {
  version: number;
  exportedAt: string;
  exercises: unknown[];
  routines: unknown[];
  routineExercises: unknown[];
  sets: unknown[];
  workoutSessions: unknown[];
  workoutSetRecords: unknown[];
}

async function exportDB(): Promise<void> {
  const [exercises, routines, routineExercises, sets, workoutSessions, workoutSetRecords] =
    await Promise.all([
      db.exercises.toArray(),
      db.routines.toArray(),
      db.routineExercises.toArray(),
      db.sets.toArray(),
      db.workoutSessions.toArray(),
      db.workoutSetRecords.toArray(),
    ]);

  const snapshot: DBSnapshot = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises,
    routines,
    routineExercises,
    sets,
    workoutSessions,
    workoutSetRecords,
  };

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gymtracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importDB(file: File): Promise<{ imported: Record<string, number> }> {
  const text = await file.text();
  const snapshot = JSON.parse(text) as Partial<DBSnapshot>;

  if (!snapshot.exercises || !snapshot.routines) {
    throw new Error('El archivo no parece ser un backup válido de GymTracker.');
  }

  await db.transaction(
    'rw',
    [db.exercises, db.routines, db.routineExercises, db.sets, db.workoutSessions, db.workoutSetRecords],
    async () => {
      if (snapshot.exercises?.length) await db.exercises.bulkPut(snapshot.exercises as never[]);
      if (snapshot.routines?.length) await db.routines.bulkPut(snapshot.routines as never[]);
      if (snapshot.routineExercises?.length) await db.routineExercises.bulkPut(snapshot.routineExercises as never[]);
      if (snapshot.sets?.length) await db.sets.bulkPut(snapshot.sets as never[]);
      if (snapshot.workoutSessions?.length) await db.workoutSessions.bulkPut(snapshot.workoutSessions as never[]);
      if (snapshot.workoutSetRecords?.length) await db.workoutSetRecords.bulkPut(snapshot.workoutSetRecords as never[]);
    }
  );

  return {
    imported: {
      exercises: snapshot.exercises?.length ?? 0,
      routines: snapshot.routines?.length ?? 0,
      routineExercises: snapshot.routineExercises?.length ?? 0,
      sets: snapshot.sets?.length ?? 0,
      workoutSessions: snapshot.workoutSessions?.length ?? 0,
      workoutSetRecords: snapshot.workoutSetRecords?.length ?? 0,
    },
  };
}

export function ExportImportDB() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: Record<string, number> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      await exportDB();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar.');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setError(null);

    try {
      const result = await importDB(file);
      setImportResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al importar.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const totalImported = importResult
    ? Object.values(importResult.imported).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 flex flex-col gap-5 text-white">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-violet-500/20 text-violet-400 rounded-xl">
          <Database size={24} />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Backup / Restaurar</h2>
          <p className="text-sm text-gray-400">
            Exportá todos tus datos a JSON e importalos en otro dispositivo u origen.
          </p>
        </div>
      </div>

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 rounded-xl font-medium transition-colors"
      >
        {exporting ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Download size={18} />
        )}
        {exporting ? 'Exportando...' : 'Exportar mis datos'}
      </button>

      {/* Import */}
      <label className="relative cursor-pointer group flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-violet-400/50 hover:bg-white/5 transition-all">
        <input
          type="file"
          accept=".json"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImport}
          disabled={importing}
        />
        {importing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-violet-400" size={28} />
            <span className="text-sm font-medium">Importando...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300 group-hover:text-white transition-colors">
            <Upload size={28} />
            <span className="text-sm font-medium">Seleccionar backup .json para restaurar</span>
            <span className="text-xs text-gray-500">Los datos existentes se conservan (upsert)</span>
          </div>
        )}
      </label>

      {/* Result */}
      {importResult && (
        <div className="p-4 rounded-xl text-sm border bg-green-500/10 border-green-500/30 flex flex-col gap-1">
          <div className="flex items-center gap-2 font-semibold text-green-400 mb-1">
            <CheckCircle2 size={18} />
            Restauración exitosa — {totalImported} registros importados
          </div>
          {Object.entries(importResult.imported)
            .filter(([, n]) => n > 0)
            .map(([table, n]) => (
              <p key={table} className="text-gray-300 text-xs">
                {table}: {n}
              </p>
            ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl text-sm border bg-red-500/10 border-red-500/30 flex items-start gap-2 text-red-300">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  );
}
