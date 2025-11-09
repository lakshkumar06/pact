import { db } from './init.js';

export function migrateRemoveWeight() {
  db.serialize(() => {
    // Remove weight column from contract_members table
    // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
    db.run(`
      CREATE TABLE IF NOT EXISTS contract_members_new (
        id TEXT PRIMARY KEY,
        contract_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role_in_contract TEXT NOT NULL,
        approval_status TEXT DEFAULT 'pending',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contract_id) REFERENCES contracts(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating new contract_members table:', err);
      } else {
        console.log('✓ Created new contract_members table without weight');
        
        // Copy data from old table to new table
        db.run(`
          INSERT INTO contract_members_new (id, contract_id, user_id, role_in_contract, approval_status, joined_at)
          SELECT id, contract_id, user_id, role_in_contract, approval_status, joined_at
          FROM contract_members
        `, (err) => {
          if (err) {
            console.error('Error copying data to new contract_members table:', err);
          } else {
            console.log('✓ Copied data to new contract_members table');
            
            // Drop old table
            db.run('DROP TABLE contract_members', (err) => {
              if (err) {
                console.error('Error dropping old contract_members table:', err);
              } else {
                console.log('✓ Dropped old contract_members table');
                
                // Rename new table
                db.run('ALTER TABLE contract_members_new RENAME TO contract_members', (err) => {
                  if (err) {
                    console.error('Error renaming contract_members table:', err);
                  } else {
                    console.log('✓ Renamed contract_members_new to contract_members');
                  }
                });
              }
            });
          }
        });
      }
    });

    // Remove weight column from contract_invitations table
    db.run(`
      CREATE TABLE IF NOT EXISTS contract_invitations_new (
        id TEXT PRIMARY KEY,
        contract_id TEXT NOT NULL,
        email TEXT,
        wallet_address TEXT,
        role_in_contract TEXT NOT NULL,
        invitation_token TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired')),
        invited_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (contract_id) REFERENCES contracts(id),
        FOREIGN KEY (invited_by) REFERENCES users(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating new contract_invitations table:', err);
      } else {
        console.log('✓ Created new contract_invitations table without weight');
        
        // Copy data from old table to new table
        db.run(`
          INSERT INTO contract_invitations_new (id, contract_id, email, wallet_address, role_in_contract, invitation_token, status, invited_by, created_at, expires_at)
          SELECT id, contract_id, email, wallet_address, role_in_contract, invitation_token, status, invited_by, created_at, expires_at
          FROM contract_invitations
        `, (err) => {
          if (err) {
            console.error('Error copying data to new contract_invitations table:', err);
          } else {
            console.log('✓ Copied data to new contract_invitations table');
            
            // Drop old table
            db.run('DROP TABLE contract_invitations', (err) => {
              if (err) {
                console.error('Error dropping old contract_invitations table:', err);
              } else {
                console.log('✓ Dropped old contract_invitations table');
                
                // Rename new table
                db.run('ALTER TABLE contract_invitations_new RENAME TO contract_invitations', (err) => {
                  if (err) {
                    console.error('Error renaming contract_invitations table:', err);
                  } else {
                    console.log('✓ Renamed contract_invitations_new to contract_invitations');
                    console.log('Weight columns removed successfully');
                  }
                });
              }
            });
          }
        });
      }
    });
  });
}

