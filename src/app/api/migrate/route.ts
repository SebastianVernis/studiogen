import { NextRequest, NextResponse } from 'next/server';
import { testConnection, executeQuery, executeQueryWithFallback } from '@/lib/database';
import * as fs from 'fs';
import * as path from 'path';

export async function POST() {
  try {
    console.log('🚀 Starting database migration via API...');
    
    // Test connection first
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.log('Database connection failed, simulating migration for development...');
      
      // Simulate successful migration for development
      return NextResponse.json({
        success: false,
        message: 'Database connection failed - migration simulated for development',
        summary: {
          totalStatements: 10,
          successful: 10,
          errors: 0,
          tablesCreated: 7,
          mode: 'development-simulation'
        },
        tables: [
          'users',
          'projects', 
          'image_generations',
          'artistic_styles',
          'user_sessions',
          'image_batches',
          'batch_images'
        ],
        details: [
          { statement: 1, status: 'simulated', query: 'CREATE TABLE users...' },
          { statement: 2, status: 'simulated', query: 'CREATE TABLE projects...' },
          { statement: 3, status: 'simulated', query: 'CREATE TABLE image_generations...' },
          { statement: 4, status: 'simulated', query: 'CREATE TABLE artistic_styles...' },
          { statement: 5, status: 'simulated', query: 'CREATE TABLE user_sessions...' },
          { statement: 6, status: 'simulated', query: 'CREATE TABLE image_batches...' },
          { statement: 7, status: 'simulated', query: 'CREATE TABLE batch_images...' },
          { statement: 8, status: 'simulated', query: 'INSERT INTO artistic_styles...' },
          { statement: 9, status: 'simulated', query: 'INSERT INTO artistic_styles...' },
          { statement: 10, status: 'simulated', query: 'INSERT INTO artistic_styles...' }
        ],
        note: 'This is a simulated migration for development purposes. In production with a working database connection, the actual schema would be created.'
      });
    }

    // Read schema file
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json(
        { error: 'Schema file not found at: ' + schemaPath },
        { status: 500 }
      );
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await executeQuery(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
          results.push({
            statement: i + 1,
            status: 'success',
            query: statement.substring(0, 100) + (statement.length > 100 ? '...' : '')
          });
          successCount++;
        } catch (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error);
          results.push({
            statement: i + 1,
            status: 'error',
            query: statement.substring(0, 100) + (statement.length > 100 ? '...' : ''),
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          errorCount++;
        }
      }
    }

    // Verify tables were created
    const tables = await executeQuery('SHOW TABLES');
    
    return NextResponse.json({
      success: errorCount === 0,
      message: errorCount === 0 ? 'Database migration completed successfully!' : 'Migration completed with errors',
      summary: {
        totalStatements: statements.length,
        successful: successCount,
        errors: errorCount,
        tablesCreated: Array.isArray(tables) ? tables.length : 0,
        mode: 'production'
      },
      tables: Array.isArray(tables) ? tables.map((t: any) => Object.values(t)[0]) : [],
      details: results
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Check database connection and try again. For development, the API provides simulated responses when the database is not accessible.'
      },
      { status: 500 }
    );
  }
}

