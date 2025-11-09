import express from 'express';
import { authenticateToken } from './auth.js';
import { 
  getReputationScores, 
  getReputationByWallet, 
  calculateReputationScores,
  recalculateReputation 
} from '../services/reputationService.js';

const router = express.Router();

// Get reputation scores for current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const scores = await getReputationScores(req.user.userId);
    res.json({ reputation: scores });
  } catch (error) {
    console.error('Error fetching reputation:', error);
    res.status(500).json({ error: 'Failed to fetch reputation scores' });
  }
});

// Get reputation scores for a specific user by ID (public endpoint for invitations)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Auto-calculate reputation if it doesn't exist
    const scores = await getReputationScores(userId, null, true);
    res.json({ reputation: scores });
  } catch (error) {
    console.error('Error fetching reputation:', error);
    // Return empty reputation instead of error for invitations
    res.json({ reputation: { client: null, vendor: null } });
  }
});

// Get reputation scores by wallet address (for invitations)
router.get('/wallet/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const scores = await getReputationByWallet(walletAddress);
    res.json({ reputation: scores });
  } catch (error) {
    console.error('Error fetching reputation by wallet:', error);
    res.status(500).json({ error: 'Failed to fetch reputation scores' });
  }
});

// Calculate/recalculate reputation for current user
router.post('/calculate', authenticateToken, async (req, res) => {
  try {
    const { roleType } = req.body;
    
    if (roleType && !['client', 'vendor'].includes(roleType)) {
      return res.status(400).json({ error: 'Invalid role type. Must be "client" or "vendor"' });
    }

    if (roleType) {
      const scores = await calculateReputationScores(req.user.userId, roleType);
      res.json({ reputation: { [roleType]: scores } });
    } else {
      // Calculate both
      const scores = await recalculateReputation(req.user.userId);
      res.json({ reputation: scores });
    }
  } catch (error) {
    console.error('Error calculating reputation:', error);
    res.status(500).json({ error: 'Failed to calculate reputation scores' });
  }
});

export default router;

