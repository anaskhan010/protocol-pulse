const db = require("../../config/dbConnection");

const countAllStudies = () => {
  const query = `SELECT COUNT(*) as total_studies FROM studies`;
  return db.query(query);
};

const countAllUsers = () => {
  const query = `SELECT COUNT(*) as total_users FROM users`;
  return db.query(query);
};

const countAllEmailsSent = () => {
  const query = `SELECT COUNT(*) as total_emails FROM email_logs`;
  return db.query(query);
};

module.exports = {
  countAllStudies,
  countAllUsers,
  countAllEmailsSent,
};
