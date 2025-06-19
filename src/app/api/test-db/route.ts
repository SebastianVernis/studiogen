import { NextRequest, NextResponse } from 'next/server';
import { testConnection, executeQuery, getDatabaseInfo, executeQueryWithFallback } from '@/lib/database';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const isConnected = await testConnection();
    
    if (!isConnected) {
      // Try with fallback for development
      console.log('Using fallback mock data for development...');
      const mockResult = await executeQueryWithFallback('SELECT 1 as test');
      const mockTables = await executeQueryWithFallback('SHOW TABLES');
      const mockDbInfo = await executeQueryWithFallback('SELECT DATABASE() as current_db, VERSION() as version');
      
      return NextResponse.json({
        success: false,
        message: 'Database connection failed - using mock data for development',
        connection: {
          connected: false,
          database: mockDbInfo[0]?.current_db || 'Mock Database',
          version: mockDbInfo[0]?.version || 'Mock Version',
          user: 'Mock User',
          testQuery: mockResult[0],
          tablesCount: Array.isArray(mockTables) ? mockTables.length : 0,
          tables: Array.isArray(mockTables) ? mockTables.map((t: any) => Object.values(t)[0]) : [],
          mode: 'development-mock'
        },
        troubleshooting: {
          hostname: process.env.DB_HOST,
          port: process.env.DB_PORT,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          suggestions: [
            'Verify the database hostname is accessible from your network',
            'Check if the database server is running',
            'Ensure firewall allows connections on port 3306',
            'Verify database credentials are correct'
          ]
        }
      });
    }

    // If connected, get real database info
    const dbInfo = await getDatabaseInfo();
    const testResult = await executeQuery('SELECT 1 as test');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      connection: {
        connected: true,
        database: dbInfo.database,
        version: dbInfo.version,
        user: dbInfo.user,
        testQuery: testResult[0],
        tablesCount: dbInfo.tablesCount,
        tables: dbInfo.tables,
        mode: 'production'
      }
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    
    // Provide detailed error information
    let errorDetails = 'Unknown error';
    let suggestions = [];
    
    if (error instanceof Error) {
      errorDetails = error.message;
      
      if (error.message.includes('ENOTFOUND')) {
        suggestions = [
          'Check if the hostname is correct',
          'Verify internet connectivity',
          'Ensure DNS can resolve the hostname'
        ];
      } else if (error.message.includes('ECONNREFUSED')) {
        suggestions = [
          'Verify the database server is running',
          'Check if port 3306 is open',
          'Ensure firewall allows the connection'
        ];
      } else if (error.message.includes('Access denied')) {
        suggestions = [
          'Verify username and password',
          'Check user permissions',
          'Ensure user has access to the database'
        ];
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Database connection failed',
        details: errorDetails,
        configuration: {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          database: process.env.DB_NAME,
          user: process.env.DB_USER
        },
        suggestions
      },
      { status: 500 }
    );
  }
}

