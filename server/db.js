import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_HOST = process.env.MYSQL_HOST || "localhost";
const DB_PORT = Number(process.env.MYSQL_PORT || 3306);
const DB_USER = process.env.MYSQL_USER || "root";
const DB_PASSWORD = process.env.MYSQL_PASSWORD || "";
const DB_NAME = process.env.MYSQL_DATABASE || "civic_resolve";

let pool;

export async function initializeDatabase() {
  if (pool) {
    return;
  }

  const setupConnection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  await setupConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await setupConnection.end();

  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('citizen', 'politician') NOT NULL,
      status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
      area VARCHAR(120) NOT NULL,
      language VARCHAR(10) NOT NULL DEFAULT 'en',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS issues (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(60) NOT NULL,
      area VARCHAR(120) NOT NULL,
      location VARCHAR(255) NOT NULL,
      latitude VARCHAR(40) DEFAULT '',
      longitude VARCHAR(40) DEFAULT '',
      status ENUM('Pending', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Pending',
      citizen_id INT NOT NULL,
      citizen_name VARCHAR(120) NOT NULL,
      assigned_role VARCHAR(40) NOT NULL DEFAULT 'politician',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS issue_media (
      id INT AUTO_INCREMENT PRIMARY KEY,
      issue_id INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_url VARCHAR(255) NOT NULL,
      mime_type VARCHAR(120) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS issue_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      issue_id INT NOT NULL,
      author_id INT NOT NULL,
      author_name VARCHAR(120) NOT NULL,
      author_role VARCHAR(40) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS issue_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      issue_id INT NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(40) NOT NULL,
      actor VARCHAR(120) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS issue_upvotes (
      issue_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (issue_id, user_id),
      FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'Pending',
      flagged BOOLEAN NOT NULL DEFAULT FALSE,
      moderator_note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS moderation_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      actor VARCHAR(120) NOT NULL,
      target VARCHAR(255) NOT NULL,
      action VARCHAR(80) NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS updates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      audience VARCHAR(80) NOT NULL DEFAULT 'public',
      author VARCHAR(120) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await seedData();
}

export function getPool() {
  if (!pool) {
    throw new Error("Database pool has not been initialized.");
  }
  return pool;
}

async function seedData() {
  const citizenEmail = "citizen@civicresolve.gov";
  const politicianEmail = "politician@civicresolve.gov";
  const [existingUsers] = await pool.query("SELECT email FROM users WHERE email IN (?, ?)", [
    citizenEmail,
    politicianEmail,
  ]);
  const existingEmails = new Set(existingUsers.map((user) => user.email));

  if (!existingEmails.has(citizenEmail)) {
    await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role, status, area, language)
      VALUES ('Citizen Demo', ?, ?, 'citizen', 'active', 'Central Ward', 'en')
      `,
      [citizenEmail, bcrypt.hashSync("User123", 10)]
    );
  }

  if (!existingEmails.has(politicianEmail)) {
    await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role, status, area, language)
      VALUES ('Politician Demo', ?, ?, 'politician', 'active', 'Central Ward', 'en')
      `,
      [politicianEmail, bcrypt.hashSync("Leader1", 10)]
    );
  }

  const [issueCountRows] = await pool.query("SELECT COUNT(*) AS count FROM issues");
  if (issueCountRows[0].count > 0) {
    return;
  }

  const [citizenRows] = await pool.query("SELECT id, name FROM users WHERE email = ?", [citizenEmail]);
  const [politicianRows] = await pool.query(
    "SELECT id, name FROM users WHERE email = ?",
    [politicianEmail]
  );

  if (!citizenRows.length || !politicianRows.length) {
    return;
  }

  const citizen = citizenRows[0];
  const politician = politicianRows[0];

  const [issueInsert] = await pool.query(
    `
    INSERT INTO issues
      (title, description, category, area, location, latitude, longitude, status, citizen_id, citizen_name, assigned_role)
    VALUES
      (?, ?, 'Electricity', 'Central Ward', 'Government School Road, Central Ward', '17.3850', '78.4867', 'In Progress', ?, ?, 'politician'),
      (?, ?, 'Water', 'North Zone', 'Main Bus Stand, North Zone', '17.4065', '78.4772', 'Pending', ?, ?, 'politician')
    `,
    [
      "Broken street lights near school",
      "Three street lights are not working near the government school.",
      citizen.id,
      citizen.name,
      "Water leakage near bus stand",
      "A pipeline leak is wasting water and flooding the road.",
      citizen.id,
      citizen.name,
    ]
  );

  const firstIssueId = issueInsert.insertId;
  const secondIssueId = firstIssueId + 1;

  await pool.query(
    `
    INSERT INTO issue_comments (issue_id, author_id, author_name, author_role, message)
    VALUES
      (?, ?, ?, 'politician', ?),
      (?, ?, ?, 'citizen', ?)
    `,
    [
      firstIssueId,
      politician.id,
      politician.name,
      "The electricity team has been informed and work has started.",
      secondIssueId,
      citizen.id,
      citizen.name,
      "The leak has become bigger after the rain.",
    ]
  );

  await pool.query(
    `
    INSERT INTO issue_history (issue_id, message, status, actor)
    VALUES
      (?, 'Issue created', 'Pending', ?),
      (?, 'Status changed to In Progress', 'In Progress', ?),
      (?, 'Issue created', 'Pending', ?)
    `,
    [firstIssueId, citizen.name, firstIssueId, politician.name, secondIssueId, citizen.name]
  );

  await pool.query(
    `
    INSERT INTO issue_upvotes (issue_id, user_id)
    VALUES (?, ?)
    `,
    [firstIssueId, politician.id]
  );

  await pool.query(
    `
    INSERT INTO notifications (user_id, message, is_read)
    VALUES
      (?, 'Your street light complaint is now In Progress.', FALSE),
      (?, 'A new electricity issue was reported in Central Ward.', FALSE),
      (?, 'A politician responded to your complaint.', TRUE)
    `,
    [citizen.id, politician.id, citizen.id]
  );

  const [feedbackCountRows] = await pool.query("SELECT COUNT(*) AS count FROM feedback");
  if (feedbackCountRows[0].count === 0) {
    await pool.query(
      `
      INSERT INTO feedback (name, email, message, status, flagged, moderator_note)
      VALUES
        ('Asha Kumar', 'asha@example.com', 'Please add more updates when complaints move to in-progress.', 'Pending', FALSE, ''),
        ('Rahul Dev', 'rahul@example.com', 'There was abuse in one of the replies and it should be reviewed.', 'Needs Review', TRUE, '')
      `
    );
  }

  const [updateCountRows] = await pool.query("SELECT COUNT(*) AS count FROM updates");
  if (updateCountRows[0].count === 0) {
    await pool.query(
      `
      INSERT INTO updates (title, content, audience, author)
      VALUES
        ('Street light repair started', 'Repair work has started for the reported street lights in Central Ward.', 'public', 'Politician Demo'),
        ('Water leak inspection scheduled', 'Inspection team will visit the North Zone bus stand area tomorrow morning.', 'public', 'Politician Demo')
      `
    );
  }
}
