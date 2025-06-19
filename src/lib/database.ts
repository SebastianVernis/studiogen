import mysql from 'mysql2/promise';

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
};

// Create connection pool for better performance
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 30000,
  timeout: 30000,
  reconnect: true,
  idleTimeout: 300000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export async function getConnection() {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export async function executeQuery(query: string, params: any[] = []) {
  let connection;
  try {
    connection = await getConnection();
    const [results] = await connection.execute(query, params);
    return results;
  } catch (error) {
    console.error('Query execution error:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function testConnection() {
  try {
    console.log('Testing database connection to:', dbConfig.host);
    const connection = await getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    
    // Provide detailed error information
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND')) {
        console.error('DNS Resolution Error: Cannot resolve hostname', dbConfig.host);
        console.error('Please verify:');
        console.error('1. The hostname is correct');
        console.error('2. You have internet connectivity');
        console.error('3. The database server is accessible from this network');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error('Connection Refused: Database server is not accepting connections');
        console.error('Please verify:');
        console.error('1. Database server is running');
        console.error('2. Port', dbConfig.port, 'is open');
        console.error('3. Firewall settings allow the connection');
      } else if (error.message.includes('Access denied')) {
        console.error('Authentication Error: Invalid credentials');
        console.error('Please verify:');
        console.error('1. Username:', dbConfig.user);
        console.error('2. Password is correct');
        console.error('3. User has access to database:', dbConfig.database);
      }
    }
    
    return false;
  }
}

export async function getDatabaseInfo() {
  try {
    const connection = await getConnection();
    const [dbInfo] = await connection.execute('SELECT DATABASE() as current_db, VERSION() as version, USER() as current_user');
    const [tables] = await connection.execute('SHOW TABLES');
    connection.release();
    
    return {
      database: (dbInfo as any)[0]?.current_db || 'Unknown',
      version: (dbInfo as any)[0]?.version || 'Unknown',
      user: (dbInfo as any)[0]?.current_user || 'Unknown',
      tables: Array.isArray(tables) ? tables.map((t: any) => Object.values(t)[0]) : [],
      tablesCount: Array.isArray(tables) ? tables.length : 0
    };
  } catch (error) {
    console.error('Error getting database info:', error);
    throw error;
  }
}

// Mock database for testing when real database is not available
export const mockDatabase = {
  users: [
    { id: 1, email: 'test@example.com', name: 'Test User', created_at: new Date() }
  ],
  image_generations: [
    { 
      id: 1, 
      user_id: 1, 
      prompt: 'A beautiful sunset', 
      status: 'completed',
      image_url: 'https://placehold.co/512x512/sunset',
      created_at: new Date()
    }
  ]
};

export async function executeQueryWithFallback(query: string, params: any[] = []) {
  try {
    return await executeQuery(query, params);
  } catch (error) {
    console.warn('Database query failed, using mock data for development');
    
    // Simple mock responses for common queries
    if (query.includes('SELECT 1')) {
      return [{ test: 1 }];
    }
    if (query.includes('SHOW TABLES')) {
      return [
        { Tables_in_dbu2025297: 'users' },
        { Tables_in_dbu2025297: 'image_generations' },
        { Tables_in_dbu2025297: 'projects' },
        { Tables_in_dbu2025297: 'artistic_styles' }
      ];
    }
    if (query.includes('SELECT DATABASE()')) {
      return [{ current_db: 'dbu2025297 (mock)', version: 'MariaDB 10.11 (mock)', current_user: 'dbu2025297@mock' }];
    }
    
    throw error;
  }
}

export { pool };

