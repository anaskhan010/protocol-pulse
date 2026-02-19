const db = require("../../config/dbConnection");

const createRole = async (role_name) => {
  const query = `INSERT INTO role (role_name) VALUES (?)`;
  const [result] = await db.execute(query, [role_name]);
  return result;
};

const getAllRoles = async () => {
  const query = `SELECT * FROM role`;
  const [result] = await db.execute(query);
  return result;
};

const getRoleById = async (id) => {
  const query = `SELECT * FROM role WHERE id = ?`;
  const [result] = await db.execute(query, [id]);
  return result;
};

const updateRole = async (id, role_name) => {
  const query = `UPDATE role SET role_name = ? WHERE id = ?`;
  const [result] = await db.execute(query, [role_name, id]);
  return result;
};

const deleteRole = async (id) => {
  const query = `DELETE FROM role WHERE id = ?`;
  const [result] = await db.execute(query, [id]);
  return result;
};

// create Pages

const createPages = async (page_name, icon) => {
  const query = `INSERT INTO pages (page_name, icon) VALUES (?, ?)`;
  const [result] = await db.execute(query, [page_name, icon]);
  return result;
};

const getAllPages = async () => {
  const query = `SELECT * FROM pages ORDER BY sort_order ASC`;
  const [result] = await db.execute(query);
  return result;
};

const updatePages = async (id, page_name, icon) => {
  const query = `UPDATE pages SET page_name = ?, icon = ? WHERE id = ?`;
  const [result] = await db.execute(query, [page_name, icon, id]);
  return result;
};

const deletePages = async (id) => {
  const query = `DELETE FROM pages WHERE id = ?`;
  const [result] = await db.execute(query, [id]);
  return result;
};

const createUserRolePagePermission = async (
  role_id,
  page_id,
  can_view = false,
  can_add = false,
  can_edit = false,
  can_delete = false,
) => {
  const query = `INSERT INTO user_role_page_permision (role_id, page_id, can_view, can_add, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)`;
  const [result] = await db.execute(query, [
    role_id,
    page_id,
    can_view,
    can_add,
    can_edit,
    can_delete,
  ]);
  return result;
};

const getPermissionsByRoleId = async (role_id) => {
  const query = `
    SELECT 
      p.page_id, 
      p.page_name, 
      p.page_path,
      p.icon,
      p.sort_order,
      urpp.id as permission_id,
      urpp.can_view, 
      urpp.can_add, 
      urpp.can_edit, 
      urpp.can_delete 
    FROM pages p 
    LEFT JOIN user_role_page_permision urpp ON p.page_id = urpp.page_id AND urpp.role_id = ?
    ORDER BY p.sort_order ASC
  `;
  const [result] = await db.execute(query, [role_id]);
  return result;
};

const updatePermission = async (
  permission_id,
  can_view,
  can_add,
  can_edit,
  can_delete,
) => {
  const query = `UPDATE user_role_page_permision SET can_view = ?, can_add = ?, can_edit = ?, can_delete = ? WHERE id = ?`;
  const [result] = await db.execute(query, [
    can_view,
    can_add,
    can_edit,
    can_delete,
    permission_id,
  ]);
  return result;
};

const checkPermissionExists = async (role_id, page_id) => {
  const query = `SELECT id FROM user_role_page_permision WHERE role_id = ? AND page_id = ?`;
  const [result] = await db.execute(query, [role_id, page_id]);
  return result[0];
};

module.exports = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  createPages,
  getAllPages,
  updatePages,
  deletePages,
  createUserRolePagePermission,
  getPermissionsByRoleId,
  updatePermission,
  checkPermissionExists,
};
