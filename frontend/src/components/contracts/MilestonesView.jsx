import { useState, useEffect } from 'react'
import axios from 'axios'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
  initializeEscrowMilestone,
  markMilestoneComplete,
  approveMilestoneRelease,
  releaseEscrowFunds,
  cancelEscrowMilestone,
  fetchContractEscrowMilestones,
} from '../../solana/escrow'
import { initializeContract } from '../../solana/client'

const API_BASE = 'http://localhost:3001/api'

export function MilestonesView({ contractId, contract, currentUser, isCreator }) {
  const wallet = useWallet()
  const [suggestions, setSuggestions] = useState([])
  const [onChainMilestones, setOnChainMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingMilestone, setProcessingMilestone] = useState(null)
  const [showSetupForm, setShowSetupForm] = useState(null)
  const [initializingContract, setInitializingContract] = useState(false)
  const [contractStatus, setContractStatus] = useState(null)

  useEffect(() => {
    loadMilestones()
  }, [contractId, contract?.solana_contract_id, contract?.solana_contract_pda])

  const loadMilestones = async () => {
    try {
      // Load AI suggestions from database
      const suggestionsRes = await axios.get(`${API_BASE}/contracts/${contractId}/milestone-suggestions`)
      setSuggestions(suggestionsRes.data.milestones || [])

      // Load on-chain escrow milestones if contract has Solana contract ID
      if (contract?.solana_contract_id) {
        const chainMilestones = await fetchContractEscrowMilestones(contract.solana_contract_id.toString())
        setOnChainMilestones(chainMilestones)
        
        // Fetch contract status from chain
        try {
          const { fetchContractByPDA, fetchContractData } = await import('../../solana/client')
          const onChainContract = contract.solana_contract_pda
            ? await fetchContractByPDA(contract.solana_contract_pda)
            : await fetchContractData(contract.solana_contract_id.toString())
          
          if (onChainContract) {
            setContractStatus(onChainContract.status)
          }
        } catch (error) {
          console.error('Error fetching contract status:', error)
        }
      }
    } catch (error) {
      console.error('Error loading milestones:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInitializeContract = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      alert('Please connect your wallet first')
      return
    }

    if (!isCreator) {
      alert('Only the contract creator can initialize the Solana contract')
      return
    }

    setInitializingContract(true)
    try {
      // Check if contract is already initialized
      if (contract.solana_contract_id) {
        alert('This contract is already initialized on Solana!')
        setInitializingContract(false)
        return
      }
      
      // Generate a deterministic contract ID from database contract ID (must match contract.ts)
      const encoder = new TextEncoder()
      const data = encoder.encode(contractId)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashBytes = new Uint8Array(hashBuffer).slice(0, 8)
      
      // Convert to number string
      const solanaContractId = hashBytes.reduce((acc, byte, i) => 
        acc + BigInt(byte) * (BigInt(256) ** BigInt(i)), BigInt(0)
      ).toString()
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🔍 NEW CONTRACT INITIALIZATION')
      console.log('Contract UUID:', contractId)
      console.log('Numeric ID:', solanaContractId)
      console.log('Your Wallet:', wallet.publicKey.toString())
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      // Fetch contract members from backend
      const membersRes = await axios.get(`${API_BASE}/contracts/${contractId}/members`)
      const members = membersRes.data.members || []
      
      // Get all participant wallet addresses
      const participantAddresses = [wallet.publicKey] // Always include creator
      
      // Add other members if they have wallet addresses
      for (const member of members) {
        if (member.wallet_address && member.wallet_address !== wallet.publicKey.toBase58()) {
          try {
            const memberPubkey = new PublicKey(member.wallet_address)
            participantAddresses.push(memberPubkey)
          } catch (e) {
            console.warn(`Invalid wallet address for member: ${member.name}`)
          }
        }
      }
      
      // Remove duplicates
      const participants = Array.from(new Set(participantAddresses.map(p => p.toBase58())))
        .map(addr => new PublicKey(addr))
      
      const requiredApprovals = participants.length // All must approve
      
      if (participants.length > 10) {
        alert('Too many participants (max 10). Please reduce the number of contract members.')
        return
      }
      
      console.log('Participants:', participants.length)
      
      // Get contract content from backend to upload to IPFS
      const contractRes = await axios.get(`${API_BASE}/contracts/${contractId}`)
      const contractContent = contractRes.data.contract.content || `# ${contract.title}\n\n${contract.description || ''}`
      
      // Import functions
      const { initializeContractOnChain, fetchContractFromChain } = await import('../../solana/contract')
      const { getContractPDA } = await import('../../solana/client')
      
      // Derive the PDA to check if it exists (pass as string to handle large numbers)
      const expectedPDA = getContractPDA(solanaContractId, wallet.publicKey)
      
      // Check if contract already exists on-chain
      let signature, contractPDA, ipfsHash
      
      console.log('Expected PDA:', expectedPDA.toString())
      const existingContract = await fetchContractFromChain(expectedPDA.toString())
      
      if (existingContract) {
        // Contract already exists, just update database
        console.log('✓ Contract already exists on-chain, updating database...')
        signature = 'already-initialized'
        contractPDA = expectedPDA.toString()
        ipfsHash = existingContract.ipfsHash || ''
        
        alert(`Contract already initialized on Solana!\n\nUpdating database with existing contract.\n\nPDA: ${contractPDA}`)
      } else {
        // Initialize on Solana with IPFS upload
        console.log('Contract does not exist, initializing on Solana...')
        const result = await initializeContractOnChain(
          window.solana,
          contractId,
          contractContent,
          participants.map(p => p.toBase58()),
        requiredApprovals
      )
        signature = result.signature
        contractPDA = result.contractPDA
        ipfsHash = result.ipfsHash
        
        alert(`✅ Contract initialized on Solana!\n\nTransaction: ${signature}\nPDA: ${contractPDA}`)
      }

      // Store the Solana contract ID in database
      await axios.post(`${API_BASE}/contracts/${contractId}/solana-init`, {
        solana_contract_id: solanaContractId,
        signature: signature,
        contract_pda: contractPDA,
        ipfs_hash: ipfsHash
      })
      
      // Refresh the page to reload contract data
      window.location.reload()
    } catch (error) {
      console.error('Error initializing contract:', error)
      
      // Check if transaction was already processed
      if (error.message?.includes('already been processed') || 
          error.message?.includes('already exists')) {
        alert('⚠️ This contract PDA already exists on Solana.\n\nThe contract was likely initialized successfully but the database wasn\'t updated.\n\nPlease reload the page. If the issue persists, contact support for manual recovery.')
      } else if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        alert('⚠️ Solana RPC rate limit reached.\n\nPlease wait 30 seconds and try again.')
      } else {
        alert(`❌ Failed to initialize contract:\n\n${error.message || 'Unknown error'}\n\nPlease ensure:\n• Your wallet is connected\n• You have enough SOL (~0.01 SOL)\n• You're on Solana Devnet`)
      }
    } finally {
      setInitializingContract(false)
    }
  }

  const handleSetupEscrow = async (suggestion) => {
    if (!wallet.connected || !wallet.publicKey) {
      alert('Please connect your wallet first')
      return
    }

    setProcessingMilestone(suggestion.id)
    try {
      const solForm = document.getElementById(`escrow-form-${suggestion.id}`)
      const formData = new FormData(solForm)
      
      const amountInSol = parseFloat(formData.get('amount'))
      const recipientAddress = formData.get('recipient')
      const description = formData.get('description') || suggestion.description
      const deadline = formData.get('deadline')
      
      if (!amountInSol || amountInSol <= 0) {
        alert('Please enter a valid amount in SOL')
        return
      }

      if (!recipientAddress) {
        alert('Please enter recipient wallet address')
        return
      }

      // Validate recipient is a valid Solana address
      try {
        new PublicKey(recipientAddress)
      } catch (e) {
        alert('Invalid Solana wallet address')
        return
      }

      // Check if contract is initialized on Solana
      if (!contract.solana_contract_id) {
        alert('This contract needs to be initialized on Solana first. Please contact the contract creator to initialize the Solana contract.')
        return
      }

      const deadlineTimestamp = deadline ? new Date(deadline).getTime() / 1000 : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

      // Fetch contract creator from on-chain data (prefer PDA)
      const { fetchContractByPDA, fetchContractData } = await import('../../solana/client')
      const onChainContract = contract.solana_contract_pda
        ? await fetchContractByPDA(contract.solana_contract_pda)
        : await fetchContractData(contract.solana_contract_id.toString())
      
      if (!onChainContract) {
        alert('❌ Contract not found on Solana blockchain!\n\nThis means:\n• The contract was not successfully initialized\n• Database shows it should exist but Solana doesn\'t have it\n\nPlease click "Initialize on Solana" button first to create the contract on-chain.')
        return
      }

      // Check contract status
      const contractStatus = onChainContract.status
      const isCancelled = contractStatus?.cancelled !== undefined
      const isActive = contractStatus?.active !== undefined
      const isCompleted = contractStatus?.completed !== undefined

      if (isCancelled) {
        alert('❌ Cannot create escrow for a cancelled contract.\n\nThe contract has been cancelled and escrow milestones cannot be created.')
        return
      }

      if (!isActive && !isCompleted) {
        alert(`❌ Contract is in an invalid state for escrow creation.\n\nContract status: ${JSON.stringify(contractStatus)}\n\nPlease contact support if this issue persists.`)
        return
      }

      const contractCreator = onChainContract.creator

      // Refresh on-chain milestones to get the latest count
      const latestMilestones = await fetchContractEscrowMilestones(contract.solana_contract_id.toString())
      
      // Get next milestone ID (use timestamp to ensure uniqueness)
      const milestoneId = Date.now()
      
      // Check if this milestone ID already exists
      const existingMilestone = latestMilestones.find(m => m.milestoneId.toNumber() === milestoneId)
      if (existingMilestone) {
        alert('This milestone already exists on-chain. Please refresh the page to see it.')
        await loadMilestones()
        return
      }

      const { signature, escrowPDA } = await initializeEscrowMilestone(
        wallet,
        contract.solana_contract_id.toString(),
        milestoneId,
        description,
        amountInSol,
        recipientAddress,
        deadlineTimestamp,
        contractCreator,
        contract.solana_contract_pda || undefined
      )

      // Update suggestion in database
      await axios.put(`${API_BASE}/milestone-suggestions/${suggestion.id}`, {
        synced_to_chain: true,
        escrow_pda: escrowPDA.toBase58(),
        milestone_id: milestoneId,
      })

      alert(`Escrow set up successfully! Transaction: ${signature}`)
      setShowSetupForm(null)
      await loadMilestones()
    } catch (error) {
      console.error('Error setting up escrow:', error)
      
      // Check if transaction was already processed
      if (error.message?.includes('already been processed')) {
        alert('This milestone may have already been created. Refreshing to check...')
        await loadMilestones()
        setShowSetupForm(null)
      } else if (error.message?.includes('ContractNotActive') || error.message?.includes('Contract is not active')) {
        // Fetch contract status to provide better error message
        try {
          const { fetchContractByPDA, fetchContractData } = await import('../../solana/client')
          const onChainContract = contract.solana_contract_pda
            ? await fetchContractByPDA(contract.solana_contract_pda)
            : await fetchContractData(contract.solana_contract_id.toString())
          
          if (onChainContract) {
            const status = onChainContract.status
            let statusText = 'Unknown'
            if (status?.active) statusText = 'Active'
            else if (status?.completed) statusText = 'Completed'
            else if (status?.cancelled) statusText = 'Cancelled'
            
            alert(`❌ Cannot create escrow: Contract is ${statusText}.\n\nEscrow can only be created for Active or Completed contracts.\n\nCurrent status: ${statusText}\n\nIf the contract is cancelled, escrow cannot be created.`)
          } else {
            alert(`Failed to set up escrow: Contract is not active or completed.\n\nError: ${error.message}`)
          }
        } catch (fetchError) {
          alert(`Failed to set up escrow: ${error.message}\n\nThis may happen if the contract is cancelled or in an invalid state.`)
        }
      } else {
        alert(`Failed to set up escrow: ${error.message}`)
      }
    } finally {
      setProcessingMilestone(null)
    }
  }

  const handleMarkComplete = async (milestone) => {
    if (!wallet.connected || !wallet.publicKey) {
      alert('Please connect your wallet first')
      return
    }

    setProcessingMilestone(milestone.milestoneId.toString())
    try {
      // Ensure user has reputation account
      const { ensureReputationExists } = await import('../../solana/reputation')
      await ensureReputationExists(wallet)
      
      // Fetch contract creator from on-chain data (prefer PDA)
      const { fetchContractByPDA, fetchContractData } = await import('../../solana/client')
      const onChainContract = contract.solana_contract_pda
        ? await fetchContractByPDA(contract.solana_contract_pda)
        : await fetchContractData(contract.solana_contract_id.toString())
      
      if (!onChainContract) {
        alert('Unable to fetch contract from blockchain.')
        return
      }
      
      const signature = await markMilestoneComplete(
        wallet,
        contract.solana_contract_id.toString(),
        milestone.milestoneId.toNumber(),
        onChainContract.creator,
        contract.solana_contract_pda || undefined
      )

      
      // Auto-approve for the user who marked it complete
      try {
        const approveSignature = await approveMilestoneRelease(
          wallet,
          contract.solana_contract_id.toString(),
          milestone.milestoneId.toNumber(),
          onChainContract.creator,
          contract.solana_contract_pda || undefined
        )
        
        alert(`Milestone marked complete! Transactions: ${signature.slice(0, 8)}... & ${approveSignature.slice(0, 8)}...`)
      } catch (approveError) {
        console.warn('Auto-approve failed:', approveError)
        alert(`Milestone marked complete! Transaction: ${signature}\n\nNote: Please click "Approve Release" to approve.`)
      }
      
      await loadMilestones()
      
      // Check if we can auto-release
      const updatedMilestones = await fetchContractEscrowMilestones(contract.solana_contract_id.toString())
      const updatedMilestone = updatedMilestones.find(m => m.milestoneId.eq(milestone.milestoneId))
      
      if (updatedMilestone && updatedMilestone.approvals.length >= updatedMilestone.approvalsRequired) {
        // All approvals met, auto-release!
        await handleReleaseFunds(updatedMilestone)
      }
    } catch (error) {
      console.error('Error marking milestone complete:', error)
      alert(`Failed to mark milestone complete: ${error.message}`)
    } finally {
      setProcessingMilestone(null)
    }
  }

  const handleApprove = async (milestone) => {
    if (!wallet.connected || !wallet.publicKey) {
      alert('Please connect your wallet first')
      return
    }

    setProcessingMilestone(milestone.milestoneId.toString())
    try {
      // Ensure user has reputation account
      const { ensureReputationExists } = await import('../../solana/reputation')
      await ensureReputationExists(wallet)
      
      // Fetch contract creator from on-chain data (prefer PDA)
      const { fetchContractByPDA, fetchContractData } = await import('../../solana/client')
      const onChainContract = contract.solana_contract_pda
        ? await fetchContractByPDA(contract.solana_contract_pda)
        : await fetchContractData(contract.solana_contract_id.toString())
      
      if (!onChainContract) {
        alert('Unable to fetch contract from blockchain.')
        return
      }
      
      const signature = await approveMilestoneRelease(
        wallet,
        contract.solana_contract_id.toString(),
        milestone.milestoneId.toNumber(),
        onChainContract.creator,
        contract.solana_contract_pda || undefined
      )

      alert(`Milestone approved! Transaction: ${signature}`)
      
      // Check if we can release funds
      await loadMilestones()
      
      // Auto-release if threshold met
      const updatedMilestones = await fetchContractEscrowMilestones(contract.solana_contract_id.toString())
      const updatedMilestone = updatedMilestones.find(m => m.milestoneId.eq(milestone.milestoneId))
      
      if (updatedMilestone && updatedMilestone.approvals.length >= updatedMilestone.approvalsRequired) {
        await handleReleaseFunds(updatedMilestone)
      }
    } catch (error) {
      console.error('Error approving milestone:', error)
      alert(`Failed to approve milestone: ${error.message}`)
    } finally {
      setProcessingMilestone(null)
    }
  }

  const handleReleaseFunds = async (milestone) => {
    if (!wallet.connected || !wallet.publicKey) {
      alert('Please connect your wallet first')
      return
    }

    setProcessingMilestone(milestone.milestoneId.toString())
    try {
      const signature = await releaseEscrowFunds(
        wallet,
        contract.solana_contract_id.toString(),
        milestone.milestoneId.toNumber(),
        milestone.recipient.toBase58()
      )

      alert(`Escrow funds released! Transaction: ${signature}`)
      await loadMilestones()
    } catch (error) {
      console.error('Error releasing funds:', error)
      alert(`Failed to release funds: ${error.message}`)
    } finally {
      setProcessingMilestone(null)
    }
  }

  const handleCancelEscrow = async (milestone) => {
    if (!confirm('Are you sure you want to cancel this escrow? Funds will be refunded.')) {
      return
    }

    setProcessingMilestone(milestone.milestoneId.toString())
    try {
      const signature = await cancelEscrowMilestone(
        wallet,
        contract.solana_contract_id.toString(),
        milestone.milestoneId.toNumber()
      )

      alert(`Escrow cancelled and refunded! Transaction: ${signature}`)
      await loadMilestones()
    } catch (error) {
      console.error('Error cancelling escrow:', error)
      alert(`Failed to cancel escrow: ${error.message}`)
    } finally {
      setProcessingMilestone(null)
    }
  }

  const getStatusBadge = (status) => {
    if (status.pending) return <span className="px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full border border-gray-200">Pending</span>
    if (status.funded) return <span className="px-3 py-1 text-xs font-semibold bg-teal-100 text-teal-700 rounded-full border border-teal-200">Funded</span>
    if (status.markedComplete) return <span className="px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full border border-amber-200">Awaiting Approval</span>
    if (status.released) return <span className="px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">Released</span>
    if (status.cancelled) return <span className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full border border-red-200">Cancelled</span>
  }

  const hasUserApproved = (milestone) => {
    if (!wallet.publicKey) return false
    return milestone.approvals.some(approver => approver.equals(wallet.publicKey))
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
      <div className="p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Payment Milestones</h2>
        
        {loading ? (
          <p className="text-gray-500 text-center py-8">Loading...</p>
        ) : (
          <div className="space-y-6">
            {/* Initialize Contract Banner */}
            {!contract.solana_contract_id && isCreator && (
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-teal-900 mb-2">
                      Initialize Contract on Solana
                    </h3>
                    <p className="text-sm text-teal-700">
                      Before setting up escrow milestones, you need to initialize this contract on the Solana blockchain. 
                      This is a one-time setup that creates an on-chain contract account.
                    </p>
                  </div>
                  <button
                    onClick={handleInitializeContract}
                    disabled={initializingContract || !wallet.connected}
                    className="px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:bg-gray-400 whitespace-nowrap font-medium transition-all"
                  >
                    {initializingContract ? 'Initializing...' : 'Initialize on Solana'}
                  </button>
                </div>
                {!wallet.connected && (
                  <p className="text-xs text-teal-600 mt-3 font-medium">Connect your wallet to initialize</p>
                )}
              </div>
            )}

            {contract.solana_contract_id && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-base font-semibold text-emerald-900">Contract Initialized on Solana</h3>
                      <p className="text-xs text-emerald-700 mt-1">
                        PDA: {contract.solana_contract_pda || 'Checking...'}
                      </p>
                    </div>
                  </div>
                  {contractStatus && (
                    <div className="flex items-center gap-2">
                      {contractStatus.active && (
                        <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                          Active
                        </span>
                      )}
                      {contractStatus.completed && (
                        <span className="px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
                          Completed
                        </span>
                      )}
                      {contractStatus.cancelled && (
                        <span className="px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full border border-red-200">
                          Cancelled
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {contractStatus?.cancelled && (
                  <p className="text-xs text-red-600 mt-3 font-medium">
                    ⚠️ This contract is cancelled. Escrow milestones cannot be created.
                  </p>
                )}
              </div>
            )}

            {!contract.solana_contract_id && !isCreator && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                <p className="text-sm text-gray-600 font-medium">
                  This contract needs to be initialized on Solana by the creator before escrow milestones can be set up.
                </p>
              </div>
            )}
            {/* AI Suggestions (not yet on-chain) */}
            {suggestions.filter(s => !s.synced_to_chain).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">AI-Suggested Milestones</h3>
                <div className="space-y-3">
                  {suggestions.filter(s => !s.synced_to_chain).map((suggestion) => (
                    <div key={suggestion.id} className="border border-gray-200 rounded-2xl p-6 bg-gray-50 hover:border-teal-300 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium">{suggestion.description}</p>
                          <div className="text-sm font-light text-gray-600 mt-2 space-y-1">
                            <p>Estimated: {suggestion.estimated_amount}</p>
                            <p>Deadline: {suggestion.deadline}</p>
                            {suggestion.suggested_recipient !== 'TBD' && (
                              <p>Recipient: {suggestion.suggested_recipient}</p>
                            )}
                          </div>
                        </div>
                        {isCreator && (
                          <>
                            <button
                              onClick={() => setShowSetupForm(showSetupForm === suggestion.id ? null : suggestion.id)}
                              disabled={!contract.solana_contract_id}
                              className="ml-4 px-4 py-2 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-all"
                              title={!contract.solana_contract_id ? 'Initialize contract on Solana first' : ''}
                            >
                              {showSetupForm === suggestion.id ? 'Cancel' : 'Set up Escrow'}
                            </button>
                            {!contract.solana_contract_id && (
                              <span className="ml-2 text-xs text-orange-600 font-medium">
                                ⚠️ Initialize contract first
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {showSetupForm === suggestion.id && (
                        <form id={`escrow-form-${suggestion.id}`} className="mt-4 space-y-4 bg-white p-5 rounded-2xl border border-teal-200">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                            <input
                              type="text"
                              name="description"
                              defaultValue={suggestion.description}
                              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (SOL)</label>
                            <input
                              type="number"
                              name="amount"
                              step="0.01"
                              min="0.01"
                              placeholder="e.g., 5.5"
                              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient Wallet Address</label>
                            <input
                              type="text"
                              name="recipient"
                              placeholder="Solana wallet address"
                              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Deadline (Optional)</label>
                            <input
                              type="date"
                              name="deadline"
                              className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSetupEscrow(suggestion)}
                            disabled={processingMilestone === suggestion.id}
                            className="w-full px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:bg-gray-400 font-medium transition-all"
                          >
                            {processingMilestone === suggestion.id ? 'Processing...' : 'Fund Escrow'}
                          </button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* On-chain Escrow Milestones */}
            {onChainMilestones.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Active Escrow Milestones</h3>
                <div className="space-y-3">
                  {onChainMilestones.map((milestone) => (
                    <div key={milestone.milestoneId.toString()} className="border border-gray-200 rounded-2xl p-6 hover:border-teal-300 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <p className="text-gray-900 font-semibold">{milestone.description}</p>
                            {getStatusBadge(milestone.status)}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1.5">
                            <p>Amount: {(milestone.amount.toNumber() / LAMPORTS_PER_SOL).toFixed(4)} SOL</p>
                            <p>Recipient: {milestone.recipient.toBase58().slice(0, 8)}...{milestone.recipient.toBase58().slice(-8)}</p>
                            <p>Approvals: {milestone.approvals.length} / {milestone.approvalsRequired}</p>
                            {milestone.markedCompleteBy && (
                              <p className="text-teal-600 font-medium">Marked complete by: {milestone.markedCompleteBy.toBase58().slice(0, 8)}...</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {/* Mark Complete Button */}
                          {milestone.status.funded && (
                            <button
                              onClick={() => handleMarkComplete(milestone)}
                              disabled={processingMilestone === milestone.milestoneId.toString()}
                              className="block w-full px-4 py-2 text-sm bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:bg-gray-400 font-medium transition-all"
                            >
                              Mark Complete
                            </button>
                          )}

                          {/* Approve Button */}
                          {milestone.status.markedComplete && !hasUserApproved(milestone) && (
                            <button
                              onClick={() => handleApprove(milestone)}
                              disabled={processingMilestone === milestone.milestoneId.toString()}
                              className="block w-full px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-gray-400 font-medium transition-all"
                            >
                              Approve Release
                            </button>
                          )}

                          {/* Already Approved */}
                          {milestone.status.markedComplete && hasUserApproved(milestone) && (
                            <span className="block text-xs text-emerald-600 font-semibold">✓ You approved</span>
                          )}

                          {/* Release Funds Button (if threshold met) */}
                          {milestone.status.markedComplete && 
                           milestone.approvals.length >= milestone.approvalsRequired && (
                            <button
                              onClick={() => handleReleaseFunds(milestone)}
                              disabled={processingMilestone === milestone.milestoneId.toString()}
                              className="block w-full px-4 py-2 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 disabled:bg-gray-400 font-medium transition-all"
                            >
                              Release Funds
                            </button>
                          )}

                          {/* Cancel Button (creator only) */}
                          {isCreator && (milestone.status.funded || milestone.status.pending) && (
                            <button
                              onClick={() => handleCancelEscrow(milestone)}
                              disabled={processingMilestone === milestone.milestoneId.toString()}
                              className="block w-full px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:bg-gray-400 font-medium transition-all"
                            >
                              Cancel & Refund
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suggestions.length === 0 && onChainMilestones.length === 0 && (
              <div className="rounded-3xl p-16 text-center">
                <div className="w-24 h-24 mx-auto mb-6">
                  <svg className="w-24 h-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-400">No payment milestones found</p>
                <p className="text-sm text-gray-400 mt-2">Upload a contract with payment terms to see AI-suggested milestones</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

