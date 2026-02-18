const express = require("express");

const userController = require("../../controller/userController/userController");
const authMiddleware = require("../../middlerware/authMiddleware/Auth");
const router = express.Router();

router.post("/create-user", userController.createUser);
router.post("/login", userController.loginUser);
// Middleware applied to routes defined after this
router.use(authMiddleware);

router.get("/get-all-users", userController.getAllUsers);
router.get("/get-user/:user_id", userController.getUserById);
router.put("/update-user/:user_id", userController.updateUser);
router.delete("/delete-user/:user_id", userController.deleteUser);

module.exports = router;
