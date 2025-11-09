import { useState, useEffect } from 'react'
import { CreateContractForm } from './CreateContractForm'
import CalendarMonthly from './CalendarMonthly'
import TaskBar from './TaskBar'
import TaskModal from './TaskModal'

export function Dashboard({ user, contracts, onCreateContract, onRefresh, onSelectContract }) {
  const [showCreateContract, setShowCreateContract] = useState(false)
  // Tasks state (persisted to localStorage)
  const [tasks, setTasks] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDate, setModalDate] = useState(null)
  const [editingTask, setEditingTask] = useState(null)

  useEffect(() => {
    try {
      const persisted = JSON.parse(localStorage.getItem('cb_tasks') || 'null')
      if (persisted && Array.isArray(persisted)) setTasks(persisted)
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('cb_tasks', JSON.stringify(tasks))
  }, [tasks])

  function uid() {
    return Math.random().toString(36).slice(2,9)
  }

  const handleSaveFromModal = (payload) => {
    if (payload.id) {
      // update existing
      setTasks(prev => prev.map(t => t.id === payload.id ? { ...t, ...payload } : t))
    } else {
      const t = { ...payload, id: uid() }
      setTasks(prev => [t, ...prev])
    }
  }

  return (
    <div className="space-y-10 pt-8 pb-16 px-[5vw] md:px-[10vw]">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900 tracking-tight mt-[2em]">Welcome back</h1>
          <p className="text-gray-500 mt-2">Here's what's happening</p>
        </div>
        <button
          onClick={() => setShowCreateContract(true)}
          className="w-14 h-14 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left column: compact stats card + TaskBar + Google Calendar */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-3xl p-4 transition-all hover:shadow-lg">
            <div className="grid grid-cols-3 gap-4 text-center items-center">
              <div>
                <div className="flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-teal-600" fill="none" strokeWidth={2} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-semibold text-gray-900">{contracts.length}</p>
              </div>

              <div>
                <div className="flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" strokeWidth={2} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500">Active</p>
                <p className="text-lg font-semibold text-gray-900">{contracts.filter(c => c.status === 'active').length}</p>
              </div>

              <div>
                <div className="flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-orange-600" fill="none" strokeWidth={2} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500">Draft</p>
                <p className="text-lg font-semibold text-gray-900">{contracts.filter(c => c.status === 'draft').length}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <TaskBar tasks={tasks} onChange={(ts) => setTasks(ts)} projects={contracts} onEdit={(t) => {
              setEditingTask(t)
              setModalOpen(true)
            }} />

            <div className="bg-white border border-gray-200 rounded-3xl p-4">
              <h4 className="font-semibold mb-2">Google Calendar</h4>
              <p className="text-sm text-gray-500 mb-2">Dashboard calendar: user calendar preferred, otherwise global <code className="bg-gray-100 px-1 py-0.5 rounded">VITE_GOOGLE_CALENDAR_ID</code>.</p>
              { (user?.google_calendar_id || import.meta.env.VITE_GOOGLE_CALENDAR_ID) ? (
                  <div className="w-full h-96 overflow-hidden rounded-md">
                  <iframe
                    title="Google Calendar"
                    src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(user?.google_calendar_id || import.meta.env.VITE_GOOGLE_CALENDAR_ID)}&ctz=UTC`}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="text-sm text-gray-500">No calendar configured. Users can add a Google Calendar ID in their profile settings or set a global `VITE_GOOGLE_CALENDAR_ID` in `.env`.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: projects on top, calendar + tasks below */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contracts Section (moved to top of right column) */}
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden p-6">
            {contracts.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-24 h-24 mx-auto mb-4">
                  <svg className="w-24 h-24 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No contracts yet</h3>
                <p className="text-gray-500 mb-4 max-w-md mx-auto">Get started by creating your first contract</p>
                <button
                  onClick={() => setShowCreateContract(true)}
                  className="w-14 h-14 rounded-full bg-teal-600 text-white hover:bg-teal-700 transition-all flex items-center justify-center mx-auto shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {contracts.map(contract => (
                  <div 
                    key={contract.id} 
                    className="border border-gray-200 rounded-2xl p-6 cursor-pointer transition-all hover:border-teal-400 hover:shadow-md group" 
                    onClick={() => onSelectContract(contract)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <svg className="w-6 h-6 text-teal-600 group-hover:scale-110 transition-transform" fill="none" strokeWidth={2} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 group-hover:text-teal-700 transition-colors text-lg mb-1 truncate">
                              {contract.title}
                            </h4>
                            <p className="text-sm text-gray-500 truncate">{contract.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-15">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            contract.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            contract.status === 'draft' ? 'bg-orange-100 text-orange-700' :
                            contract.status === 'review' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {contract.status}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-gray-500">
                            <svg className="w-4 h-4" fill="none" strokeWidth={2} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {contract.member_count}
                          </span>
                        </div>
                      </div>
                      <svg className="w-6 h-6 text-gray-300 group-hover:text-teal-600 transition-colors shrink-0 ml-4" fill="none" strokeWidth={2.5} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calendar Section (full width under projects) */}
          <div className="mt-6">
                <CalendarMonthly tasks={tasks} onDayClick={(d) => {
                  setModalDate(d)
                  setEditingTask(null)
                  setModalOpen(true)
                }} />
          </div>
        </div>
      </div>

      {showCreateContract && (
        <CreateContractForm 
          onCreate={onCreateContract} 
          onClose={() => setShowCreateContract(false)}
        />
      )}
      <TaskModal open={modalOpen} onClose={() => { setModalOpen(false); setEditingTask(null); }} onSave={handleSaveFromModal} initial={editingTask} date={modalDate} projects={contracts} />
    </div>
  )
}

