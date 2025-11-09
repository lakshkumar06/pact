import { useState } from 'react'
import { ReputationScore } from '../ReputationScore'

export function MembersView({ contract, members, invitations, isCreator, onInvite, onCreateVersion }) {
  const [activeTab, setActiveTab] = useState('members')
  
  // Filter out accepted invitations
  const pendingInvitations = invitations.filter(inv => inv.status !== 'accepted')
  
  return (
    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex px-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-4 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Members ({members.length})
          </button>
          {isCreator && (
            <button
              onClick={() => setActiveTab('invitations')}
              className={`py-4 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'invitations'
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Invitations ({pendingInvitations.length})
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-8">
        {activeTab === 'members' ? (
          <div>
            {members.length === 0 ? (
              <div className="rounded-3xl p-16 text-center">
                <div className="w-24 h-24 mx-auto mb-6">
                  <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-400">No members yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {members.map(member => {
                  // Determine which reputation to show based on member's role
                  const memberRole = member.role_in_contract?.toLowerCase();
                  const showReputationRole = memberRole === 'client' ? 'client' : memberRole === 'vendor' ? 'vendor' : null;
                  
                  return (
                    <div key={member.id} className="border border-gray-200 rounded-2xl p-6 hover:border-teal-300 hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center transition-colors shrink-0">
                            <span className="text-lg font-medium text-teal-600">{member.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 transition-colors">{member.name}</p>
                            <p className="text-sm text-gray-600 mt-0.5 capitalize">{member.role_in_contract}</p>
                            {member.email && (
                              <p className="text-xs text-gray-500 mt-1">{member.email}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Reputation Score */}
                        {showReputationRole && (
                          <div className="shrink-0">
                            <ReputationScore 
                              userId={member.user_id} 
                              roleType={showReputationRole}
                              compact={true}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            {pendingInvitations.length === 0 ? (
              <div className="rounded-3xl p-16 text-center">
                <div className="w-24 h-24 mx-auto mb-6">
                  <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-400">No pending invitations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingInvitations.map(invitation => (
                  <div key={invitation.id} className="p-6 border border-gray-200 rounded-2xl hover:border-teal-400 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                          {invitation.email || invitation.wallet_address?.slice(0, 8) + '...'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{invitation.role_in_contract}</p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                        invitation.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        invitation.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        invitation.status === 'declined' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {invitation.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

