const db = require("../../config/dbConnection");

const getUIConfigByRoleId = async (role_id) => {
  const query = `SELECT * FROM dynamic_ui_config WHERE role_id = ?`;
  const [result] = await db.execute(query, [role_id]);
  return result;
};

const saveUIConfig = async (
  role_id,
  page_key,
  element_key,
  custom_label,
  is_visible,
) => {
  // Check if config already exists
  const checkQuery = `SELECT id FROM dynamic_ui_config WHERE role_id = ? AND page_key = ? AND element_key = ?`;
  const [existing] = await db.execute(checkQuery, [
    role_id,
    page_key,
    element_key,
  ]);

  if (existing && existing.length > 0) {
    const updateQuery = `UPDATE dynamic_ui_config SET custom_label = ?, is_visible = ? WHERE id = ?`;
    const [result] = await db.execute(updateQuery, [
      custom_label,
      is_visible,
      existing[0].id,
    ]);
    return result;
  } else {
    const insertQuery = `INSERT INTO dynamic_ui_config (role_id, page_key, element_key, custom_label, is_visible, extra_config) VALUES (?, ?, ?, ?, ?, ?)`;
    const [result] = await db.execute(insertQuery, [
      role_id,
      page_key,
      element_key,
      custom_label,
      is_visible,
      null, // Default extra_config to null
    ]);
    return result;
  }
};

module.exports = {
  getUIConfigByRoleId,
  saveUIConfig,
};
