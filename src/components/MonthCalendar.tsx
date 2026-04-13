interface MonthCalendarProps {
  year: number;
  month: number; // 0-based
  trainedDays: Set<number>;
  selectedDay: number | null;
  onSelectDay: (day: number) => void;
  today: { year: number; month: number; day: number };
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function MonthCalendar({
  year,
  month,
  trainedDays,
  selectedDay,
  onSelectDay,
  today,
}: MonthCalendarProps) {
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const rawDay = firstDayOfMonth.getDay(); // 0=dom
  const startOffset = rawDay === 0 ? 6 : rawDay - 1; // lunes=0, domingo=6

  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - startOffset + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const isToday = (day: number) =>
    today.year === year && today.month === month && today.day === day;

  function cellClass(day: number): string {
    const base =
      'w-full aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-colors';
    const trained = trainedDays.has(day);
    const selected = selectedDay === day;

    if (trained && selected) return `${base} bg-primary-400 text-white ring-2 ring-primary-300`;
    if (trained) return `${base} bg-primary-500 text-white`;
    if (selected) return `${base} bg-slate-700 text-white`;
    if (isToday(day)) return `${base} text-white ring-1 ring-slate-600`;
    return `${base} text-slate-400`;
  }

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-semibold text-slate-500 py-1"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) =>
          day === null ? (
            <div key={`empty-${i}`} />
          ) : (
            <button
              key={day}
              onClick={() => onSelectDay(day)}
              className={cellClass(day)}
            >
              {day}
            </button>
          )
        )}
      </div>
    </div>
  );
}
