import { db } from './init.js';

// Add auth0_sub column to users table to record Auth0 subject IDs
export function migrateAddAuth0Sub() {
  db.run(
    `ALTER TABLE users ADD COLUMN auth0_sub TEXT`,
    (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding auth0_sub column to users:', err);
      } else if (!err) {
        console.log('Added auth0_sub column to users table');
      }
    }
  );

  console.log('Add auth0_sub migration completed');
}
