'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface DatabaseStatus {
  success: boolean;
  message: string;
  connection?: {
    connected: boolean;
    database: string;
    version: string;
    testQuery: any;
    tablesCount: number;
    tables: string[];
  };
  error?: string;
  details?: string;
}

export default function DatabaseTestPage() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [migrationLoading, setMigrationLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-db');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        success: false,
        message: 'Failed to test connection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    setMigrationLoading(true);
    try {
      const response = await fetch('/api/migrate', { method: 'POST' });
      const data = await response.json();
      setMigrationStatus(data);
    } catch (error) {
      setMigrationStatus({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setMigrationLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">MariaDB Database Integration</h1>
        <p className="text-muted-foreground">
          Test and manage your MariaDB database connection
        </p>
      </div>

      {/* Database Connection Test */}
      <Card>
        <CardHeader>
          <CardTitle>Database Connection Test</CardTitle>
          <CardDescription>
            Test the connection to your MariaDB database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testConnection} disabled={loading}>
            {loading ? 'Testing...' : 'Test Connection'}
          </Button>

          {status && (
            <Alert className={status.success ? 'border-green-500' : 'border-red-500'}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={status.success ? 'default' : 'destructive'}>
                      {status.success ? 'Success' : 'Failed'}
                    </Badge>
                    <span>{status.message}</span>
                  </div>
                  
                  {status.connection && (
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      <div>
                        <strong>Database:</strong> {status.connection.database}
                      </div>
                      <div>
                        <strong>Version:</strong> {status.connection.version}
                      </div>
                      <div>
                        <strong>Tables:</strong> {status.connection.tablesCount}
                      </div>
                      <div>
                        <strong>Test Query:</strong> {JSON.stringify(status.connection.testQuery)}
                      </div>
                    </div>
                  )}

                  {status.connection?.tables && status.connection.tables.length > 0 && (
                    <div className="mt-4">
                      <strong>Available Tables:</strong>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {status.connection.tables.map((table, index) => (
                          <Badge key={index} variant="outline">{table}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {status.error && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-red-700 text-sm">
                      <strong>Error:</strong> {status.error}
                      {status.details && (
                        <div className="mt-1">
                          <strong>Details:</strong> {status.details}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Database Migration */}
      <Card>
        <CardHeader>
          <CardTitle>Database Migration</CardTitle>
          <CardDescription>
            Set up the database schema for the ArtBot application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runMigration} disabled={migrationLoading} variant="outline">
            {migrationLoading ? 'Running Migration...' : 'Run Migration'}
          </Button>

          {migrationStatus && (
            <Alert className={migrationStatus.success ? 'border-green-500' : 'border-red-500'}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={migrationStatus.success ? 'default' : 'destructive'}>
                      {migrationStatus.success ? 'Success' : 'Failed'}
                    </Badge>
                    <span>{migrationStatus.message}</span>
                  </div>
                  
                  {migrationStatus.summary && (
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      <div>
                        <strong>Total Statements:</strong> {migrationStatus.summary.totalStatements}
                      </div>
                      <div>
                        <strong>Successful:</strong> {migrationStatus.summary.successful}
                      </div>
                      <div>
                        <strong>Errors:</strong> {migrationStatus.summary.errors}
                      </div>
                      <div>
                        <strong>Tables Created:</strong> {migrationStatus.summary.tablesCreated}
                      </div>
                    </div>
                  )}

                  {migrationStatus.tables && migrationStatus.tables.length > 0 && (
                    <div className="mt-4">
                      <strong>Created Tables:</strong>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {migrationStatus.tables.map((table: string, index: number) => (
                          <Badge key={index} variant="outline">{table}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {migrationStatus.error && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-red-700 text-sm">
                      <strong>Error:</strong> {migrationStatus.error}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Database Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Database Configuration</CardTitle>
          <CardDescription>
            Current database configuration details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Host:</strong> db5018065428.hosting-data.io
            </div>
            <div>
              <strong>Port:</strong> 3306
            </div>
            <div>
              <strong>Database:</strong> dbu2025297
            </div>
            <div>
              <strong>User:</strong> dbu2025297
            </div>
            <div>
              <strong>Type:</strong> MariaDB 10.11
            </div>
            <div>
              <strong>Memory:</strong> 0 GB of 2 GB used
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
