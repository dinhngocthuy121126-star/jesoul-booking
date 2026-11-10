let activeSql = require('mssql');
const config = require('./environment');

let pool = null;

const sqlProxy = new Proxy(activeSql, {
  get(target, prop) {
    return activeSql[prop];
  },
  apply(target, thisArg, argumentsList) {
    return Reflect.apply(activeSql, thisArg, argumentsList);
  },
  construct(target, argumentsList, newTarget) {
    return Reflect.construct(activeSql, argumentsList, newTarget);
  }
});

async function connectDatabase() {
  if (pool) return pool;

  try {
    pool = await activeSql.connect(config.db);
    console.log(`[MSSQL] Successfully connected to database: ${config.db.database} at ${config.db.server}:${config.db.port}`);
    return pool;
  } catch (error) {
    console.warn('[MSSQL] SQL Server authentication failed, attempting Windows Authentication fallback...');
    try {
      activeSql = require('mssql/msnodesqlv8');
      const connStr = `Driver={ODBC Driver 18 for SQL Server};Server=${config.db.server},${config.db.port};Database=${config.db.database};Trusted_Connection=yes;TrustServerCertificate=yes;`;
      pool = await activeSql.connect({ connectionString: connStr });
      console.log(`[MSSQL] Successfully connected via Windows Authentication (ODBC Driver 18) to ${config.db.database}`);
      return pool;
    } catch (fallbackError) {
      console.error('[MSSQL] All database connection attempts failed:', fallbackError.message);
      throw error;
    }
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDatabase() first.');
  }
  return pool;
}

module.exports = {
  sql: sqlProxy,
  connectDatabase,
  getPool
};

