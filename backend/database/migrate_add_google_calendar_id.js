import { db } from './init.js';

// Add google_calendar_id column to users table
export function migrateAddGoogleCalendarId() {
  db.run(
    `ALTER TABLE users ADD COLUMN google_calendar_id TEXT`,
    (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding google_calendar_id column to users:', err);
      } else if (!err) {
        console.log('Added google_calendar_id column to users table');
      }
    }
  );

  console.log('Add google_calendar_id migration completed');
}
