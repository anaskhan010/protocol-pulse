const userModel = require("../../model/userModel/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const emailTemplate = require("../../email-template/emailTemplate");
const emailModel = require("../../model/emailManagementModel/emailModel");

const logoPath = `${process.env.BACKEND_URL}/assets/logo.png`;

const createUser = async (req, res) => {
  const {
    user_name,
    first_name,
    last_name,
    email,
    password,
    address,
    phone_number,
    role_id,
  } = req.body;

  console.log(req.body);

  try {
    const status = "Active";
    const hashedPassword = await bcrypt.hash(password, 10);

    const data = await userModel.createUsers(
      user_name,
      first_name,
      last_name,
      email,
      hashedPassword,
      address,
      phone_number,
      status,
      role_id,
    );

    const result = {
      user_id: data.user_id,
      user_name,
      first_name,
      last_name,
      email,
      address,
      phone_number,
      role_id,
      status,

      role_id: data.role_id,
    };

    try {
      const subject = "Welcome to Research Pulse";
      await emailTemplate.sendEmail({
        to: email,
        subject: subject,
        htmlBody: `
<div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:1500px;max-width:92%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e9ecf3;">

          <!-- Header -->
          <tr>
            <td style="background:#101649;padding:22px 24px;text-align:left;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:42px;height:42px;border-radius:10px;background:#ffffff1a;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;">
                  <img src="${logoPath}" />
                </div>
                <div style="color:#ffffff;">
                  <div style="font-size:18px;font-weight:700;line-height:1;">Research Pulse</div>
                  <div style="font-size:12px;opacity:0.85;margin-top:4px;">Welcome onboard</div>
                </div>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:26px 24px 8px 24px;color:#111827;">
              <h2 style="margin:0 0 10px 0;font-size:18px;line-height:1.4;">
                Hello ${first_name} ${last_name},
              </h2>

              <p style="margin:0 0 14px 0;font-size:14px;line-height:1.7;color:#374151;">
                Thank you for joining <strong style="color:#111827;">Research Pulse</strong>.
                Your account has been created successfully and you can now sign in anytime to access your dashboard.
              </p>

              <div style="margin:18px 0 8px 0;padding:14px;border:1px solid #eef0f6;border-radius:12px;background:#fbfbfe;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#374151;">
                  <strong style="color:#111827;">Login Email:</strong> ${email}<br/>
                  <strong style="color:#111827;">Password:</strong> ${password}<br/>
                  <strong style="color:#111827;">Account Status:</strong> Active
                </p>
              </div>

              
            </td>
          </tr>

         

          <!-- Footer -->
          <tr>
            <td style="padding:18px 24px;background:#f9fafb;border-top:1px solid #eef0f6;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                Need help? Reply to this email and our team will assist you.<br/>
                <span style="color:#9ca3af;">© ${new Date().getFullYear()} Research Pulse. All rights reserved.</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</div>
`,
      });
      await emailModel.logEmail(email, subject, "Welcome Email");
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError.message);
      // Continue execution - do not fail user creation
    }

    res.status(200).json({
      success: true,
      message: "User created successfully",
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "User not created",
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // check getUserbyId check if user status is active
    if (user.status !== "Active") {
      return res.status(401).json({
        success: false,
        message: "User is not active",
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        role_id: user.role_id,
        role_name: user.role_name,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      user,
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "User not logged in",
      error: error.message,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Users not fetched",
      error: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  const { user_id } = req.params;
  try {
    const user = await userModel.getUserById(user_id);
    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "User not fetched",
      error: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  const { user_id } = req.params;
  const {
    user_name,
    first_name,
    last_name,
    email,
    password,
    address,
    phone_number,
    status,
    role_id,
  } = req.body;
  try {
    const user = await userModel.updateUser(
      user_id,
      user_name,
      first_name,
      last_name,
      email,
      password,
      address,
      phone_number,
      status,
      role_id,
    );
    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "User not updated",
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  const { user_id } = req.params;
  try {
    const user = await userModel.deleteUser(user_id);
    res.status(200).json({
      success: true,
      message: "User deleted successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "User not deleted",
      error: error.message,
    });
  }
};

module.exports = {
  createUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
