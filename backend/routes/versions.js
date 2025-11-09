import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/init.js';
import { authenticateToken } from './auth.js';
import { generateContractHash, storeContractProofOnChain, updateContractIpfsOnChain, updateContractIpfsOnChainByPDA, deriveContractPDA } from '../services/solanaService.js';
import { uploadToIPFS, pinToIPFS } from '../services/ipfsService.js';

const router = express.Router();

// Simple diff function
function computeDiff(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diff = [];
  let added = 0, removed = 0;

  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    if (i >= oldLines.length) {
      diff.push({ type: 'add', line: newLines[i], lineNum: i + 1 });
      added++;
    } else if (i >= newLines.length) {
      diff.push({ type: 'remove', line: oldLines[i], lineNum: i + 1 });
      removed++;
    } else if (oldLines[i] !== newLines[i]) {
      diff.push({ type: 'remove', line: oldLines[i], lineNum: i + 1 });
      diff.push({ type: 'add', line: newLines[i], lineNum: i + 1 });
      removed++;
      added++;
    }
  }

  return {
    full: diff,
    summary: `${added} additions, ${removed} deletions`
  };
}

// Store contract proof on-chain and update database using IPFS
async function storeContractProof(versionId, contractContent, contractId) {
  console.log('[storeContractProof] START - versionId:', versionId, 'contractId:', contractId);
  return new Promise((resolve, reject) => {
  try {
      // First, get the contract details to find Solana info
      db.get(
        `SELECT c.*, u.wallet_address as creator_wallet
         FROM contracts c
         JOIN users u ON c.created_by = u.id
         WHERE c.id = ?`,
        [contractId],
        async (err, contract) => {
          if (err || !contract) {
            console.error('[storeContractProof] Error fetching contract:', err);
            return resolve({ ipfsHash: null, txHash: null, error: 'Contract not found' });
          }

          console.log('[storeContractProof] Contract fetched - solana_contract_id:', contract.solana_contract_id, 'solana_contract_pda:', contract.solana_contract_pda, 'creator_wallet:', contract.creator_wallet);

          try {
            // Upload content to IPFS
            console.log('[storeContractProof] Uploading to IPFS...');
            const ipfsHash = await uploadToIPFS(contractContent);
            console.log('[storeContractProof] Content uploaded to IPFS:', ipfsHash);
            
            // Pin the content to IPFS
            console.log('[storeContractProof] Pinning to IPFS...');
            await pinToIPFS(ipfsHash);
            console.log('[storeContractProof] Pinned to IPFS');
    
            // Get signer private key from environment
    const signerPrivateKey = process.env.SOLANA_SIGNER_PRIVATE_KEY;
    
    if (!signerPrivateKey) {
      console.warn('[storeContractProof] SOLANA_SIGNER_PRIVATE_KEY not set, skipping on-chain proof storage');
              // Still store the IPFS hash in DB
              db.run(
                'UPDATE contract_versions SET ipfs_hash = ? WHERE id = ?',
                [ipfsHash, versionId],
                (err) => {
                  if (err) console.error('[storeContractProof] Error updating DB:', err);
                  else console.log('[storeContractProof] IPFS hash stored in DB');
                }
              );
              return resolve({ ipfsHash, txHash: null });
            }

            // Check if contract is initialized on Solana - use stored PDA if available
            if (!contract.solana_contract_pda && (!contract.solana_contract_id || !contract.creator_wallet)) {
              console.warn('[storeContractProof] Contract not initialized on Solana, skipping on-chain update');
      db.run(
                'UPDATE contract_versions SET ipfs_hash = ? WHERE id = ?',
                [ipfsHash, versionId],
                (err) => {
                  if (err) console.error('[storeContractProof] Error updating DB:', err);
                  else console.log('[storeContractProof] IPFS hash stored in DB (not on-chain)');
                }
      );
              return resolve({ ipfsHash, txHash: null, warning: 'Contract not on-chain' });
    }
    
            // Update IPFS hash on-chain - use stored PDA if available, otherwise derive it
            console.log('[storeContractProof] Updating IPFS hash on Solana...');
            let contractPDA = contract.solana_contract_pda;
            
            // If no PDA stored, derive it (for backwards compatibility)
            if (!contractPDA && contract.solana_contract_id && contract.creator_wallet) {
              const { deriveContractPDA } = await import('../services/solanaService.js');
              contractPDA = deriveContractPDA(contract.solana_contract_id, contract.creator_wallet);
              console.log('[storeContractProof] Derived PDA:', contractPDA);
            }
            
            if (!contractPDA) {
              console.warn('[storeContractProof] No contract PDA available, skipping on-chain update');
              db.run(
                'UPDATE contract_versions SET ipfs_hash = ? WHERE id = ?',
                [ipfsHash, versionId],
                (err) => {
                  if (err) console.error('[storeContractProof] Error updating DB:', err);
                  else console.log('[storeContractProof] IPFS hash stored in DB (no PDA)');
                }
              );
              return resolve({ ipfsHash, txHash: null, warning: 'No contract PDA' });
            }
            
            const result = await updateContractIpfsOnChainByPDA(
              contractPDA,
              ipfsHash,
              signerPrivateKey
            );
            console.log('[storeContractProof] On-chain update successful, signature:', result.signature);
    
            // Update database with IPFS hash and transaction hash
    db.run(
              'UPDATE contract_versions SET ipfs_hash = ?, onchain_tx_hash = ? WHERE id = ?',
              [ipfsHash, result.signature, versionId],
              (err) => {
                if (err) console.error('[storeContractProof] Error updating DB with tx hash:', err);
                else console.log('[storeContractProof] Database updated with IPFS and tx hash');
              }
    );
    
            return resolve({ ipfsHash, txHash: result.signature });
    
  } catch (error) {
    console.error('[storeContractProof] Error storing contract proof:', error);
            return resolve({ ipfsHash: null, txHash: null, error: error.message });
          }
        }
      );
    } catch (error) {
      console.error('[storeContractProof] Error in storeContractProof:', error);
      return resolve({ ipfsHash: null, txHash: null, error: error.message });
  }
  });
}

// Create new version
router.post('/contracts/:contractId/versions', authenticateToken, (req, res) => {
  const { contractId } = req.params;
  const { content, commit_message } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content required' });
  }

  // Verify contract exists and user has access
  db.get(
    'SELECT * FROM contracts WHERE id = ? AND (created_by = ? OR id IN (SELECT contract_id FROM contract_members WHERE user_id = ?))',
    [contractId, req.user.userId, req.user.userId],
    (err, contract) => {
      if (err || !contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Get latest version
      db.get(
        'SELECT * FROM contract_versions WHERE contract_id = ? ORDER BY version_number DESC LIMIT 1',
        [contractId],
        (err, latestVersion) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          const versionNumber = latestVersion ? latestVersion.version_number + 1 : 1;
          const versionId = uuidv4();
          const parentVersionId = latestVersion ? latestVersion.id : null;

          // Compute diff
          const oldContent = latestVersion ? latestVersion.content : '';
          const diff = computeDiff(oldContent, content);

          // Create version
          db.run(
            `INSERT INTO contract_versions 
             (id, contract_id, version_number, parent_version_id, author_id, content, diff_summary, commit_message, merged, approval_status, approval_score)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [versionId, contractId, versionNumber, parentVersionId, req.user.userId, content, diff.summary, commit_message || '', 0, 'pending', 0],
            function(err) {
              if (err) {
                console.error('Error creating version:', err);
                return res.status(500).json({ error: 'Failed to create version' });
              }

              // Create diff record if parent exists
              if (latestVersion) {
                const diffId = uuidv4();
                db.run(
                  'INSERT INTO contract_diffs (id, version_from_id, version_to_id, diff_json) VALUES (?, ?, ?, ?)',
                  [diffId, latestVersion.id, versionId, JSON.stringify(diff.full)]
                );
              }

              // Update contract's current version and content
              db.run(
                'UPDATE contracts SET current_version = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [versionId, content, contractId]
              );

              // Add automatic approval from the author (all changes are auto-approved by their author)
              const approvalId = uuidv4();
              db.run(
                'INSERT INTO contract_approvals (id, version_id, user_id, vote, comment) VALUES (?, ?, ?, ?, ?)',
                [approvalId, versionId, req.user.userId, 'approve', 'Auto-approved by author'],
                function(err) {
                  if (err) {
                    console.error('[CREATE_VERSION] Error creating auto-approval:', err);
                  }

                  // Update version status to approved
                  console.log('[CREATE_VERSION] Auto-approving version', versionId);
                  db.run(
                    'UPDATE contract_versions SET approval_status = ?, approval_score = ? WHERE id = ?',
                    ['approved', 1, versionId]
                  );

                  // Return created version
                  db.get(
                    `SELECT v.*, u.name as author_name
                     FROM contract_versions v
                     JOIN users u ON v.author_id = u.id
                     WHERE v.id = ?`,
                    [versionId],
                    (err, version) => {
                      if (err) {
                        console.error('[CREATE_VERSION] Error fetching created version:', err);
                        return res.status(500).json({ error: 'Database error' });
                      }
                      console.log('[CREATE_VERSION] Version created with status:', version.approval_status);
                      // Add default values for approval fields
                      const versionWithDefaults = {
                        ...version,
                        approval_status: version.approval_status || 'approved',
                        approval_score: version.approval_score || 1
                      };
                      res.json({ version: versionWithDefaults });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get all versions for a contract
router.get('/contracts/:contractId/versions', authenticateToken, (req, res) => {
  const { contractId } = req.params;

  // Verify contract access
  db.get(
    'SELECT * FROM contracts WHERE id = ? AND (created_by = ? OR id IN (SELECT contract_id FROM contract_members WHERE user_id = ?))',
    [contractId, req.user.userId, req.user.userId],
    (err, contract) => {
      if (err || !contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      db.all(
        `SELECT v.*, u.name as author_name
         FROM contract_versions v
         JOIN users u ON v.author_id = u.id
         WHERE v.contract_id = ?
         ORDER BY v.version_number DESC`,
        [contractId],
        (err, versions) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          // Add default values for approval fields if they don't exist
          const versionsWithDefaults = versions.map(v => ({
            ...v,
            approval_status: v.approval_status || 'pending',
            approval_score: v.approval_score || 0
          }));
          res.json({ versions: versionsWithDefaults });
        }
      );
    }
  );
});

// Get specific version
router.get('/contracts/:contractId/versions/:versionId', authenticateToken, (req, res) => {
  const { contractId, versionId } = req.params;

  // Verify contract access
  db.get(
    'SELECT * FROM contracts WHERE id = ? AND (created_by = ? OR id IN (SELECT contract_id FROM contract_members WHERE user_id = ?))',
    [contractId, req.user.userId, req.user.userId],
    (err, contract) => {
      if (err || !contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      db.get(
        `SELECT v.*, u.name as author_name, u.wallet_address as author_wallet
         FROM contract_versions v
         JOIN users u ON v.author_id = u.id
         WHERE v.id = ? AND v.contract_id = ?`,
        [versionId, contractId],
        (err, version) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          if (!version) {
            return res.status(404).json({ error: 'Version not found' });
          }
          // Add default values for approval fields if they don't exist
          const versionWithDefaults = {
            ...version,
            approval_status: version.approval_status || 'pending',
            approval_score: version.approval_score || 0
          };
          res.json({ version: versionWithDefaults });
        }
      );
    }
  );
});

// Get diff between two versions
router.get('/contracts/:contractId/diff', authenticateToken, (req, res) => {
  const { contractId } = req.params;
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'Both from and to version IDs required' });
  }

  // Verify contract access
  db.get(
    'SELECT * FROM contracts WHERE id = ? AND (created_by = ? OR id IN (SELECT contract_id FROM contract_members WHERE user_id = ?))',
    [contractId, req.user.userId, req.user.userId],
    (err, contract) => {
      if (err || !contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Get the two versions
      db.all(
        'SELECT * FROM contract_versions WHERE id IN (?, ?) AND contract_id = ? ORDER BY version_number',
        [from, to, contractId],
        (err, versions) => {
          if (err || versions.length !== 2) {
            return res.status(404).json({ error: 'Versions not found' });
          }

          const [v1, v2] = versions;
          const diff = computeDiff(v1.content, v2.content);

          res.json({
            from: v1,
            to: v2,
            diff: diff.full,
            summary: diff.summary
          });
        }
      );
    }
  );
});

// Get contract history
router.get('/contracts/:contractId/history', authenticateToken, (req, res) => {
  const { contractId } = req.params;

  // Verify contract access
  db.get(
    'SELECT * FROM contracts WHERE id = ? AND (created_by = ? OR id IN (SELECT contract_id FROM contract_members WHERE user_id = ?))',
    [contractId, req.user.userId, req.user.userId],
    (err, contract) => {
      if (err || !contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      db.all(
        `SELECT v.id, v.version_number, v.commit_message, v.diff_summary, v.created_at, v.merged, v.content, v.approval_status,
         v.contract_hash, v.onchain_tx_hash,
         u.name as author_name, u.email as author_email
         FROM contract_versions v
         JOIN users u ON v.author_id = u.id
         WHERE v.contract_id = ? AND v.merged = 1
         ORDER BY v.version_number DESC`,
        [contractId],
        (err, history) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ history });
        }
      );
    }
  );
});

// Submit approval/rejection for a version
router.post('/contracts/:contractId/versions/:versionId/approve', authenticateToken, (req, res) => {
  const { contractId, versionId } = req.params;
  const { vote, comment } = req.body;

  if (!vote || !['approve', 'reject'].includes(vote)) {
    return res.status(400).json({ error: 'Valid vote (approve/reject) required' });
  }

  // Verify contract access
  db.get(
    'SELECT * FROM contracts WHERE id = ? AND (created_by = ? OR id IN (SELECT contract_id FROM contract_members WHERE user_id = ?))',
    [contractId, req.user.userId, req.user.userId],
    (err, contract) => {
      if (err || !contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Check if user is a member of this contract
      db.get(
        'SELECT * FROM contract_members WHERE contract_id = ? AND user_id = ?',
        [contractId, req.user.userId],
        (err, member) => {
          if (err || !member) {
            return res.status(403).json({ error: 'Not a member of this contract' });
          }

          // Check if the user is trying to vote on their own version
          db.get(
            'SELECT author_id FROM contract_versions WHERE id = ?',
            [versionId],
            (err, version) => {
              if (err || !version) {
                return res.status(404).json({ error: 'Version not found' });
              }

              // Prevent user from voting on their own changes
              if (version.author_id === req.user.userId) {
                return res.status(403).json({ error: 'Your changes are automatically approved. You cannot vote on your own changes.' });
              }

              const approvalId = uuidv4();
              // Insert or update approval
              db.run(
            `INSERT INTO contract_approvals (id, version_id, user_id, vote, comment)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(version_id, user_id) DO UPDATE SET
             vote = excluded.vote,
             comment = excluded.comment,
             created_at = CURRENT_TIMESTAMP`,
            [approvalId, versionId, req.user.userId, vote, comment || null],
            function(err) {
              if (err) {
                console.error('Error creating approval:', err);
                return res.status(500).json({ error: 'Failed to submit approval' });
              }

              // Get total member count
              db.get(
                'SELECT COUNT(*) as total FROM contract_members WHERE contract_id = ?',
                [contractId],
                (err, memberCount) => {
                  if (err) {
                    return res.status(500).json({ error: 'Database error' });
                  }

                  const totalMembers = memberCount.total;

                  // Recalculate approval score (simple count)
                  db.all(
                    `SELECT ca.vote
                     FROM contract_approvals ca
                     WHERE ca.version_id = ?`,
                    [versionId],
                    (err, approvals) => {
                      if (err) {
                        return res.status(500).json({ error: 'Database error' });
                      }

                      let approvalCount = 0;
                      let rejectionCount = 0;

                      approvals.forEach(approval => {
                        if (approval.vote === 'approve') {
                          approvalCount++;
                        } else {
                          rejectionCount++;
                        }
                      });

                      // Determine status - requires at least 1 approval
                      let newStatus = 'pending';
                      if (approvalCount > 0) {
                        newStatus = 'approved';
                      } else if (rejectionCount > 0) {
                        newStatus = 'rejected';
                      }

                      // Auto-merge if all members approved (100%)
                      const shouldAutoMerge = approvalCount === totalMembers && approvalCount > 0;
                      console.log('[APPROVE] Approval check - approvalCount:', approvalCount, 'totalMembers:', totalMembers, 'shouldAutoMerge:', shouldAutoMerge);

                      // Update version status
                      db.run(
                        'UPDATE contract_versions SET approval_status = ?, approval_score = ? WHERE id = ?',
                        [newStatus, approvalCount, versionId],
                        function(err) {
                          if (err) {
                            return res.status(500).json({ error: 'Failed to update version status' });
                          }

                          // Auto-merge if 100% approval
                          if (shouldAutoMerge) {
                            console.log('[APPROVE] Auto-merging version due to 100% approval');
                            db.get(
                              'SELECT v.content, v.author_id, u.wallet_address as author_wallet FROM contract_versions v JOIN users u ON v.author_id = u.id WHERE v.id = ?',
                              [versionId],
                              async (err, version) => {
                                if (err) {
                                  console.error('[APPROVE] Error fetching version:', err);
                                  return res.status(500).json({ error: 'Database error' });
                                }

                                console.log('[APPROVE] Version fetched, updating contract...');

                                // Update contract's current version and content
                                db.run(
                                  'UPDATE contracts SET current_version = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                                  [versionId, version.content, contractId],
                                  function(err) {
                                    if (err) {
                                      console.error('[APPROVE] Error updating contract:', err);
                                      return res.status(500).json({ error: 'Failed to update contract' });
                                    }

                                    console.log('[APPROVE] Contract updated, marking as merged...');

                                    // Mark version as merged
                                    db.run(
                                      'UPDATE contract_versions SET approval_status = ?, merged = 1 WHERE id = ?',
                                      ['merged', versionId],
                                      async function(err) {
                                        if (err) {
                                          console.error('[APPROVE] Error marking as merged:', err);
                                          return res.status(500).json({ error: 'Failed to update version status' });
                                        }

                                        console.log('[APPROVE] Calling storeContractProof...');
                                        // Store contract proof on-chain using IPFS
                                        const proofResult = await storeContractProof(versionId, version.content, contractId);
                                        console.log('[APPROVE] storeContractProof result:', proofResult);

                                        res.json({
                                          approval: {
                                            id: approvalId,
                                            version_id: versionId,
                                            user_id: req.user.userId,
                                            vote,
                                            comment
                                          },
                                          approval_count: approvalCount,
                                          rejection_count: rejectionCount,
                                          status: 'merged',
                                          auto_merged: true,
                                          onchain_proof: {
                                            ipfs_hash: proofResult.ipfsHash,
                                            tx_hash: proofResult.txHash,
                                            error: proofResult.error,
                                            warning: proofResult.warning
                                          }
                                        });
                                      }
                                    );
                                  }
                                );
                              }
                            );
                          } else {
                            console.log('[APPROVE] Not auto-merging - returning approval response');
                            res.json({
                              approval: {
                                id: approvalId,
                                version_id: versionId,
                                user_id: req.user.userId,
                                vote,
                                comment
                              },
                              approval_count: approvalCount,
                              rejection_count: rejectionCount,
                              status: newStatus
                            });
                          }
                        }
                      );
                    }
                  );
                }
              );
            }
          );
          }
        );
      }
    );
  }
);
});

// Get all approvals for a version
router.get('/contracts/:contractId/versions/:versionId/approvals', authenticateToken, (req, res) => {
  const { contractId, versionId } = req.params;

  // Verify contract access
  db.get(
    'SELECT * FROM contracts WHERE id = ? AND (created_by = ? OR id IN (SELECT contract_id FROM contract_members WHERE user_id = ?))',
    [contractId, req.user.userId, req.user.userId],
    (err, contract) => {
      if (err || !contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      db.all(
        `SELECT ca.*, u.name as user_name, u.email as user_email
         FROM contract_approvals ca
         JOIN users u ON ca.user_id = u.id
         WHERE ca.version_id = ?
         ORDER BY ca.created_at DESC`,
        [versionId],
        (err, approvals) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Get version info
          db.get(
            'SELECT approval_status, approval_score FROM contract_versions WHERE id = ?',
            [versionId],
            (err, version) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              res.json({
                approvals,
                status: version.approval_status,
                approval_count: approvals.filter(a => a.vote === 'approve').length,
                rejection_count: approvals.filter(a => a.vote === 'reject').length
              });
            }
          );
        }
      );
    }
  );
});

// Merge approved version into main contract based on on-chain completion
router.post('/contracts/:contractId/versions/:versionId/merge-onchain', authenticateToken, (req, res) => {
  const { contractId, versionId } = req.params;
  const { onchain_completed, current_approvals, required_approvals } = req.body;

  // Verify contract access
  db.get(
    'SELECT * FROM contracts WHERE id = ? AND (created_by = ? OR id IN (SELECT contract_id FROM contract_members WHERE user_id = ?))',
    [contractId, req.user.userId, req.user.userId],
    (err, contract) => {
      if (err || !contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Get version
      db.get(
        'SELECT v.*, u.wallet_address as author_wallet FROM contract_versions v JOIN users u ON v.author_id = u.id WHERE v.id = ? AND v.contract_id = ?',
        [versionId, contractId],
        (err, version) => {
          if (err || !version) {
            return res.status(404).json({ error: 'Version not found' });
          }

          // Check if already merged
          if (version.merged) {
            return res.json({ 
              merged: true,
              message: 'Version already merged'
            });
          }

          // Check if on-chain completion criteria met
          const approvalsMet = current_approvals >= required_approvals && required_approvals > 0;
          if (!onchain_completed && !approvalsMet) {
            return res.json({ 
              merged: false,
              message: 'Contract not completed on-chain yet',
              current_approvals,
              required_approvals
            });
          }

          // Update contract's current version and content
          db.run(
            'UPDATE contracts SET current_version = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [versionId, version.content, contractId],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to update contract' });
              }

              // Mark version as merged
              db.run(
                'UPDATE contract_versions SET approval_status = ?, merged = 1 WHERE id = ?',
                ['merged', versionId],
                async function(err) {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to update version status' });
                  }

                  // Store contract proof on-chain using IPFS
                  const proofResult = await storeContractProof(versionId, version.content, contractId);

                  res.json({ 
                    merged: true,
                    message: 'Version merged successfully',
                    onchain_proof: {
                      ipfs_hash: proofResult.ipfsHash,
                      tx_hash: proofResult.txHash,
                      error: proofResult.error,
                      warning: proofResult.warning
                    }
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Merge approved version into main contract
router.post('/contracts/:contractId/versions/:versionId/merge', authenticateToken, (req, res) => {
  const { contractId, versionId } = req.params;

  // Verify contract access
  db.get(
    'SELECT * FROM contracts WHERE id = ? AND (created_by = ? OR id IN (SELECT contract_id FROM contract_members WHERE user_id = ?))',
    [contractId, req.user.userId, req.user.userId],
    (err, contract) => {
      if (err || !contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Get version with author info
      db.get(
        'SELECT v.*, u.wallet_address as author_wallet FROM contract_versions v JOIN users u ON v.author_id = u.id WHERE v.id = ? AND v.contract_id = ?',
        [versionId, contractId],
        (err, version) => {
          if (err || !version) {
            return res.status(404).json({ error: 'Version not found' });
          }

          if (version.approval_status !== 'approved') {
            return res.status(400).json({ error: 'Version must be approved before merging' });
          }

          // Update contract's current version and content
          db.run(
            'UPDATE contracts SET current_version = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [versionId, version.content, contractId],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to update contract' });
              }

              // Mark version as merged
              db.run(
                'UPDATE contract_versions SET approval_status = ?, merged = 1 WHERE id = ?',
                ['merged', versionId],
                async function(err) {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to update version status' });
                  }

                  // Store contract proof on-chain using IPFS
                  const proofResult = await storeContractProof(versionId, version.content, contractId);

                  res.json({ 
                    message: 'Version merged successfully',
                    onchain_proof: {
                      ipfs_hash: proofResult.ipfsHash,
                      tx_hash: proofResult.txHash,
                      error: proofResult.error,
                      warning: proofResult.warning
                    }
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Add comment to a version
router.post('/contracts/:contractId/versions/:versionId/comments', authenticateToken, (req, res) => {
  const { contractId, versionId } = req.params;
  const { comment, parent_comment_id } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: 'Comment required' });
  }

  // Verify contract access
  db.get(
    'SELECT * FROM contracts WHERE id = ? AND (created_by = ? OR id IN (SELECT contract_id FROM contract_members WHERE user_id = ?))',
    [contractId, req.user.userId, req.user.userId],
    (err, contract) => {
      if (err || !contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      const commentId = uuidv4();
      db.run(
        'INSERT INTO contract_comments (id, version_id, user_id, comment, parent_comment_id) VALUES (?, ?, ?, ?, ?)',
        [commentId, versionId, req.user.userId, comment, parent_comment_id || null],
        function(err) {
          if (err) {
            console.error('Error creating comment:', err);
            return res.status(500).json({ error: 'Failed to add comment' });
          }

          // Return comment with user info
          db.get(
            `SELECT c.*, u.name as user_name, u.email as user_email
             FROM contract_comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.id = ?`,
            [commentId],
            (err, commentData) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }
              res.json({ comment: commentData });
            }
          );
        }
      );
    }
  );
});

// Get comments for a version
router.get('/contracts/:contractId/versions/:versionId/comments', authenticateToken, (req, res) => {
  const { contractId, versionId } = req.params;

  // Verify contract access
  db.get(
    'SELECT * FROM contracts WHERE id = ? AND (created_by = ? OR id IN (SELECT contract_id FROM contract_members WHERE user_id = ?))',
    [contractId, req.user.userId, req.user.userId],
    (err, contract) => {
      if (err || !contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      db.all(
        `SELECT c.*, u.name as user_name, u.email as user_email
         FROM contract_comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.version_id = ?
         ORDER BY c.created_at ASC`,
        [versionId],
        (err, comments) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          res.json({ comments });
        }
      );
    }
  );
});

export default router;

