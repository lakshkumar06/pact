import { useState, useEffect } from 'react'

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

export default function TaskBar({ tasks: initial = [], onChange, projects = [], filterProjectId = null, onEdit }) {
  const [tasks, setTasks] = useState(initial)
  
  // Keep local tasks in sync when parent updates (e.g., modal added/edited a task)
  useEffect(() => {
    setTasks(initial)
  }, [initial])
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [projectId, setProjectId] = useState('')

  useEffect(() => {
    // initialize from prop or localStorage
    try {
      const persisted = JSON.parse(localStorage.getItem('cb_tasks') || 'null')
      if (persisted && persisted.length && tasks.length === 0) {
        setTasks(persisted)
        onChange?.(persisted)
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    localStorage.setItem('cb_tasks', JSON.stringify(tasks))
    onChange?.(tasks)
  }, [tasks])

  const addTask = () => {
    if (!title) return
    const proj = projects.find(p => p.id === projectId)
    const t = { id: uid(), title, due: due || null, completed: false, project_id: proj?.id || null, project_name: proj?.title || proj?.name || null }
    setTasks(prev => [t, ...prev])
    setTitle('')
    setDue('')
    setProjectId('')
  }

  const todayISO = new Date().toISOString().slice(0,10)
  // tasks to display in main list (respect filterProjectId if provided)
  const displayedTasks = tasks.filter(t => {
    if (!filterProjectId) return true
    return t.project_id === filterProjectId
  })

  // deadlines for selected project (only those with due)
  const projectDeadlines = tasks
    .filter(t => t.due && (!filterProjectId || t.project_id === filterProjectId))
    .slice()
    .sort((a,b) => new Date(a.due) - new Date(b.due))

  const toggle = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const remove = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const fmt = (d) => {
    if (!d) return ''
    try { return new Date(d).toLocaleDateString() } catch (e) { return d }
  }

  return (
  <div className="bg-white border border-gray-200 rounded-3xl p-4 w-full shadow-sm box-border overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-lg font-semibold">Tasks</h4>
          <div className="text-xs text-gray-500">{displayedTasks.length} tasks • {projectDeadlines.length} upcoming</div>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterProjectId || ''} onChange={(e) => {
            // parent may not control filter; we keep local only
          }} className="hidden" />
          <button onClick={() => { setTitle(''); setDue(''); setProjectId('') }} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-12 gap-2 items-center">
          <div className="col-span-7">
            <textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-1 focus:ring-teal-400 box-border resize-none" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
          </div>
          <div className="col-span-3">
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm box-border" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div className="col-span-2" />
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="w-48">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full border rounded-lg px-2 py-2 text-sm">
              <option value="">No project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title || p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <button onClick={addTask} className="inline-flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>
        </div>

  {/* Deadlines */}
  <div className="border-t border-gray-100 my-3" />
  <div>
          <h5 className="text-sm font-medium mb-2">Deadlines</h5>
          {projectDeadlines.length === 0 ? (
            <div className="text-sm text-gray-500">No upcoming deadlines</div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-auto box-border">
              {projectDeadlines.map(t => {
                const overdue = t.due && (t.due < todayISO) && !t.completed
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50 box-border overflow-hidden">
                    <div>
                      <div className={`text-sm font-medium ${t.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.title}</div>
                      <div className={`text-xs ${overdue ? 'text-red-500' : 'text-gray-500'}`}>{fmt(t.due)}</div>
                    </div>
                    <div className="text-xs text-teal-600">{t.project_name || ''}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

  {/* Tasks list */}
  <div className="border-t border-gray-100 my-3" />
  <div className="max-h-64 overflow-auto">
          {displayedTasks.length === 0 ? (
            <div className="text-sm text-gray-500">No tasks yet</div>
          ) : (
            <div className="space-y-2">
              {displayedTasks.map(t => {
                const overdue = t.due && (t.due < todayISO) && !t.completed
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-3 bg-white border border-gray-100 rounded-lg box-border overflow-hidden">
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggle(t.id)} className={`w-5 h-5 rounded-full border flex items-center justify-center ${t.completed ? 'bg-teal-600 text-white' : 'bg-white'}`}>
                        {t.completed && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div>
                        <div className={`text-sm ${t.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.title}</div>
                        <div className="flex items-center gap-2">
                          <div className={`text-xs ${overdue ? 'text-red-500' : 'text-gray-500'}`}>{t.due ? fmt(t.due) : 'No due date'}</div>
                          {t.project_name && <div className="text-xs text-teal-600">· {t.project_name}</div>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onEdit?.(t)} className="text-indigo-600 text-sm hover:underline">Edit</button>
                      <button onClick={() => remove(t.id)} className="text-red-500 text-sm hover:underline">Remove</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
