const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "protocol-pulse",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 20, // Increased limit
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Try to increase max_allowed_packet for the session to handle large JSON payloads
pool
  .query("SET SESSION max_allowed_packet=67108864")
  .then(() => {
    return pool.query("SELECT @@session.max_allowed_packet as max_pkt");
  })
  .then(([rows]) => {
    console.log(`✅ DB Session max_allowed_packet: ${rows[0].max_pkt} bytes`);
  })
  .catch((err) => {
    console.warn(
      "⚠️ Could not increase session max_allowed_packet:",
      err.message,
    );
  });

pool.safeQuery = async (sql, params, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      const isTransient = [
        "ECONNRESET",
        "ETIMEDOUT",
        "PROTOCOL_CONNECTION_LOST",
        "EPIPE",
        "ER_LOCK_WAIT_TIMEOUT",
      ].includes(err.code);
      if (isTransient && i < retries - 1) {
        console.warn(
          `⚠️ DB Connection Issue (${err.code}). Retrying ${i + 1}/${retries}...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
};

module.exports = pool;
