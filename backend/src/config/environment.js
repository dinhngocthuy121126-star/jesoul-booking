require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    server: process.env.DB_SERVER || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 1434,
    database: process.env.DB_NAME || 'JesoulDb',
    user: process.env.DB_USER || 'jesoul_db_user',
    password: process.env.DB_PASSWORD || 'JesoulPassword123!',
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false'
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'jesoul_jwt_secret_dev',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h'
  },
  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    redirectUri: process.env.GMAIL_REDIRECT_URI,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    senderEmail: process.env.GMAIL_SENDER_EMAIL,
    dryRun: process.env.GMAIL_DRY_RUN !== 'false'
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000'
};

