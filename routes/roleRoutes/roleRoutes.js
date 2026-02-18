const express = require("express");
const router = express.Router();
const roleController = require("../../controller/roleController/roleController");

router.post("/create-role", roleController.createRole);
router.get("/get-all-roles", roleController.getAllRoles);
router.get("/get-role-by-id/:id", roleController.getRoleById);
router.put("/update-role/:id", roleController.updateRole);
router.delete("/delete-role/:id", roleController.deleteRole);

router.post("/create-pages", roleController.createPages);
router.get("/get-all-pages", roleController.getAllPages);
router.put("/update-pages/:id", roleController.updatePages);
router.delete("/delete-pages/:id", roleController.deletePages);

router.get("/get-role-permissions/:roleId", roleController.getRolePermissions);
router.post("/save-role-permissions", roleController.saveRolePermissions);

module.exports = router;
