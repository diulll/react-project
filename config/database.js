import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Enable verbose mode for debugging
sqlite3.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize SQLite database
// Database file will be created in the server directory
const dbPath = join(__dirname, '../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
    console.log(`📂 Database file: ${dbPath}`);
    initTables();
  }
});

function initTables() {
  const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  const postsTable = `
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `;

  // Serialize execution to ensure order
  db.serialize(() => {
    db.run(usersTable, (err) => {
      if (err) console.error('❌ Error creating users table:', err.message);
      else console.log('✅ Users table ready');
    });

    // Create index on email if not exists
    db.run("CREATE INDEX IF NOT EXISTS idx_email ON users(email)", (err) => {
        if(err) console.error("❌ Error creating index:", err.message);
    });

    db.run(postsTable, (err) => {
      if (err) console.error('❌ Error creating posts table:', err.message);
      else console.log('✅ Posts table ready');
    });
  });
}

// Promisified wrapper to match mysql2 pool interface
const pool = {
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const queryType = sql.trim().toUpperCase().split(' ')[0];

      if (queryType === 'SELECT') {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve([rows, []]); // Return mock fields array to match mysql2
        });
      } else {
        // INSERT, UPDATE, DELETE
        db.run(sql, params, function(err) {
          if (err) reject(err);
          else {
            // Match mysql2 result object structure
            const result = {
              insertId: this.lastID,
              affectedRows: this.changes,
              warningStatus: 0
            };
            resolve([result, []]); 
          }
        });
      }
    });
  },
  // Mock getConnection to support existing code that might use it
  getConnection: async () => {
    return {
      release: () => {},
      // If code uses connection.query directly
      query: (sql, params) => pool.query(sql, params),
      beginTransaction: () => Promise.resolve(),
      commit: () => Promise.resolve(),
      rollback: () => Promise.resolve()
    };
  }
};

// Test koneksi database
export async function testConnection() {
  return new Promise((resolve) => {
    db.get("SELECT 1", (err) => {
      if (err) {
        console.error('❌ Database connection failed:', err.message);
        resolve(false);
      } else {
        console.log('✅ Database connected successfully');
        resolve(true);
      }
    });
  });
}

export default pool;
