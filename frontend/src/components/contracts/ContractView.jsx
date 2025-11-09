import { ContractEditor } from '../ContractEditor'
import { ClausesView } from './ClausesView'
import { ChatbotView } from './ChatbotView'

export function ContractView({ contractId, contract, contractViewMode, setContractViewMode, onCreateVersion, currentUserId, versions, history }) {
  // Determine the content to show in raw view
  const getContentToShow = () => {
    // Check if there are any pending approval requests
    const hasPendingApprovals = versions && versions.some(v => v.approval_status !== 'merged')
    
    if (hasPendingApprovals && history && history.length > 0) {
      // Show the last merged version content
      return history[0].content
    }
    
    // Otherwise show current contract content
    return contract.content || ''
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Sub-tabs - Sticky */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <nav className="flex px-8" aria-label="Contract Tabs">
          <button
            onClick={() => setContractViewMode('raw')}
            className={`py-4 px-4 text-sm font-semibold border-b-2 transition-colors ${
              contractViewMode === 'raw'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Raw Contract
          </button>
          <button
            onClick={() => setContractViewMode('clauses')}
            className={`py-4 px-4 text-sm font-semibold border-b-2 transition-colors ${
              contractViewMode === 'clauses'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Interactive Clauses
          </button>
          <button
            onClick={() => setContractViewMode('chat')}
            className={`py-4 px-4 text-sm font-semibold border-b-2 transition-colors ${
              contractViewMode === 'chat'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            AI Chat
          </button>
        </nav>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {contractViewMode === 'raw' ? (
          <ContractEditor
            contractId={contractId}
            initialContent={getContentToShow()}
            onSave={onCreateVersion}
            currentUser={currentUserId}
          />
        ) : contractViewMode === 'clauses' ? (
          <ClausesView contractId={contractId} />
        ) : (
          <ChatbotView contractId={contractId} />
        )}
      </div>
    </div>
  )
}

