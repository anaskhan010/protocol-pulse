const dashboardModel = require("../../model/dashboard/dashboardModel");

const getDashboardStats = async (req, res) => {
  try {
    const [studiesResult] = await dashboardModel.countAllStudies();
    const [usersResult] = await dashboardModel.countAllUsers();
    const [emailsResult] = await dashboardModel.countAllEmailsSent();

    res.status(200).json({
      success: true,
      data: {
        total_studies: studiesResult[0].total_studies,
        total_users: usersResult[0].total_users,
        total_emails: emailsResult[0].total_emails,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
};
