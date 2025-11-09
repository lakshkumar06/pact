export function VersionHistoryView({ contractId, history, onSelectVersion }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
      <div className="p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Version History</h2>
        {history.length === 0 ? (
          <div className="rounded-3xl p-16 text-center">
            <div className="w-24 h-24 mx-auto mb-6">
              <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-400">No version history</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((version) => (
              <div 
                key={version.id} 
                className="border border-gray-200 rounded-2xl p-6 hover:border-teal-400 hover:shadow-md cursor-pointer transition-all group"
                onClick={() => onSelectVersion(version)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                    <svg className="w-5 h-5 text-teal-600" fill="none" strokeWidth={2} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-gray-900 font-semibold group-hover:text-teal-700 transition-colors">{version.commit_message || 'No commit message'}</p>
                        <p className="text-sm text-gray-500 mt-1">{version.author_name} • {new Date(version.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="px-3 py-1 text-sm font-semibold text-teal-600 bg-teal-50 rounded-full">v{version.version_number}</span>
                    </div>
                    
                    {/* On-chain proof section */}
                    <div className="pt-3 border-t border-gray-100">
                      {version.onchain_tx_hash ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-600">Verified on-chain</span>
                          </div>
                          <a
                            href={`https://explorer.solana.com/tx/${version.onchain_tx_hash}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Proof
                          </a>
                        </div>
                      ) : version.contract_hash ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-600">Hash generated, on-chain storage pending</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-500">Not yet verified</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

