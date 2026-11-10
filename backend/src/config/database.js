const fs = require('fs');
const path = require('path');
const config = require('./environment');

let pool = null;
let isPostgres = false;
let activeSql = require('mssql');

function createCaseInsensitiveRow(row) {
  if (!row || typeof row !== 'object') return row;
  return new Proxy(row, {
    get(target, prop) {
      if (typeof prop !== 'string') return target[prop];
      if (prop in target) return target[prop];
      const lower = prop.toLowerCase();
      for (const k of Object.keys(target)) {
        if (k.toLowerCase() === lower) return target[k];
      }
      return undefined;
    }
  });
}

function translateForPostgres(sql, inputMap) {
  let translated = sql.trim();

  // Special case: UserModel.upsertCustomer
  if (/IF NOT EXISTS\s*\(SELECT 1 FROM dbo\.Users WHERE PhoneNumber = @phoneNumber\)/i.test(translated)) {
    const params = [
      inputMap['role'] || 'Customer',
      inputMap['fullName'],
      inputMap['phoneNumber'],
      inputMap['email']
    ];
    return {
      text: `
        INSERT INTO "Users" ("Role", "FullName", "PhoneNumber", "Email")
        VALUES ($1, $2, $3, $4)
        ON CONFLICT ("PhoneNumber") 
        DO UPDATE SET "FullName" = EXCLUDED."FullName", "Email" = EXCLUDED."Email", "UpdatedAt" = CURRENT_TIMESTAMP
        RETURNING "UserID", "Role", "FullName", "PhoneNumber", "Email";
      `,
      values: params
    };
  }

  // Special case: noReplyTimeoutJob UPDATE with JOIN
  if (/UPDATE tk\s+SET tk\.Status = 'NoReply'/i.test(translated)) {
    return {
      text: `
        UPDATE "Tickets" tk
        SET "Status" = 'NoReply'
        FROM "EmailLogs" el
        WHERE tk."TicketID" = el."TicketID"
          AND tk."Status" = 'Paid'
          AND el."Status" = 'Sent'
          AND el."SentAt" <= (CURRENT_TIMESTAMP - INTERVAL '10 minutes');
      `,
      values: []
    };
  }

  // Remove dbo.
  translated = translated.replace(/dbo\./gi, '');

  // SYSUTCDATETIME() -> CURRENT_TIMESTAMP
  translated = translated.replace(/SYSUTCDATETIME\(\)/gi, 'CURRENT_TIMESTAMP');

  // DATEADD
  translated = translated.replace(/DATEADD\(MINUTE,\s*(-?\d+),\s*CURRENT_TIMESTAMP\)/gi, (m, x) => `(CURRENT_TIMESTAMP + INTERVAL '${x} minutes')`);
  translated = translated.replace(/DATEADD\(HOUR,\s*(-?\d+),\s*CURRENT_TIMESTAMP\)/gi, (m, x) => `(CURRENT_TIMESTAMP + INTERVAL '${x} hours')`);

  // OUTPUT INSERTED.col1, INSERTED.col2 -> RETURNING col1, col2
  translated = translated.replace(/OUTPUT\s+INSERTED\.([a-zA-Z0-9_,\sINSERTED\.]+)/gi, (m, cols) => {
    const cleanCols = cols.replace(/INSERTED\./gi, '').trim();
    return `RETURNING ${cleanCols}`;
  });

  // Handle WITH (UPDLOCK, ROWLOCK) / WITH (UPDLOCK)
  let needForUpdate = false;
  if (/WITH\s*\(\s*UPDLOCK[^)]*\)/i.test(translated)) {
    needForUpdate = true;
    translated = translated.replace(/WITH\s*\(\s*UPDLOCK[^)]*\)/gi, '');
  }

  // Handle TOP 1
  let needLimit1 = false;
  if (/SELECT\s+TOP\s+1\b/i.test(translated)) {
    needLimit1 = true;
    translated = translated.replace(/SELECT\s+TOP\s+1\b/i, 'SELECT ');
  }

  // Replace @param with $1, $2, ...
  const values = [];
  const paramRegex = /@([a-zA-Z0-9_]+)/g;
  let match;
  let paramIndex = 1;
  const paramMap = {};

  translated = translated.replace(paramRegex, (fullMatch, paramName) => {
    if (!(paramName in paramMap)) {
      paramMap[paramName] = paramIndex++;
      values.push(inputMap[paramName] !== undefined ? inputMap[paramName] : null);
    }
    return `$${paramMap[paramName]}`;
  });

  // Clean trailing semicolon before adding LIMIT / FOR UPDATE
  translated = translated.trim().replace(/;$/, '');

  if (needLimit1 && !/LIMIT\s+\d+/i.test(translated)) {
    translated += ' LIMIT 1';
  }

  if (needForUpdate && !/FOR\s+UPDATE/i.test(translated)) {
    translated += ' FOR UPDATE';
  }

  translated += ';';

  return { text: translated, values };
}

class PostgresRequest {
  constructor(clientOrPool) {
    this.client = clientOrPool;
    this.inputs = {};
  }

  input(name, type, value) {
    if (value === undefined) {
      this.inputs[name] = type;
    } else {
      this.inputs[name] = value;
    }
    return this;
  }

  async query(sqlText) {
    const { text, values } = translateForPostgres(sqlText, this.inputs);
    const res = await this.client.query(text, values);
    const rows = (res.rows || []).map(createCaseInsensitiveRow);
    return {
      recordset: rows,
      rowsAffected: [res.rowCount || 0]
    };
  }
}

class PostgresTransaction {
  constructor(pgPool) {
    this.pgPool = pgPool;
    this.client = null;
    this._acquiredConfig = true;
  }

  async begin() {
    this.client = await this.pgPool.connect();
    await this.client.query('BEGIN');
  }

  async commit() {
    if (this.client) {
      await this.client.query('COMMIT');
      this.client.release();
      this.client = null;
    }
  }

  async rollback() {
    if (this.client) {
      try {
        await this.client.query('ROLLBACK');
      } finally {
        this.client.release();
        this.client = null;
      }
    }
  }
}

class PostgresPoolAdapter {
  constructor(pgPool) {
    this.pgPool = pgPool;
    this.isPostgres = true;
  }

  request() {
    return new PostgresRequest(this.pgPool);
  }

  async query(text, values) {
    return this.pgPool.query(text, values);
  }
}

const sqlProxy = new Proxy(activeSql, {
  get(target, prop) {
    if (isPostgres) {
      if (prop === 'Request') {
        return class {
          constructor(transaction) {
            if (transaction && transaction.client) {
              return new PostgresRequest(transaction.client);
            }
            return new PostgresRequest(pool.pgPool);
          }
        };
      }
      if (prop === 'Transaction') {
        return class {
          constructor() {
            return new PostgresTransaction(pool.pgPool);
          }
        };
      }
      // SQL data types mapping (no-ops for pg)
      return (val) => val;
    }
    return activeSql[prop];
  },
  apply(target, thisArg, argumentsList) {
    return Reflect.apply(activeSql, thisArg, argumentsList);
  },
  construct(target, argumentsList, newTarget) {
    return Reflect.construct(activeSql, argumentsList, newTarget);
  }
});

async function autoMigratePostgres(pgPool) {
  try {
    const candidatePaths = [
      path.join(__dirname, 'init_postgres.sql'),
      path.join(__dirname, '../../../database/init_postgres.sql'),
      path.join(process.cwd(), 'database/init_postgres.sql'),
      path.join(process.cwd(), 'init_postgres.sql')
    ];
    const sqlPath = candidatePaths.find(p => fs.existsSync(p));
    if (sqlPath) {
      const ddl = fs.readFileSync(sqlPath, 'utf8');
      await pgPool.query(ddl);
      console.log(`[PostgreSQL] Database tables & seed data initialized successfully.`);
    }
  } catch (err) {
    console.warn('[PostgreSQL] Auto-migration notice:', err.message);
  }
}

async function connectDatabase() {
  if (pool) return pool;

  // 1. PostgreSQL Mode (Render, Supabase, Neon via DATABASE_URL)
  if (config.databaseUrl) {
    console.log('[Database] DATABASE_URL detected. Connecting to PostgreSQL...');
    const { Pool } = require('pg');
    const pgPool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    await pgPool.query('SELECT NOW()');
    console.log('[PostgreSQL] Successfully connected to PostgreSQL database!');

    await autoMigratePostgres(pgPool);

    isPostgres = true;
    pool = new PostgresPoolAdapter(pgPool);
    return pool;
  }

  // 2. Microsoft SQL Server Mode (Local Development)
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
