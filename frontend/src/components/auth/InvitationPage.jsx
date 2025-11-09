import { useState, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ReputationScore } from '../ReputationScore';
import { CompanyInfoPopup } from '../CompanyInfoPopup';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

export function InvitationPage({ invitation, user, onLogin, onRegister, onAccept }) {
  const [inviterReputation, setInviterReputation] = useState({ client: null, vendor: null });
  const [loadingReputation, setLoadingReputation] = useState(true);
  const [showCompanyPopup, setShowCompanyPopup] = useState(false);
  const [popupRoleType, setPopupRoleType] = useState(null);
  
  useEffect(() => {
    if (invitation?.invited_by || invitation?.invited_by_user_id) {
      loadInviterReputation();
    } else {
      setLoadingReputation(false);
    }
  }, [invitation]);

  const loadInviterReputation = async () => {
    const inviterId = invitation?.invited_by || invitation?.invited_by_user_id;
    if (!inviterId) {
      setLoadingReputation(false);
      return;
    }

    try {
      setLoadingReputation(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API_BASE}/reputation/user/${inviterId}`, {
        headers
      });
      setInviterReputation(response.data.reputation || { client: null, vendor: null });
    } catch (error) {
      console.error('Error loading inviter reputation:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set reputation to null so we show "no reputation" message instead of hiding the section
      setInviterReputation({ client: null, vendor: null });
    } finally {
      setLoadingReputation(false);
    }
  };

  // Determine which reputation to show based on invitation context
  // Show the opposite role's reputation - if inviting as vendor, show client rep; if client, show vendor rep
  const getRelevantReputationRole = () => {
    if (!invitation?.role_in_contract) return null;
    const role = invitation.role_in_contract.toLowerCase();
    // If invitee is vendor, show client reputation; if invitee is client, show vendor reputation
    return role === 'vendor' ? 'client' : role === 'client' ? 'vendor' : null;
  };

  const handleReputationClick = (roleType) => {
    setPopupRoleType(roleType);
    setShowCompanyPopup(true);
  };

  const handleClosePopup = () => {
    setShowCompanyPopup(false);
    setPopupRoleType(null);
  };
  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Invalid Invitation</h2>
          <p className="text-gray-600">This invitation link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Contract Invitation</h2>
          <p className="text-gray-600">You've been invited to join a contract</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">{invitation.contract_title}</h3>
            <p className="text-sm text-gray-600 mb-2">{invitation.contract_description}</p>
            <div className="flex justify-between text-sm">
              <span><strong>Role:</strong> {invitation.role_in_contract}</span>
            </div>
            <div className="mt-2 text-sm">
              <span><strong>Invited by:</strong> {invitation.invited_by_name}</span>
            </div>
          </div>

          {/* Reputation Score Display */}
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
            <h4 className="text-sm font-semibold text-teal-900 mb-3">
              {invitation.invited_by_name}
            </h4>
            
            {loadingReputation ? (
              <div className="text-sm text-gray-500 py-2">
                Loading reputation...
              </div>
            ) : (inviterReputation.client || inviterReputation.vendor) ? (
              <div className="space-y-2">
                {/* Show relevant reputation based on invitee's role */}
                {(() => {
                  const relevantRole = getRelevantReputationRole();
                  
                  // If invitee is vendor, show client reputation; if client, show vendor reputation
                  if (relevantRole && inviterReputation[relevantRole]) {
                    return (
                      <ReputationScore 
                        userId={invitation.invited_by || invitation.invited_by_user_id} 
                        roleType={relevantRole} 
                        compact={true}
                        onClick={handleReputationClick}
                      />
                    );
                  }
                  
                  // Fallback: show both if available
                  return (
                    <>
                      {inviterReputation.client && (
                        <ReputationScore 
                          userId={invitation.invited_by || invitation.invited_by_user_id} 
                          roleType="client" 
                          compact={true}
                          onClick={handleReputationClick}
                        />
                      )}
                      {inviterReputation.vendor && (
                        <ReputationScore 
                          userId={invitation.invited_by || invitation.invited_by_user_id} 
                          roleType="vendor" 
                          compact={true}
                          onClick={handleReputationClick}
                        />
                      )}
                    </>
                  );
                })()}
      
              </div>
            ) : (
              <div className="space-y-3">
                {/* Show default rating when no reputation data is available */}
                {(() => {
                  const relevantRole = getRelevantReputationRole() || 'vendor';
                  const defaultScore = 0;
                  
                  return (
                    <div 
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-300 bg-gray-50 text-gray-600 cursor-pointer hover:shadow-md hover:scale-105 transition-all"
                      onClick={() => handleReputationClick(relevantRole)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleReputationClick(relevantRole);
                        }
                      }}
                    >
                      <span className="text-xs font-semibold capitalize">{relevantRole}:</span>
                      <span className="text-sm font-bold">{defaultScore}</span>
                      <span className="text-xs">/100</span>
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  );
                })()}
                
                <div className="text-xs text-gray-500 mt-2">
                  <p>No reputation data available yet.</p>
                  <p className="mt-1">
                    Reputation scores are calculated from on-chain contract activity. This user hasn't completed any contracts yet.
                  </p>
                </div>
              </div>
            )}
          </div>

     
        </div>

        {!user ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-center text-gray-600">Choose how to proceed:</p>
              <WalletMultiButton className="w-full" />
              <div className="text-center text-sm text-gray-500">or</div>
              <button
                onClick={onLogin}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-blue-700"
              >
                Login with Email
              </button>
              <button
                onClick={onRegister}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Register with Email
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              {invitation.email && user.email !== invitation.email && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800">
                    <strong>Email mismatch:</strong> You're logged in as {user.email}, but this invitation is for {invitation.email}.
                    Please login with the correct email address.
                  </p>
                </div>
              )}
            </div>
            
            {(!invitation.email || user.email === invitation.email) ? (
              <div className="space-y-3">
                <button
                  onClick={onAccept}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                >
                  Accept Invitation
                </button>
                <button
                  onClick={() => {
                    // Handle decline - you may want to add an onDecline prop
                    if (window.confirm('Are you sure you want to decline this invitation?')) {
                      // Could navigate away or call an API to decline
                      window.location.href = '/';
                    }
                  }}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Decline Invitation
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  window.location.reload()
                }}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-blue-700"
              >
                Login with Correct Email
              </button>
            )}
          </div>
        )}
      </div>

      {/* Company Info Popup */}
      <CompanyInfoPopup
        isOpen={showCompanyPopup}
        onClose={handleClosePopup}
        roleType={popupRoleType}
        companyName={invitation.invited_by_name}
      />
    </div>
  )
}

