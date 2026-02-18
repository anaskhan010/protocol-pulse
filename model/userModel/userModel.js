const db = require("../../config/dbConnection");

const createUsers = async (
  user_name,
  first_name,
  last_name,
  email,
  password,
  address,
  phone_number,
  status,
  role_id,
) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const userQuery =
      "INSERT INTO users (user_name,first_name,last_name,email,password,address,phone_number,status) VALUES (?,?,?,?,?,?,?,?)";

    const userValues = [
      user_name,
      first_name,
      last_name,
      email,
      password,
      address,
      phone_number,
      status,
    ];

    const [userResult] = await conn.query(userQuery, userValues);
    const user_id = userResult.insertId;

    const roleQuery = "INSERT INTO user_role (user_id,role_id) VALUES (?,?)";
    await conn.query(roleQuery, [user_id, role_id]);

    await conn.commit();

    return { user_id, role_id };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const getAllUsers = async () => {
  const conn = await db.getConnection();

  try {
    const query = `
      SELECT u.*, r.role_id, r.role_name 
      FROM users u 
      LEFT JOIN user_role ur ON u.user_id = ur.user_id 
      LEFT JOIN role r ON ur.role_id = r.role_id
      ORDER BY u.created_at DESC
    `;
    const [result] = await conn.query(query);
    return result;
  } catch (error) {
    throw error;
  } finally {
    conn.release();
  }
};

const getUserByEmail = async (email) => {
  const conn = await db.getConnection();
  try {
    const query = `
      SELECT u.*, r.role_id, r.role_name 
      FROM users u 
      LEFT JOIN user_role ur ON u.user_id = ur.user_id 
      LEFT JOIN role r ON ur.role_id = r.role_id
      WHERE u.email = ?
    `;
    const [result] = await conn.query(query, [email]);
    return result[0];
  } catch (error) {
    throw error;
  } finally {
    conn.release();
  }
};

const getUserById = async (user_id) => {
  const conn = await db.getConnection();
  try {
    const query = `
      SELECT u.*, r.role_id, r.role_name 
      FROM users u 
      LEFT JOIN user_role ur ON u.user_id = ur.user_id 
      LEFT JOIN role r ON ur.role_id = r.role_id
      WHERE u.user_id = ?
    `;
    const [result] = await conn.query(query, [user_id]);
    return result[0];
  } catch (error) {
    throw error;
  } finally {
    conn.release();
  }
};

const updateUser = async (
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
) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let updateQuery =
      "UPDATE users SET user_name = ?, first_name = ?, last_name = ?, email = ?, address = ?, phone_number = ?, status = ? WHERE user_id = ?";
    let updateValues = [
      user_name,
      first_name,
      last_name,
      email,
      address,
      phone_number,
      status,
      user_id,
    ];

    if (password) {
      updateQuery =
        "UPDATE users SET user_name = ?, first_name = ?, last_name = ?, email = ?, password = ?, address = ?, phone_number = ?, status = ? WHERE user_id = ?";
      updateValues = [
        user_name,
        first_name,
        last_name,
        email,
        password,
        address,
        phone_number,
        status,
        user_id,
      ];
    }

    await conn.query(updateQuery, updateValues);

    // Update Role if provided
    if (role_id) {
      // Check if user has a role entry
      const [existingRole] = await conn.query(
        "SELECT * FROM user_role WHERE user_id = ?",
        [user_id],
      );

      if (existingRole.length > 0) {
        await conn.query("UPDATE user_role SET role_id = ? WHERE user_id = ?", [
          role_id,
          user_id,
        ]);
      } else {
        await conn.query(
          "INSERT INTO user_role (user_id, role_id) VALUES (?, ?)",
          [user_id, role_id],
        );
      }
    }

    await conn.commit();
    return { user_id, ...updateValues, role_id }; // Return updated data
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

const deleteUser = async (user_id) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Delete from user_role first (foreign key constraint typically handles this but good to be explicit or if no CASCADE)
    await conn.query("DELETE FROM user_role WHERE user_id = ?", [user_id]);

    // Delete from users
    const [result] = await conn.query("DELETE FROM users WHERE user_id = ?", [
      user_id,
    ]);

    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

module.exports = {
  createUsers,
  getAllUsers,
  getUserByEmail,
  getUserById,
  updateUser,
  deleteUser,
};
