import { NextRequest, NextResponse } from 'next/server';
import { testConnection, executeQuery } from '@/lib/database';
import * as fs from 'fs';
import * as path from 'path';

export async function POST() {
  try {
    console.log('🚀 Starting database migration via API...');
    
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Cannot connect to database. Please check your configuration.' },
        { status: 500 }
      );
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
        tablesCreated: Array.isArray(tables) ? tables.length : 0
      },
      tables: Array.isArray(tables) ? tables.map((t: any) => Object.values(t)[0]) : [],
      details: results
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
