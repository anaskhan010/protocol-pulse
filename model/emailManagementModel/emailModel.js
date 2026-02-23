const db = require("../../config/dbConnection");

const getEmailType = () => {
  const query = "SELECT * FROM email_types";
  return db.query(query);
};

const getFrequency = () => {
  const query = "SELECT * FROM email_frequencies";
  return db.query(query);
};

const createSendEmailAlerts = (
  user_id,
  email_type_id,
  frequency_id,
  status,
  condtion,
  phase,
  locations,
  frequency_time,
  frequency_day,
  frequency_date,
) => {
  const query =
    "INSERT INTO send_email_alerts (user_id, email_type_id, frequency_id, status, condtion, phase, locations, frequency_time, frequency_day, frequency_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  return db.query(query, [
    user_id,
    email_type_id,
    frequency_id,
    status,
    condtion,
    phase,
    locations,
    frequency_time,
    frequency_day,
    frequency_date,
  ]);
};

const getSendEmailAlertsByUserId = (user_id) => {
  const query = "SELECT * FROM send_email_alerts WHERE user_id = ?";
  return db.query(query, [user_id]);
};

const getSendEmailAlertsById = (alert_id) => {
  const query = `
    SELECT 
      sea.*,
      u.user_name,
      u.first_name,
      u.last_name,
      u.email as user_email
    FROM send_email_alerts sea
    LEFT JOIN users u ON sea.user_id = u.user_id
    WHERE sea.alert_id = ?
  `;
  return db.query(query, [alert_id]);
};

const getAllSendEmailAlerts = () => {
  const query = `
    SELECT 
      sea.*,
      u.user_name,
      u.first_name,
      u.last_name,
      u.email as user_email
    FROM send_email_alerts sea
    LEFT JOIN users u ON sea.user_id = u.user_id
  `;
  return db.query(query);
};

const updateSendEmailAlerts = (
  alert_id,
  user_id,
  email_type_id,
  frequency_id,
  status,
  condtion,
  phase,
  locations,
  frequency_time,
  frequency_day,
  frequency_date,
) => {
  const query =
    "UPDATE send_email_alerts SET user_id = ?, email_type_id = ?, frequency_id = ?, status = ?, condtion = ?, phase = ?, locations = ?, frequency_time = ?, frequency_day = ?, frequency_date = ? WHERE alert_id = ?";
  return db.query(query, [
    user_id,
    email_type_id,
    frequency_id,
    status,
    condtion,
    phase,
    locations,
    frequency_time,
    frequency_day,
    frequency_date,
    alert_id,
  ]);
};

const deleteSendEmailAlerts = (alert_id) => {
  const query = "DELETE FROM send_email_alerts WHERE alert_id = ?";
  return db.query(query, [alert_id]);
};

const getAllConditions = (search = "", limit = 20, offset = 0) => {
  let query =
    "SELECT DISTINCT conditions FROM studies_condition WHERE conditions IS NOT NULL AND conditions != ''";
  const params = [];

  if (search) {
    query += " AND conditions LIKE ?";
    params.push(`%${search}%`);
  }

  query += " LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  return db.query(query, params);
};

const getActiveEmailAlertsByType = (email_type_id) => {
  const query = `
    SELECT 
      sea.*,
      u.user_name,
      u.first_name,
      u.last_name,
      u.email as user_email
    FROM send_email_alerts sea
    LEFT JOIN users u ON sea.user_id = u.user_id
    WHERE sea.email_type_id = ? AND sea.status = 'Active'
  `;
  return db.query(query, [email_type_id]);
};

const updateLastSentAt = (alert_id) => {
  const query =
    "UPDATE send_email_alerts SET last_sent_at = NOW() WHERE alert_id = ?";
  return db.query(query, [alert_id]);
};

const logEmail = (recipient_email, subject, email_type) => {
  const query =
    "INSERT INTO email_logs (recipient_email, subject, email_type) VALUES (?, ?, ?)";
  return db.query(query, [recipient_email, subject, email_type]);
};

const getUniquePhases = async (search = "", limit = 20, offset = 0) => {
  let query =
    "SELECT DISTINCT phase FROM studies WHERE phase IS NOT NULL AND phase != ''";
  const params = [];

  if (search) {
    query += " AND phase LIKE ?";
    params.push(`%${search}%`);
  }

  query += " LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await db.query(query, params);
  const phases = new Set();
  rows.forEach((row) => {
    if (row.phase) {
      row.phase.split(",").forEach((p) => {
        const trimmed = p.trim();
        if (
          trimmed &&
          (!search || trimmed.toLowerCase().includes(search.toLowerCase()))
        ) {
          phases.add(trimmed);
        }
      });
    }
  });
  return Array.from(phases).sort();
};

const getUniqueLocations = async (search = "", limit = 20, offset = 0) => {
  let query =
    "SELECT DISTINCT locations FROM studies WHERE locations IS NOT NULL AND locations != ''";
  const params = [];

  if (search) {
    query += " AND locations LIKE ?";
    params.push(`%${search}%`);
  }

  query += " LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await db.query(query, params);
  const locations = new Set();
  rows.forEach((row) => {
    if (row.locations) {
      row.locations.split("|").forEach((l) => {
        const trimmed = l.trim();
        if (
          trimmed &&
          (!search || trimmed.toLowerCase().includes(search.toLowerCase()))
        ) {
          locations.add(trimmed);
        }
      });
    }
  });
  return Array.from(locations).sort();
};

module.exports = {
  getEmailType,
  getFrequency,
  createSendEmailAlerts,
  getSendEmailAlertsByUserId,
  getAllSendEmailAlerts,
  updateSendEmailAlerts,
  deleteSendEmailAlerts,
  getAllConditions,
  getActiveEmailAlertsByType,
  updateLastSentAt,
  logEmail,
  getUniquePhases,
  getUniqueLocations,
  getSendEmailAlertsById,
};
