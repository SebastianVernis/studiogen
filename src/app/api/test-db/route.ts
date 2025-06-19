import { NextRequest, NextResponse } from 'next/server';
import { testConnection, executeQuery } from '@/lib/database';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Failed to connect to database' },
        { status: 500 }
      );
    }

    // Test a simple query
    const result = await executeQuery('SELECT 1 as test');
    
    // Get database info
    const dbInfo = await executeQuery('SELECT DATABASE() as current_db, VERSION() as version');
    
    // Check if tables exist
    const tables = await executeQuery('SHOW TABLES');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      connection: {
        connected: true,
        database: dbInfo[0]?.current_db || 'Unknown',
        version: dbInfo[0]?.version || 'Unknown',
        testQuery: result[0],
        tablesCount: Array.isArray(tables) ? tables.length : 0,
        tables: Array.isArray(tables) ? tables.map((t: any) => Object.values(t)[0]) : []
      }
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { 
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
