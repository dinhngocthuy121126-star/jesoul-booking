const { getPool, sql } = require('../config/database');

class UserModel {
  static async findByPhone(phoneNumber, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('phoneNumber', sql.VarChar, phoneNumber);

    const result = await request.query(`
      SELECT UserID, Role, FullName, PhoneNumber, Email, PasswordHash, CreatedAt
      FROM dbo.Users
      WHERE PhoneNumber = @phoneNumber;
    `);
    return result.recordset[0] || null;
  }

  static async findByPhoneAndRole(phoneNumber, role) {
    const pool = getPool();
    const request = pool.request();
    request.input('phoneNumber', sql.VarChar, phoneNumber);
    request.input('role', sql.VarChar, role);

    const result = await request.query(`
      SELECT UserID, Role, FullName, PhoneNumber, Email, PasswordHash, CreatedAt
      FROM dbo.Users
      WHERE PhoneNumber = @phoneNumber AND Role = @role;
    `);
    return result.recordset[0] || null;
  }

  static async upsertCustomer({ fullName, phoneNumber, email }, transaction = null) {
    const request = transaction ? new sql.Request(transaction) : getPool().request();
    request.input('role', sql.VarChar, 'Customer');
    request.input('fullName', sql.NVarChar, fullName);
    request.input('phoneNumber', sql.VarChar, phoneNumber);
    request.input('email', sql.VarChar, email);

    const result = await request.query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE PhoneNumber = @phoneNumber)
      BEGIN
          INSERT INTO dbo.Users (Role, FullName, PhoneNumber, Email)
          VALUES (@role, @fullName, @phoneNumber, @email);
      END
      ELSE
      BEGIN
          UPDATE dbo.Users
          SET FullName = @fullName, Email = @email, UpdatedAt = SYSUTCDATETIME()
          WHERE PhoneNumber = @phoneNumber;
      END

      SELECT UserID, Role, FullName, PhoneNumber, Email FROM dbo.Users WHERE PhoneNumber = @phoneNumber;
    `);
    return result.recordset[0];
  }
}

module.exports = UserModel;

