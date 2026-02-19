const dynamicUIModel = require("../../model/dashboard/dynamicUIModel");

const getUIConfig = async (req, res) => {
  try {
    const { roleId } = req.params;
    const result = await dynamicUIModel.getUIConfigByRoleId(roleId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch UI config",
        error: error.message,
      });
  }
};

const updateUIConfig = async (req, res) => {
  try {
    const { role_id, configs } = req.body;

    if (!configs || !Array.isArray(configs)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid configs data" });
    }

    for (const config of configs) {
      await dynamicUIModel.saveUIConfig(
        role_id,
        config.page_key,
        config.element_key,
        config.custom_label,
        config.is_visible,
      );
    }

    res
      .status(200)
      .json({
        success: true,
        message: "UI configuration updated successfully",
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to update UI config",
        error: error.message,
      });
  }
};

module.exports = {
  getUIConfig,
  updateUIConfig,
};
