import { db } from '../database/init.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Calculate reputation scores for a user based on their contract history
 * @param {string} userId - User ID
 * @param {string} roleType - 'client' or 'vendor'
 * @returns {Promise<Object>} Reputation scores
 */
export async function calculateReputationScores(userId, roleType) {
  return new Promise((resolve, reject) => {
    try {
      // Get user's wallet address
      db.get('SELECT wallet_address FROM users WHERE id = ?', [userId], async (err, user) => {
        if (err) {
          return reject(err);
        }
        if (!user) {
          return reject(new Error('User not found'));
        }

        const walletAddress = user.wallet_address;

        if (roleType === 'client') {
          calculateClientReputation(userId, walletAddress, resolve, reject);
        } else if (roleType === 'vendor') {
          calculateVendorReputation(userId, walletAddress, resolve, reject);
        } else {
          reject(new Error('Invalid role type. Must be "client" or "vendor"'));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Calculate client reputation (payment timeliness, dispute rate)
 */
function calculateClientReputation(userId, walletAddress, resolve, reject) {
  // Get contracts where user is the creator (typically the client who funds escrow)
  db.all(`
    SELECT 
      c.id,
      c.created_by,
      c.status,
      c.created_at,
      cm.role_in_contract
    FROM contracts c
    JOIN contract_members cm ON c.id = cm.contract_id
    WHERE c.created_by = ? AND cm.user_id = ?
    AND c.status IN ('active', 'completed')
  `, [userId, userId], (err, contracts) => {
    if (err) {
      return reject(err);
    }

    // For now, we'll calculate based on:
    // 1. Payment timeliness (how quickly they approve milestone releases)
    // 2. Contract completion rate
    // 3. Dispute rate (when we add disputes)

    // Get milestone data from on-chain (we'll need to query Solana or store in DB)
    // For now, use a simplified calculation based on completed contracts
    
    const totalContracts = contracts.length;
    const completedContracts = contracts.filter(c => c.status === 'completed').length;
    const completionRate = totalContracts > 0 ? (completedContracts / totalContracts) * 100 : 0;

    // Payment timeliness: Calculate based on approval time for milestones
    // For now, we'll use a placeholder score that will be improved when we have milestone data
    // TODO: Query milestone release times and calculate average approval time
    
    // Default scores (will be improved with actual milestone data)
    let paymentTimelinessScore = 75.0; // Default score
    let paymentOnTimeCount = 0;
    let paymentLateCount = 0;
    let paymentDisputeCount = 0;

    // Calculate overall score (weighted average)
    const overallScore = (
      paymentTimelinessScore * 0.7 +  // 70% weight on payment timeliness
      completionRate * 0.3              // 30% weight on completion rate
    );

    const reputationData = {
      user_id: userId,
      wallet_address: walletAddress,
      role_type: 'client',
      payment_timeliness_score: Math.round(paymentTimelinessScore * 100) / 100,
      payment_on_time_count: paymentOnTimeCount,
      payment_late_count: paymentLateCount,
      payment_dispute_count: paymentDisputeCount,
      total_contracts_as_client: totalContracts,
      overall_score: Math.round(overallScore * 100) / 100,
      last_calculated_at: new Date().toISOString()
    };

    // Store in database
    storeReputationScore(reputationData)
      .then(() => resolve(reputationData))
      .catch(reject);
  });
}

/**
 * Calculate vendor reputation (delivery timeliness, quality)
 */
function calculateVendorReputation(userId, walletAddress, resolve, reject) {
  // Get contracts where user is a member but not the creator (typically vendor who receives payments)
  db.all(`
    SELECT 
      c.id,
      c.created_by,
      c.status,
      c.created_at,
      cm.role_in_contract
    FROM contracts c
    JOIN contract_members cm ON c.id = cm.contract_id
    WHERE cm.user_id = ? AND c.created_by != ?
    AND c.status IN ('active', 'completed')
  `, [userId, userId], (err, contracts) => {
    if (err) {
      return reject(err);
    }

    const totalContracts = contracts.length;
    const completedContracts = contracts.filter(c => c.status === 'completed').length;
    const completionRate = totalContracts > 0 ? (completedContracts / totalContracts) * 100 : 0;

    // Delivery timeliness: Calculate based on milestone completion time
    // For now, use placeholder scores
    // TODO: Query milestone completion times from Solana/DB
    
    let deliveryTimelinessScore = 75.0; // Default score
    let deliveryOnTimeCount = 0;
    let deliveryLateCount = 0;
    let deliveryQualityScore = 80.0; // Default quality score

    // Calculate overall score
    const overallScore = (
      deliveryTimelinessScore * 0.5 +  // 50% weight on timeliness
      deliveryQualityScore * 0.3 +      // 30% weight on quality
      completionRate * 0.2               // 20% weight on completion rate
    );

    const reputationData = {
      user_id: userId,
      wallet_address: walletAddress,
      role_type: 'vendor',
      delivery_timeliness_score: Math.round(deliveryTimelinessScore * 100) / 100,
      delivery_on_time_count: deliveryOnTimeCount,
      delivery_late_count: deliveryLateCount,
      delivery_quality_score: Math.round(deliveryQualityScore * 100) / 100,
      total_contracts_as_vendor: totalContracts,
      overall_score: Math.round(overallScore * 100) / 100,
      last_calculated_at: new Date().toISOString()
    };

    // Store in database
    storeReputationScore(reputationData)
      .then(() => resolve(reputationData))
      .catch(reject);
  });
}

/**
 * Store or update reputation score in database
 */
function storeReputationScore(reputationData) {
  return new Promise((resolve, reject) => {
    const {
      user_id,
      wallet_address,
      role_type,
      payment_timeliness_score,
      payment_on_time_count,
      payment_late_count,
      payment_dispute_count,
      delivery_timeliness_score,
      delivery_on_time_count,
      delivery_late_count,
      delivery_quality_score,
      total_contracts_as_client,
      total_contracts_as_vendor,
      overall_score,
      last_calculated_at
    } = reputationData;

    // Check if record exists
    db.get(
      'SELECT id FROM user_reputation_scores WHERE user_id = ? AND role_type = ?',
      [user_id, role_type],
      (err, existing) => {
        if (err) {
          return reject(err);
        }

        if (existing) {
          // Update existing record
          db.run(`
            UPDATE user_reputation_scores SET
              wallet_address = ?,
              payment_timeliness_score = ?,
              payment_on_time_count = ?,
              payment_late_count = ?,
              payment_dispute_count = ?,
              delivery_timeliness_score = ?,
              delivery_on_time_count = ?,
              delivery_late_count = ?,
              delivery_quality_score = ?,
              total_contracts_as_client = ?,
              total_contracts_as_vendor = ?,
              overall_score = ?,
              last_calculated_at = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND role_type = ?
          `, [
            wallet_address,
            payment_timeliness_score || 0,
            payment_on_time_count || 0,
            payment_late_count || 0,
            payment_dispute_count || 0,
            delivery_timeliness_score || 0,
            delivery_on_time_count || 0,
            delivery_late_count || 0,
            delivery_quality_score || 0,
            total_contracts_as_client || 0,
            total_contracts_as_vendor || 0,
            overall_score || 0,
            last_calculated_at,
            user_id,
            role_type
          ], (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        } else {
          // Insert new record
          const id = uuidv4();
          db.run(`
            INSERT INTO user_reputation_scores (
              id, user_id, wallet_address, role_type,
              payment_timeliness_score, payment_on_time_count, payment_late_count, payment_dispute_count,
              delivery_timeliness_score, delivery_on_time_count, delivery_late_count, delivery_quality_score,
              total_contracts_as_client, total_contracts_as_vendor, overall_score, last_calculated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            id,
            user_id,
            wallet_address,
            role_type,
            payment_timeliness_score || 0,
            payment_on_time_count || 0,
            payment_late_count || 0,
            payment_dispute_count || 0,
            delivery_timeliness_score || 0,
            delivery_on_time_count || 0,
            delivery_late_count || 0,
            delivery_quality_score || 0,
            total_contracts_as_client || 0,
            total_contracts_as_vendor || 0,
            overall_score || 0,
            last_calculated_at
          ], (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        }
      }
    );
  });
}

/**
 * Get reputation scores for a user
 * @param {string} userId - User ID
 * @param {string} walletAddress - Optional wallet address
 * @param {boolean} autoCalculate - If true, calculate reputation if it doesn't exist
 * @returns {Promise<Object>} Reputation scores for both roles
 */
export async function getReputationScores(userId, walletAddress = null, autoCalculate = true) {
  return new Promise(async (resolve, reject) => {
    try {
      const query = walletAddress
        ? 'SELECT * FROM user_reputation_scores WHERE user_id = ? OR wallet_address = ?'
        : 'SELECT * FROM user_reputation_scores WHERE user_id = ?';
      
      const params = walletAddress ? [userId, walletAddress] : [userId];

      db.all(query, params, async (err, rows) => {
        if (err) {
          return reject(err);
        }

        // Organize by role type
        const scores = {
          client: null,
          vendor: null
        };

        rows.forEach(row => {
          if (row.role_type === 'client') {
            scores.client = row;
          } else if (row.role_type === 'vendor') {
            scores.vendor = row;
          }
        });

        // If auto-calculate is enabled and no scores exist, try to calculate them
        if (autoCalculate && !scores.client && !scores.vendor) {
          // Check if user has contract activity and calculate reputation asynchronously
          // Don't wait for calculation, just return current scores (empty)
          // Reputation will be available on next request
          setImmediate(async () => {
            try {
              // Check if user has created contracts (client role)
              db.get('SELECT COUNT(*) as count FROM contracts WHERE created_by = ?', [userId], (err, result) => {
                if (!err && result && result.count > 0) {
                  calculateReputationScores(userId, 'client').catch(err => 
                    console.error('Error auto-calculating client reputation:', err)
                  );
                }
              });

              // Check if user is a vendor (member but not creator)
              db.get(
                'SELECT COUNT(*) as count FROM contract_members cm JOIN contracts c ON cm.contract_id = c.id WHERE cm.user_id = ? AND c.created_by != ?',
                [userId, userId],
                (err, result) => {
                  if (!err && result && result.count > 0) {
                    calculateReputationScores(userId, 'vendor').catch(err => 
                      console.error('Error auto-calculating vendor reputation:', err)
                    );
                  }
                }
              );
            } catch (autoCalcErr) {
              console.error('Error in auto-calculation:', autoCalcErr);
            }
          });
        }
        
        resolve(scores);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get reputation score by wallet address (for invitations)
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<Object>} Reputation scores
 */
export async function getReputationByWallet(walletAddress) {
  return new Promise((resolve, reject) => {
    if (!walletAddress) {
      return resolve({ client: null, vendor: null });
    }

    db.all(
      'SELECT * FROM user_reputation_scores WHERE wallet_address = ?',
      [walletAddress],
      (err, rows) => {
        if (err) {
          return reject(err);
        }

        const scores = {
          client: null,
          vendor: null
        };

        rows.forEach(row => {
          if (row.role_type === 'client') {
            scores.client = row;
          } else if (row.role_type === 'vendor') {
            scores.vendor = row;
          }
        });

        resolve(scores);
      }
    );
  });
}

/**
 * Recalculate reputation for a user (called after contract completion, payment, etc.)
 */
export async function recalculateReputation(userId) {
  try {
    const clientScores = await calculateReputationScores(userId, 'client');
    const vendorScores = await calculateReputationScores(userId, 'vendor');
    return { client: clientScores, vendor: vendorScores };
  } catch (error) {
    console.error('Error recalculating reputation:', error);
    throw error;
  }
}

