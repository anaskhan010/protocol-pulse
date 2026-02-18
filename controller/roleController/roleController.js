const roleModel = require("../../model/roleModel/roleModel");

const createRole = async (req, res) => {
  try {
    const { name } = req.body;
    const result = await roleModel.createRole(name);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllRoles = async (req, res) => {
  try {
    const result = await roleModel.getAllRoles();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await roleModel.getRoleById(id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const result = await roleModel.updateRole(id, name);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await roleModel.deleteRole(id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const createPages = async (req, res) => {
  try {
    const { name, icon } = req.body;
    const result = await roleModel.createPages(name, icon);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllPages = async (req, res) => {
  try {
    const result = await roleModel.getAllPages();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const updatePages = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon } = req.body;
    const result = await roleModel.updatePages(id, name, icon);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const deletePages = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await roleModel.deletePages(id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const result = await roleModel.getPermissionsByRoleId(roleId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const saveRolePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;

    for (const perm of permissions) {
      if (perm.permission_id) {
        await roleModel.updatePermission(
          perm.permission_id,
          perm.can_view,
          perm.can_add,
          perm.can_edit,
          perm.can_delete,
        );
      } else {
        const existing = await roleModel.checkPermissionExists(
          perm.role_id,
          perm.page_id,
        );
        if (existing) {
          await roleModel.updatePermission(
            existing.id,
            perm.can_view,
            perm.can_add,
            perm.can_edit,
            perm.can_delete,
          );
        } else {
          await roleModel.createUserRolePagePermission(
            perm.role_id,
            perm.page_id,
            perm.can_view,
            perm.can_add,
            perm.can_edit,
            perm.can_delete,
          );
        }
      }
    }
    res
      .status(200)
      .json({ success: true, message: "Permissions updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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

  getRolePermissions,
  saveRolePermissions,
};
