const emailModel = require("../../model/emailManagementModel/emailModel");

const getEmailType = async (req, res) => {
  try {
    const [result] = await emailModel.getEmailType();
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getFrequency = async (req, res) => {
  try {
    const [result] = await emailModel.getFrequency();
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createSendEmailAlerts = async (req, res) => {
  let {
    user_id,
    email_type_id,
    frequency_id,
    condtion,
    phase,
    locations,
    frequency_time,
    frequency_day,
    frequency_date,
  } = req.body;
  const status = "Active";

  try {
    // Fetch frequencies to check code
    const [freqs] = await emailModel.getFrequency();
    const freq = freqs.find((f) => f.id === frequency_id);

    if (freq) {
      if (freq.code === "DAILY") {
        frequency_day = null;
        frequency_date = null;
      } else if (freq.code === "WEEKLY") {
        frequency_date = null;
      } else if (freq.code === "MONTHLY") {
        frequency_day = null;
      } else if (freq.code === "IMMEDIATE") {
        frequency_time = null;
        frequency_day = null;
        frequency_date = null;
      }
    }

    await emailModel.createSendEmailAlerts(
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
    );
    res.status(200).json({ message: "Email alerts created successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getSendEmailAlertsByUserId = async (req, res) => {
  const { user_id } = req.query;
  try {
    const [result] = user_id
      ? await emailModel.getSendEmailAlertsByUserId(user_id)
      : await emailModel.getAllSendEmailAlerts();
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getSendEmailAlertsById = async (req, res) => {
  const { alert_id } = req.params;
  try {
    const [result] = await emailModel.getSendEmailAlertsById(alert_id);
    if (result.length === 0) {
      return res.status(404).json({ message: "Email alert not found" });
    }
    res.status(200).json(result[0]);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateSendEmailAlerts = async (req, res) => {
  let {
    alert_id,
    user_id,
    email_type_id,
    frequency_id,
    condtion,
    phase,
    locations,
    frequency_time,
    frequency_day,
    frequency_date,
  } = req.body;
  const status = "Active";

  try {
    // Fetch frequencies to check code
    const [freqs] = await emailModel.getFrequency();
    const freq = freqs.find((f) => f.id === frequency_id);

    if (freq) {
      if (freq.code === "DAILY") {
        frequency_day = null;
        frequency_date = null;
      } else if (freq.code === "WEEKLY") {
        frequency_date = null;
      } else if (freq.code === "MONTHLY") {
        frequency_day = null;
      } else if (freq.code === "IMMEDIATE") {
        frequency_time = null;
        frequency_day = null;
        frequency_date = null;
      }
    }

    await emailModel.updateSendEmailAlerts(
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
    );
    res.status(200).json({ message: "Email alerts updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteSendEmailAlerts = async (req, res) => {
  const { alert_id } = req.body;
  try {
    await emailModel.deleteSendEmailAlerts(alert_id);
    res.status(200).json({ message: "Email alerts deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllConditions = async (req, res) => {
  const { search = "", page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const [result] = await emailModel.getAllConditions(search, limit, offset);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllPhases = async (req, res) => {
  const { search = "", page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const phases = await emailModel.getUniquePhases(search, limit, offset);
    res.json({ status: true, phases });
  } catch (err) {
    console.error("Error fetching phases:", err);
    res.status(500).json({ status: false, message: "Failed to fetch phases" });
  }
};

const getAllLocations = async (req, res) => {
  const { search = "", page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const locations = await emailModel.getUniqueLocations(
      search,
      limit,
      offset,
    );
    res.json({ status: true, locations });
  } catch (err) {
    console.error("Error fetching locations:", err);
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch locations" });
  }
};

module.exports = {
  getEmailType,
  getFrequency,
  createSendEmailAlerts,
  getSendEmailAlertsByUserId,
  updateSendEmailAlerts,
  deleteSendEmailAlerts,
  getAllConditions,
  getAllPhases,
  getAllLocations,
  getSendEmailAlertsById,
};
