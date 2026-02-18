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

const updateSendEmailAlerts = async (req, res) => {
  let {
    alert_id,
    user_id,
    email_type_id,
    frequency_id,
    condtion,
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
  try {
    const [result] = await emailModel.getAllConditions();
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
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
};
