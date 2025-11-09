import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:3001/api'

export function ApprovalRequestsView({ contractId, versions, onSelectVersion, currentUserId, isCreator }) {
  const [approvals, setApprovals] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovals();
  }, [versions]);

  const loadApprovals = async () => {
    const approvalsMap = {};
    for (const version of versions) {
      try {
        const res = await axios.get(`${API_BASE}/contracts/${contractId}/versions/${version.id}/approvals`);
        approvalsMap[version.id] = res.data;
      } catch (error) {
        console.error('Error loading approvals:', error);
      }
    }
    setApprovals(approvalsMap);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
      <div className="p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Approval Requests</h2>
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : versions.length === 0 ? (
          <div className="rounded-3xl p-16 text-center">
            <div className="w-24 h-24 mx-auto mb-6">
              <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-400">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => {
              const versionApprovals = approvals[version.id];
              const approvalCount = versionApprovals?.approval_count || 0;
              const rejectionCount = versionApprovals?.rejection_count || 0;
              const status = version.approval_status || 'pending';

              return (
                <div 
                  key={version.id} 
                  className="border border-gray-200 rounded-2xl p-6 hover:border-teal-400 hover:shadow-md cursor-pointer transition-all group"
                  onClick={() => onSelectVersion(version)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-base font-semibold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">v{version.version_number}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                          'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                          {status}
                        </span>
                      </div>
                      <p className="text-gray-900 font-semibold group-hover:text-teal-700 transition-colors mb-2">{version.commit_message || 'No commit message'}</p>
                      <p className="text-sm text-gray-500">{version.author_name} • {new Date(version.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex flex-col gap-2 text-sm font-semibold">
                        <span className="text-emerald-600">✓ {approvalCount}</span>
                        <span className="text-red-600">✗ {rejectionCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  )
}

