import { useState, useEffect } from 'react';
import axios from 'axios';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { approveContract } from '../solana/client';
import { ensureReputationExists } from '../solana/reputation';
import { ApprovalProgressBar } from './ApprovalProgressBar';
import { CommentThread } from './CommentThread';

const API_BASE = 'http://localhost:3001/api';

export function CommitView({ contractId, version, currentUserId, onRefresh, isCreator = false, totalMembers = 0, onBack }) {
  const wallet = useWallet();
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [diff, setDiff] = useState(null);
  const [parentVersion, setParentVersion] = useState(null);
  const [approvalCount, setApprovalCount] = useState(0);
  const [rejectionCount, setRejectionCount] = useState(0);
  const [versionStatus, setVersionStatus] = useState(version.approval_status || 'pending');
  const [contractInfo, setContractInfo] = useState(null);
  const [requiredApprovals, setRequiredApprovals] = useState(0);
  const [versionAuthorWallet, setVersionAuthorWallet] = useState(null);
  
  // Check if current user is the version author (the person who made the changes)
  const isVersionAuthor = version.author_id === currentUserId;

  useEffect(() => {
    if (contractInfo) {
      if (!versionAuthorWallet && version?.author_id) {
        loadVersionAuthorWallet();
      }
      loadApprovals();
    } else {
      loadContractInfo();
    }
    if (version?.parent_version_id) {
      loadParentVersion();
    }
  }, [version?.id, contractId, contractInfo?.solana_contract_pda, wallet.publicKey?.toString(), versionAuthorWallet]);

  const loadApprovals = async () => {
    if (!version?.id) return;
    
    try {
      // If contract is on-chain, load approvals from blockchain
      if (contractInfo?.solana_contract_pda) {
        try {
          const { fetchContractByPDA } = await import('../solana/client');
          const onChainContract = await fetchContractByPDA(contractInfo.solana_contract_pda);
          
          if (onChainContract) {
            // Helper function to safely convert BN to number
            const toNumber = (value) => {
              if (value === null || value === undefined) return 0;
              if (typeof value === 'number') return value;
              if (typeof value === 'bigint') return Number(value);
              if (value.toNumber && typeof value.toNumber === 'function') return value.toNumber();
              if (value.toString) return parseInt(value.toString(), 10) || 0;
              return 0;
            };
            
            // Get approvals from on-chain contract
            let approvalCount = toNumber(onChainContract.currentApprovals);
            const requiredApprovalsCount = toNumber(onChainContract.requiredApprovals);
            const approvers = onChainContract.approvers || [];
            const participants = onChainContract.participants || [];
            
            // Check if version author is a participant but hasn't approved on-chain
            // This represents their auto-approval (creator approves their own version)
            if (versionAuthorWallet) {
              const authorPubkeyStr = versionAuthorWallet;
              const authorIsParticipant = participants.some((addr) => {
                const addrStr = addr.toString ? addr.toString() : (addr.toBase58 ? addr.toBase58() : String(addr));
                return addrStr === authorPubkeyStr;
              });
              
              const authorHasApprovedOnChain = approvers.some((addr) => {
                const addrStr = addr.toString ? addr.toString() : (addr.toBase58 ? addr.toBase58() : String(addr));
                return addrStr === authorPubkeyStr;
              });
              
              // If author is a participant but hasn't approved on-chain, add 1 for their auto-approval
              if (authorIsParticipant && !authorHasApprovedOnChain) {
                approvalCount += 1;
              }
            }
            
            // Store required approvals for progress bar
            setRequiredApprovals(requiredApprovalsCount);
            
            // Check if current user has approved
            if (wallet.publicKey) {
              const userPubkeyStr = wallet.publicKey.toString();
              const hasApproved = approvers.some((addr) => {
                const addrStr = addr.toString ? addr.toString() : (addr.toBase58 ? addr.toBase58() : String(addr));
                return addrStr === userPubkeyStr;
              });
              setUserVote(hasApproved ? 'approve' : null);
            } else {
              setUserVote(null);
            }
            
            setApprovalCount(approvalCount);
            setRejectionCount(0); // On-chain doesn't support rejections
            
            // Build approvals list - include creator's auto-approval if they haven't approved on-chain
            const approvalsList = approvers.map((addr) => {
              const addrStr = addr.toString ? addr.toString() : (addr.toBase58 ? addr.toBase58() : String(addr));
              return {
                id: addrStr,
                user_id: addrStr,
                vote: 'approve',
                approver_address: addrStr
              };
            });
            
            // Add version author's auto-approval to the list if they haven't approved on-chain
            if (versionAuthorWallet) {
              const authorPubkeyStr = versionAuthorWallet;
              const authorHasApprovedOnChain = approvers.some((addr) => {
                const addrStr = addr.toString ? addr.toString() : (addr.toBase58 ? addr.toBase58() : String(addr));
                return addrStr === authorPubkeyStr;
              });
              
              if (!authorHasApprovedOnChain) {
                approvalsList.push({
                  id: `auto-${versionAuthorWallet}`,
                  user_id: versionAuthorWallet,
                  vote: 'approve',
                  approver_address: versionAuthorWallet,
                  isAutoApproval: true
                });
              }
            }
            
            setApprovals(approvalsList);
            
            // Determine status based on approvals and contract completion
            const isCompleted = onChainContract.status?.completed !== undefined;
            if (isCompleted || (approvalCount >= requiredApprovalsCount && requiredApprovalsCount > 0)) {
              // Check if version is already merged in database
              if (version.merged) {
                setVersionStatus('merged');
              } else {
                setVersionStatus('approved');
              }
            } else if (approvalCount > 0) {
              setVersionStatus('approved');
            } else {
              setVersionStatus('pending');
            }
          } else {
            // Contract not found on-chain
            setApprovalCount(0);
            setRejectionCount(0);
            setVersionStatus('pending');
            setApprovals([]);
          }
        } catch (onChainError) {
          console.error('Error loading on-chain approvals:', onChainError);
          // Fallback to empty state
          setApprovalCount(0);
          setRejectionCount(0);
          setVersionStatus('pending');
          setApprovals([]);
        }
      } else {
        // Contract not on-chain, no approvals possible
        setApprovalCount(0);
        setRejectionCount(0);
        setVersionStatus('pending');
        setApprovals([]);
        setUserVote(null);
      }
    } catch (error) {
      console.error('Error loading approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContractInfo = async () => {
    try {
      const res = await axios.get(`${API_BASE}/contracts/${contractId}`);
      setContractInfo(res.data.contract);
    } catch (error) {
      console.error('Error loading contract info:', error);
    }
  };

  const loadVersionAuthorWallet = async () => {
    try {
      const res = await axios.get(`${API_BASE}/contracts/${contractId}/versions/${version.id}`);
      if (res.data.version.author_wallet) {
        setVersionAuthorWallet(res.data.version.author_wallet);
      }
    } catch (error) {
      console.error('Error loading version author wallet:', error);
    }
  };

  const loadParentVersion = async () => {
    try {
      const res = await axios.get(`${API_BASE}/contracts/${contractId}/versions/${version.parent_version_id}`);
      setParentVersion(res.data.version);
    } catch (error) {
      console.error('Error loading parent version:', error);
    }
  };

  const loadDiff = async () => {
    if (!version?.parent_version_id) return;
    
    try {
      const res = await axios.get(`${API_BASE}/contracts/${contractId}/diff`, {
        params: { from: version.parent_version_id, to: version.id }
      });
      setDiff(res.data.diff);
      setShowDiff(true);
    } catch (error) {
      console.error('Error loading diff:', error);
    }
  };

  const submitVote = async (vote) => {
    setSubmitting(true);
    try {
      // If approving, must approve on-chain (no database storage)
      if (vote === 'approve') {
        if (!contractInfo?.solana_contract_pda) {
          alert('Error: Contract not initialized on Solana. Please initialize the contract on the Milestones tab first.');
          setSubmitting(false);
          return;
        }

        if (!wallet.connected || !wallet.publicKey) {
          alert('Please connect your wallet first to approve on-chain');
          setSubmitting(false);
          return;
        }

        try {
          // Ensure user has reputation account
          await ensureReputationExists(wallet);
          
          // Approve contract on-chain using the stored PDA
          console.log('Approving contract on-chain...', { 
            contractPDA: contractInfo.solana_contract_pda
          });
          const txSignature = await approveContract(wallet, contractInfo.solana_contract_pda);
          console.log('Contract approved on-chain:', txSignature);
          
          // Wait a moment for blockchain confirmation
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Refresh approvals from on-chain to get updated status
          await loadApprovals();
          
          // Check if contract is completed on-chain and merge if needed
          try {
            const { fetchContractByPDA } = await import('../solana/client');
            const updatedContract = await fetchContractByPDA(contractInfo.solana_contract_pda);
            
            if (updatedContract) {
              // Helper function to safely convert BN to number
              const toNumber = (value) => {
                if (value === null || value === undefined) return 0;
                if (typeof value === 'number') return value;
                if (typeof value === 'bigint') return Number(value);
                if (value.toNumber && typeof value.toNumber === 'function') return value.toNumber();
                if (value.toString) return parseInt(value.toString(), 10) || 0;
                return 0;
              };
              
              const currentApprovals = toNumber(updatedContract.currentApprovals);
              const requiredApprovals = toNumber(updatedContract.requiredApprovals);
              const isCompleted = updatedContract.status?.completed !== undefined;
              
              if (isCompleted || (currentApprovals >= requiredApprovals && requiredApprovals > 0)) {
                // Contract is completed on-chain, merge the version
                try {
                  const mergeRes = await axios.post(`${API_BASE}/contracts/${contractId}/versions/${version.id}/merge-onchain`, {
                    onchain_completed: true,
                    current_approvals: currentApprovals,
                    required_approvals: requiredApprovals
                  });
                  
                  if (mergeRes.data.merged) {
                    alert(`✅ Contract approved and merged!\n\nTransaction: ${txSignature}\n\nAll approvals met (${currentApprovals}/${requiredApprovals}). Version has been merged.`);
                    setVersionStatus('merged');
                  } else {
                    alert(`✅ Contract approved on-chain!\n\nTransaction: ${txSignature}\n\nApprovals: ${currentApprovals}/${requiredApprovals}`);
                  }
                } catch (mergeError) {
                  console.error('Error merging version:', mergeError);
                  alert(`✅ Contract approved on-chain!\n\nTransaction: ${txSignature}\n\nApprovals: ${currentApprovals}/${requiredApprovals}\n\nNote: Auto-merge failed. Please merge manually.`);
                }
              } else {
                alert(`✅ Contract approved on-chain!\n\nTransaction: ${txSignature}\n\nApprovals: ${currentApprovals}/${requiredApprovals}`);
              }
            } else {
              alert(`✅ Contract approved on-chain! Transaction: ${txSignature}`);
            }
          } catch (checkError) {
            console.error('Error checking contract status:', checkError);
            alert(`✅ Contract approved on-chain! Transaction: ${txSignature}`);
          }
          
          // Refresh the UI - add small delay to ensure database is updated
          await loadApprovals();
          // Small delay to ensure backend has finished processing
          setTimeout(() => {
            onRefresh();
          }, 500);
        } catch (solanaError) {
          console.error('Error approving on-chain:', solanaError);
          setSubmitting(false);
          
          // Check for specific error types
          const errorMessage = solanaError?.message || String(solanaError);
          if (errorMessage.includes('CONTRACT_NOT_INITIALIZED')) {
            alert('Error: Contract is not initialized on-chain. Please initialize the contract on the Milestones tab first.');
          } else if (errorMessage.includes('AlreadyApproved') || 
                     errorMessage.includes('already approved')) {
            alert('You have already approved this contract on-chain.');
            await loadApprovals();
            onRefresh();
          } else if (errorMessage.includes('NotAParticipant')) {
            alert('Error: You are not a participant in this contract on-chain.');
          } else {
            alert(`Failed to approve on-chain: ${errorMessage}`);
          }
          return;
        }
      } else {
        // Rejection - for now, we'll skip on-chain rejection since the contract program doesn't support it
        alert('Rejection is not supported on-chain. Only approvals are stored on-chain.');
        setSubmitting(false);
        return;
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert(`Failed to submit vote: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-4">Loading...</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="text-teal-600 hover:text-blue-800 text-sm"
        >
          ← Back to Editor
        </button>
      </div>
      
      <div className="border-b border-gray-200 pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">v{version.version_number}</h3>
            <p className="text-sm text-gray-600 mt-1">{version.commit_message || 'No commit message'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            versionStatus === 'approved' ? 'bg-green-100 text-green-800' :
            versionStatus === 'rejected' ? 'bg-red-100 text-red-800' :
            versionStatus === 'merged' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {versionStatus || 'pending'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          By {version.author_name} • {new Date(version.created_at).toLocaleString()}
        </p>
      </div>

      {/* Commit Content */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900">Commit Content</h4>
          {version.parent_version_id && (
            <button
              onClick={loadDiff}
              className="text-xs text-teal-600 hover:text-blue-800"
            >
              {showDiff ? 'Hide Changes' : 'Show Changes'}
            </button>
          )}
        </div>
        <div className="bg-gray-50 rounded-md p-3 max-h-64 overflow-y-auto">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
            {version.content || '(empty)'}
          </pre>
        </div>
      </div>

      {/* Diff View */}
      {showDiff && diff && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Changes</h4>
          <div className="bg-gray-50 rounded-md p-3 max-h-64 overflow-y-auto">
            <div className="space-y-1 font-mono text-xs">
              {diff.map((change, idx) => (
                <div
                  key={idx}
                  className={`px-2 py-1 ${
                    change.type === 'add'
                      ? 'bg-green-50 text-green-800'
                      : change.type === 'remove'
                      ? 'bg-red-50 text-red-800'
                      : 'bg-gray-50'
                  }`}
                >
                  <span className="font-semibold">
                    {change.type === 'add' ? '+' : change.type === 'remove' ? '-' : ' '}
                  </span>
                  {change.line}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {versionStatus !== 'merged' && (
        <>
          <ApprovalProgressBar approvalCount={approvalCount} totalMembers={requiredApprovals > 0 ? requiredApprovals : totalMembers} />

          {/* Author Dashboard */}
          {isVersionAuthor ? (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Approval Dashboard</h4>

              <div className="bg-gray-50 rounded-md p-3">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-600">Current Status</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{versionStatus || 'pending'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Approval Count</p>
                    <p className="text-sm font-medium text-gray-900">{approvalCount} / {totalMembers}</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-xs text-gray-600 mb-2">Votes Summary</p>
                  <div className="space-y-2">
                    {approvals.length === 0 ? (
                      <p className="text-xs text-gray-500">No votes yet</p>
                    ) : (
                      approvals.map(approval => (
                        <div key={approval.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${
                              approval.vote === 'approve' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <span className="text-gray-900">{approval.user_name}</span>
                          </div>
                          <span className={`px-2 py-1 rounded ${
                            approval.vote === 'approve' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {approval.vote}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Your Vote</h4>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => submitVote('approve')}
                  disabled={submitting}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
                    userVote === 'approve'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  } disabled:opacity-50`}
                >
                  {userVote === 'approve' ? '✓ Approved' : 'Approve'}
                </button>
                <button
                  onClick={() => submitVote('reject')}
                  disabled={submitting}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium ${
                    userVote === 'reject'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  } disabled:opacity-50`}
                >
                  {userVote === 'reject' ? '✗ Rejected' : 'Reject'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      {versionStatus === 'merged' && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-green-900">This version has been merged into the main contract.</p>
          </div>
        </div>
      )}

      {versionStatus != 'merged' && (
        <CommentThread contractId={contractId} versionId={version.id} />
      )}
    </div>
  );
}

