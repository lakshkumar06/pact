import { db } from './init.js';

// Add profile_links column to users table (JSON string)
export function migrateAddProfileLinks() {
  db.run(
    `ALTER TABLE users ADD COLUMN profile_links TEXT`,
    (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding profile_links column to users:', err);
      } else if (!err) {
        console.log('Added profile_links column to users table');
      }
    }
  );

  console.log('Add profile_links migration completed');
}
