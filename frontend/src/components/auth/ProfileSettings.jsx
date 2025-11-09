import { useState } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

function LinkRow({ link, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-center">
      <input className="flex-1 border rounded-md p-2" placeholder="Label (e.g. LinkedIn)" value={link.label} onChange={(e) => onChange({ ...link, label: e.target.value })} />
      <input className="flex-1 border rounded-md p-2" placeholder="https://..." value={link.url} onChange={(e) => onChange({ ...link, url: e.target.value })} />
      <button onClick={onRemove} className="text-red-500">Remove</button>
    </div>
  )
}

export default function ProfileSettings({ user, onClose, onSave }) {
  const [bio, setBio] = useState(user?.profile_description || '')
  const [googleCalendarId, setGoogleCalendarId] = useState(user?.google_calendar_id || '')
  const [links, setLinks] = useState(user?.profile_links || [])
  const [saving, setSaving] = useState(false)

  const addLink = () => setLinks(prev => [...prev, { label: '', url: '' }])
  const updateLink = (idx, l) => setLinks(prev => prev.map((it, i) => i === idx ? l : it))
  const removeLink = (idx) => setLinks(prev => prev.filter((_, i) => i !== idx))

  const save = async () => {
    setSaving(true)
    try {
      const res = await axios.patch(`${API_BASE}/auth/profile`, {
        profile_description: bio,
        google_calendar_id: googleCalendarId || null,
        profile_links: links
      })
      onSave?.(res.data.user)
      onClose?.()
    } catch (err) {
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white rounded-md shadow-lg p-6 w-full max-w-lg z-10">
        <h3 className="text-lg font-semibold mb-3">Profile Settings</h3>

        <label className="block text-sm text-gray-600 mb-1">Bio / Profile Description</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="w-full border rounded-md p-2 mb-3" />

        <label className="block text-sm text-gray-600 mb-1">Google Calendar ID (public or connected)</label>
        <input value={googleCalendarId} onChange={(e) => setGoogleCalendarId(e.target.value)} className="w-full border rounded-md p-2 mb-3" placeholder="your_calendar_id@group.calendar.google.com" />

        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-gray-600">Profile Links (e.g. LinkedIn)</label>
            <button onClick={addLink} className="text-sm text-teal-600">Add link</button>
          </div>
          <div className="space-y-2">
            {links.length === 0 ? (
              <div className="text-sm text-gray-500">No links yet</div>
            ) : (
              links.map((l, i) => (
                <LinkRow key={i} link={l} onChange={(v) => updateLink(i, v)} onRemove={() => removeLink(i)} />
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded-md">Cancel</button>
          <button onClick={save} disabled={saving} className="px-3 py-1 bg-teal-600 text-white rounded-md">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}
