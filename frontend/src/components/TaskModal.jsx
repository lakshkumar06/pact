import React, { useState, useEffect } from 'react'

export default function TaskModal({ open, onClose, onSave, initial = null, date = null, projects = [] }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [due, setDue] = useState(initial?.due || (date ? date.toISOString().slice(0,10) : ''))
  const [projectId, setProjectId] = useState(initial?.project_id || '')

  useEffect(() => {
    if (open) {
      setTitle(initial?.title || '')
      setDescription(initial?.description || '')
      setDue(initial?.due || (date ? date.toISOString().slice(0,10) : ''))
      setProjectId(initial?.project_id || '')
    }
  }, [open, initial, date])

  if (!open) return null

  const handleSave = () => {
    if (!title) return
    const proj = projects.find(p => p.id === projectId)
    const payload = {
      id: initial?.id,
      title,
      description,
      due: due || null,
      project_id: proj?.id || null,
      project_name: proj?.title || proj?.name || null,
      completed: initial?.completed || false
    }
    onSave?.(payload)
    onClose?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{initial ? 'Edit task' : 'Add task'}</h3>
          <button onClick={onClose} className="text-sm text-gray-500">Close</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-600">Title</label>
            <input className="w-full border rounded px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-gray-600">Description</label>
            <textarea className="w-full border rounded px-3 py-2 h-28 resize-none" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Due</label>
              <input type="date" className="w-full border rounded px-3 py-2" value={due || ''} onChange={e => setDue(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Project</label>
              <select className="w-full border rounded px-2 py-2" value={projectId || ''} onChange={e => setProjectId(e.target.value)}>
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title || p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button onClick={onClose} className="px-4 py-2 rounded-md border">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 rounded-md bg-indigo-600 text-white">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}
