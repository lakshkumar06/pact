import { useState } from 'react'
import { CreateContractForm } from './CreateContractForm'

export function Dashboard({ contracts, onCreateContract, onRefresh, onSelectContract }) {
  const [showCreateContract, setShowCreateContract] = useState(false)

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
          className="w-14 h-14 rounded-full bg-teal-600 text-white hover:bg-teal-700 transition-all flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div className="bg-white border border-gray-200 rounded-3xl p-8 transition-all hover:border-teal-500/50 hover:shadow-lg">
          <div className="flex items-center gap-4 ">
            <svg className="w-8 h-8 text-teal-600" fill="none" strokeWidth={2} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Total</p>
              <p className="text-3xl font-semibold text-gray-900">{contracts.length}</p>
            </div>
          </div>
        
        </div>
        
        <div className="bg-white border border-gray-200 rounded-3xl p-8 transition-all hover:border-emerald-500/50 hover:shadow-lg">
          <div className="flex items-center gap-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" strokeWidth={2} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Active</p>
              <p className="text-3xl font-semibold text-gray-900">
                {contracts.filter(c => c.status === 'active').length}
              </p>
            </div>
          </div>
 
        </div>
        
        <div className="bg-white border border-gray-200 rounded-3xl p-8 transition-all hover:border-orange-500/50 hover:shadow-lg">
          <div className="flex items-center gap-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" strokeWidth={2} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Draft</p>
              <p className="text-3xl font-semibold text-gray-900">
                {contracts.filter(c => c.status === 'draft').length}
              </p>
            </div>
          </div>
       
        </div>
      </div>

      {/* Contracts Section */}
      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden">
        
        <div className="p-8">
          {contracts.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-32 h-32 mx-auto mb-6">
                <svg className="w-32 h-32 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No contracts yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">Get started by creating your first contract</p>
              <button
                onClick={() => setShowCreateContract(true)}
                className="w-16 h-16 rounded-full bg-teal-600 text-white hover:bg-teal-700 transition-all flex items-center justify-center mx-auto shadow-lg hover:shadow-xl hover:scale-105"
              >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
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
      </div>

      {showCreateContract && (
        <CreateContractForm 
          onCreate={onCreateContract} 
          onClose={() => setShowCreateContract(false)}
        />
      )}
    </div>
  )
}

