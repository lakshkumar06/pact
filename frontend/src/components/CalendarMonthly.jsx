import { useState, useMemo } from 'react'

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}

function daysInMonth(date) {
  const start = startOfMonth(date)
  const next = addMonths(start, 1)
  const diff = (next - start) / (1000 * 60 * 60 * 24)
  return diff
}

export default function CalendarMonthly({ tasks = [], onDayClick }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))

  const monthDays = useMemo(() => {
    const firstWeekday = startOfMonth(cursor).getDay() // 0..6 (Sun..Sat)
    const total = daysInMonth(cursor)
    const cells = []
    // previous month padding
    for (let i = 0; i < firstWeekday; i++) cells.push(null)
    for (let d = 1; d <= total; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d))
    // pad end to complete full weeks
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [cursor])

  const tasksByDate = useMemo(() => {
    const map = new Map()
    for (const t of tasks) {
      if (!t.due) continue
      const d = new Date(t.due).toISOString().slice(0, 10)
      if (!map.has(d)) map.set(d, [])
      map.get(d).push(t)
    }
    return map
  }, [tasks])

  const monthLabel = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{monthLabel}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(addMonths(cursor, -1))}
            className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
          >Prev</button>
          <button
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
          >Today</button>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200"
          >Next</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-sm">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center text-xs text-gray-500">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 mt-2">
        {monthDays.map((dt, idx) => {
          if (!dt) return <div key={idx} className="h-20 bg-transparent" />
          const iso = dt.toISOString().slice(0, 10)
          const hasTasks = tasksByDate.has(iso)
          const isToday = (new Date().toISOString().slice(0,10) === iso)
          return (
            <button
              key={iso}
              onClick={() => onDayClick?.(dt)}
              className={`h-28 p-2 text-left rounded-md border ${isToday ? 'border-teal-400 bg-teal-50' : 'border-transparent hover:border-gray-200'} flex flex-col justify-start`}
            >
              <div className="flex items-start justify-between">
                <div className="text-sm font-medium text-gray-700">{dt.getDate()}</div>
                {hasTasks && (
                  <div className="ml-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-teal-600" />
                  </div>
                )}
              </div>
              <div className="mt-1 text-xs text-gray-700 space-y-1">
                {hasTasks ? (
                  tasksByDate.get(iso).slice(0,2).map((t) => {
                    const overdue = t.due && (t.due < new Date().toISOString().slice(0,10)) && !t.completed
                    return (
                      <div key={t.id} className="truncate">
                        <span className={`font-medium ${overdue ? 'text-red-600' : ''}`}>{t.title}</span>
                        {t.project_name && <span className="ml-2 text-xs text-teal-600">· {t.project_name}</span>}
                      </div>
                    )
                  })
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
