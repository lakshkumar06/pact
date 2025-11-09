import { db } from './init.js';

// Add profile_description column to users table
export function migrateAddProfileDescription() {
  db.run(
    `ALTER TABLE users ADD COLUMN profile_description TEXT`,
    (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding profile_description column to users:', err);
      } else if (!err) {
        console.log('Added profile_description column to users table');
      }
    }
  );

  console.log('Add profile_description migration completed');
}
