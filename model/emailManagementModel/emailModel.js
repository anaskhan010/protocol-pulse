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
  frequency_time,
  frequency_day,
  frequency_date,
) => {
  const query =
    "INSERT INTO send_email_alerts (user_id, email_type_id, frequency_id, status, condtion, frequency_time, frequency_day, frequency_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  return db.query(query, [
    user_id,
    email_type_id,
    frequency_id,
    status,
    condtion,
    frequency_time,
    frequency_day,
    frequency_date,
  ]);
};

const getSendEmailAlertsByUserId = (user_id) => {
  const query = "SELECT * FROM send_email_alerts WHERE user_id = ?";
  return db.query(query, [user_id]);
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
  frequency_time,
  frequency_day,
  frequency_date,
) => {
  const query =
    "UPDATE send_email_alerts SET user_id = ?, email_type_id = ?, frequency_id = ?, status = ?, condtion = ?, frequency_time = ?, frequency_day = ?, frequency_date = ? WHERE alert_id = ?";
  return db.query(query, [
    user_id,
    email_type_id,
    frequency_id,
    status,
    condtion,
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

const getAllConditions = () => {
  const query = "SELECT conditions FROM studies_condition";
  return db.query(query);
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
};
