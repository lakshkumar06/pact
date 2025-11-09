import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

/**
 * Component to display reputation scores for a user
 * Shows client and vendor reputation separately
 */
export function ReputationScore({ userId, walletAddress, roleType = null, compact = false, onClick = null }) {
  const [reputation, setReputation] = useState({ client: null, vendor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReputation();
  }, [userId, walletAddress]);

  const loadReputation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (walletAddress) {
        response = await axios.get(`${API_BASE}/reputation/wallet/${walletAddress}`);
      } else if (userId) {
        response = await axios.get(`${API_BASE}/reputation/user/${userId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
      } else {
        setLoading(false);
        return;
      }

      setReputation(response.data.reputation || { client: null, vendor: null });
    } catch (err) {
      console.error('Error loading reputation:', err);
      setError('Failed to load reputation');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500">
        {compact ? 'Loading...' : 'Loading reputation...'}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500">
        {error}
      </div>
    );
  }

  // If no reputation data, show message
  if ((!reputation.client && !reputation.vendor) || 
      (roleType && !reputation[roleType])) {
    return (
      <div className="text-sm text-gray-500">
        {compact ? 'No reputation data' : 'No on-chain reputation yet'}
      </div>
    );
  }

  // Display based on role type filter
  if (roleType) {
    const score = reputation[roleType];
    if (!score) return null;
    
    return <ReputationDisplay score={score} roleType={roleType} compact={compact} onClick={onClick} />;
  }

  // Display both client and vendor
  return (
    <div className={`space-y-3 ${compact ? 'space-y-2' : ''}`}>
      {reputation.client && (
        <ReputationDisplay score={reputation.client} roleType="client" compact={compact} onClick={onClick} />
      )}
      {reputation.vendor && (
        <ReputationDisplay score={reputation.vendor} roleType="vendor" compact={compact} onClick={onClick} />
      )}
    </div>
  );
}

/**
 * Display a single reputation score
 */
function ReputationDisplay({ score, roleType, compact, onClick }) {
  const isClient = roleType === 'client';
  const overallScore = score.overall_score || 0;
  
  // Get score color based on rating
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  if (compact) {
    const baseClasses = `inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${getScoreColor(overallScore)}`;
    const clickableClasses = onClick ? 'cursor-pointer hover:shadow-md hover:scale-105 transition-all' : '';
    
    return (
      <div 
        className={`${baseClasses} ${clickableClasses}`}
        onClick={onClick ? () => onClick(roleType) : undefined}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(roleType);
          }
        } : undefined}
      >
        <span className="text-xs font-semibold capitalize">{roleType}:</span>
        <span className="text-sm font-bold">{Math.round(overallScore)}</span>
        <span className="text-xs">/100</span>
        {onClick && (
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-teal-300 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-base font-semibold text-gray-900 capitalize mb-1">
            {roleType === 'client' ? '👤 Client Reputation' : '🏭 Vendor Reputation'}
          </h4>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${getScoreColor(overallScore)}`}>
            <span className="text-lg font-bold">{Math.round(overallScore)}</span>
            <span className="text-xs">/100</span>
            <span className="text-xs font-medium">({getScoreLabel(overallScore)})</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {isClient ? (
          <>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Payment Timeliness:</span>
              <span className="font-semibold text-gray-900">
                {Math.round(score.payment_timeliness_score || 0)}/100
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Contracts as Client:</span>
              <span className="font-semibold text-gray-900">
                {score.total_contracts_as_client || 0}
              </span>
            </div>
            {score.payment_on_time_count > 0 && (
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>On-time payments:</span>
                <span>{score.payment_on_time_count}</span>
              </div>
            )}
            {score.payment_late_count > 0 && (
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Late payments:</span>
                <span>{score.payment_late_count}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Delivery Timeliness:</span>
              <span className="font-semibold text-gray-900">
                {Math.round(score.delivery_timeliness_score || 0)}/100
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Delivery Quality:</span>
              <span className="font-semibold text-gray-900">
                {Math.round(score.delivery_quality_score || 0)}/100
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Contracts as Vendor:</span>
              <span className="font-semibold text-gray-900">
                {score.total_contracts_as_vendor || 0}
              </span>
            </div>
            {score.delivery_on_time_count > 0 && (
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>On-time deliveries:</span>
                <span>{score.delivery_on_time_count}</span>
              </div>
            )}
            {score.delivery_late_count > 0 && (
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Late deliveries:</span>
                <span>{score.delivery_late_count}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

