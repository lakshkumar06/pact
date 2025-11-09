import { db } from './init.js';

export function migrateReputationScores() {
  db.serialize(() => {
    // User reputation scores table - stores computed reputation scores by role
    db.run(`CREATE TABLE IF NOT EXISTS user_reputation_scores (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      wallet_address TEXT,
      role_type TEXT NOT NULL CHECK (role_type IN ('client', 'vendor')),
      
      -- Client reputation metrics
      payment_timeliness_score DECIMAL(5,2) DEFAULT 0.0,
      payment_on_time_count INTEGER DEFAULT 0,
      payment_late_count INTEGER DEFAULT 0,
      payment_dispute_count INTEGER DEFAULT 0,
      
      -- Vendor reputation metrics
      delivery_timeliness_score DECIMAL(5,2) DEFAULT 0.0,
      delivery_on_time_count INTEGER DEFAULT 0,
      delivery_late_count INTEGER DEFAULT 0,
      delivery_quality_score DECIMAL(5,2) DEFAULT 0.0,
      
      -- Overall metrics
      total_contracts_as_client INTEGER DEFAULT 0,
      total_contracts_as_vendor INTEGER DEFAULT 0,
      total_value_handled DECIMAL(20,2) DEFAULT 0.0,
      
      -- Calculated overall score (0-100)
      overall_score DECIMAL(5,2) DEFAULT 0.0,
      
      last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(user_id, role_type),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`, (err) => {
      if (err) {
        console.error('Error creating user_reputation_scores table:', err);
      } else {
        console.log('✓ Created user_reputation_scores table');
      }
    });

    // Create index for faster lookups
    db.run(`CREATE INDEX IF NOT EXISTS idx_reputation_user_role ON user_reputation_scores(user_id, role_type)`, (err) => {
      if (err) {
        console.error('Error creating index:', err);
      } else {
        console.log('✓ Created index on user_reputation_scores');
      }
    });

    db.run(`CREATE INDEX IF NOT EXISTS idx_reputation_wallet ON user_reputation_scores(wallet_address)`, (err) => {
      if (err) {
        console.error('Error creating wallet index:', err);
      } else {
        console.log('✓ Created wallet index on user_reputation_scores');
      }
    });

    console.log('Reputation scores tables migrated successfully');
  });
}

