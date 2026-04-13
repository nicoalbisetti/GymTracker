import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllSessions } from '@/services/historyService';
import MonthCalendar from '@/components/MonthCalendar';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function formatDuration(startedAt: string, finishedAt?: string): string | null {
  if (!finishedAt) return null;
  const mins = Math.round(
    (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000
  );
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

export default function HistoryPage() {
  const navigate = useNavigate();

  const now = new Date();
  const [viewYear, setViewYear] = useState(() => now.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const today = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  const isCurrentMonth = viewYear === today.year && viewMonth === today.month;

  const sessions = useLiveQuery(() => getAllSessions());

  const sessionsInMonth = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter((s) => {
      const d = new Date(s.startedAt);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    });
  }, [sessions, viewYear, viewMonth]);

  const trainedDays = useMemo(() => {
    const days = new Set<number>();
    for (const s of sessionsInMonth) {
      if (s.finishedAt) days.add(new Date(s.startedAt).getDate());
    }
    return days;
  }, [sessionsInMonth]);

  const sessionsOnSelectedDay = useMemo(() => {
    if (selectedDay === null) return [];
    return sessionsInMonth
      .filter((s) => new Date(s.startedAt).getDate() === selectedDay)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  }, [sessionsInMonth, selectedDay]);

  function goToPrevMonth() {
    setSelectedDay(null);
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    setSelectedDay(null);
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  function handleSelectDay(day: number) {
    setSelectedDay((prev) => (prev === day ? null : day));
  }

  const selectedDayLabel = selectedDay !== null
    ? (() => {
        const d = new Date(viewYear, viewMonth, selectedDay);
        const rawDay = d.getDay();
        const dayName = DAY_NAMES[rawDay === 0 ? 6 : rawDay - 1];
        return `${dayName} ${selectedDay}`;
      })()
    : null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold text-white tracking-tight pt-2">Historial</h1>

      {/* Navegación de mes */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded-xl text-slate-400 active:bg-slate-800"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-base font-semibold text-white">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={goToNextMonth}
          className={`p-2 rounded-xl transition-colors ${
            isCurrentMonth
              ? 'text-slate-700 cursor-default'
              : 'text-slate-400 active:bg-slate-800'
          }`}
          disabled={isCurrentMonth}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendario */}
      <MonthCalendar
        year={viewYear}
        month={viewMonth}
        trainedDays={trainedDays}
        selectedDay={selectedDay}
        onSelectDay={handleSelectDay}
        today={today}
      />

      {/* Sesiones del día seleccionado */}
      {selectedDay !== null && (
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-sm font-semibold text-slate-400 px-1">
            {selectedDayLabel}
          </p>
          {sessionsOnSelectedDay.length === 0 ? (
            <p className="text-sm text-slate-500 px-1">
              Sin sesiones finalizadas este día
            </p>
          ) : (
            sessionsOnSelectedDay.map((session) => (
              <button
                key={session.id}
                onClick={() => navigate(`/history/${session.id}`)}
                className="w-full bg-slate-800 border border-slate-700/50 rounded-2xl p-4 text-left active:bg-slate-700/50"
              >
                <p className="font-semibold text-white">{session.routineName}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-400">
                    {new Date(session.startedAt).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {formatDuration(session.startedAt, session.finishedAt) && (
                    <span className="text-xs text-slate-500">
                      · {formatDuration(session.startedAt, session.finishedAt)}
                    </span>
                  )}
                  {!session.finishedAt && (
                    <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 rounded-full">
                      Incompleta
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Estado vacío del mes */}
      {sessionsInMonth.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500">Sin entrenamientos este mes</p>
        </div>
      )}
    </div>
  );
}
