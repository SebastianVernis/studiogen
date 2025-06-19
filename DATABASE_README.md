# MariaDB Database Integration for ArtBot

This document describes the MariaDB database integration setup for the ArtBot Batch Generator application.

## Database Configuration

The application is configured to connect to your MariaDB database with the following details:

- **Host**: db5018065428.hosting-data.io
- **Port**: 3306
- **Database**: dbu2025297
- **User**: dbu2025297
- **Type**: MariaDB 10.11
- **Memory**: 2 GB available

## Files Added/Modified

### Database Configuration
- `.env.local` - Environment variables for database connection
- `src/lib/database.ts` - Database connection utility with connection pooling
- `database/schema.sql` - Complete database schema for the application
- `database/migrate.ts` - Migration script to set up the database

### Database Models
- `src/lib/models/user.ts` - User model with CRUD operations
- `src/lib/models/image-generation.ts` - Image generation model with status tracking

### API Routes
- `src/app/api/test-db/route.ts` - Database connection testing endpoint
- `src/app/api/migrate/route.ts` - Database migration endpoint

### UI Components
- `src/app/database-test/page.tsx` - Database management interface

### Package Configuration
- Updated `package.json` with new dependencies and scripts

## Database Schema

The database includes the following tables:

1. **users** - User accounts and profiles
2. **projects** - User projects for organizing image generations
3. **image_generations** - Individual image generation requests and results
4. **artistic_styles** - Available artistic styles for image generation
5. **user_sessions** - User authentication sessions
6. **image_batches** - Batch processing of multiple images
7. **batch_images** - Relationship between batches and individual images

## Installation and Setup

1. **Install Dependencies**:
   ```bash
   npm install mysql2 tsx
   ```

2. **Environment Configuration**:
   The `.env.local` file contains your database credentials. Make sure it's not committed to version control.

3. **Test Database Connection**:
   ```bash
   npm run db:test
   ```
   Or visit: http://localhost:9002/api/test-db

4. **Run Database Migration**:
   ```bash
   npm run db:migrate
   ```
   Or use the web interface at: http://localhost:9002/database-test

## Usage

### Testing the Database Connection

Visit the database test page at `/database-test` to:
- Test the database connection
- Run migrations to set up the schema
- View current database status and tables

### Using Database Models

```typescript
import { UserModel } from '@/lib/models/user';
import { ImageGenerationModel } from '@/lib/models/image-generation';

// Create a new user
const user = await UserModel.create({
  email: 'user@example.com',
  name: 'John Doe'
});

// Create an image generation request
const generation = await ImageGenerationModel.create({
  user_id: user.id!,
  prompt: 'A beautiful sunset over mountains',
  artistic_style: 'Photorealistic',
  status: 'pending'
});
```

### Direct Database Queries

```typescript
import { executeQuery } from '@/lib/database';

// Execute custom queries
const results = await executeQuery('SELECT * FROM users WHERE email = ?', ['user@example.com']);
```

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. **Check Network Connectivity**: Ensure the database host is accessible from your environment
2. **Verify Credentials**: Double-check the database credentials in `.env.local`
3. **Firewall Settings**: Ensure port 3306 is accessible
4. **Database Status**: Verify the database server is running

### Common Error Messages

- `ENOTFOUND db5018065428.hosting-data.io`: DNS resolution issue - check hostname
- `Access denied`: Incorrect username/password
- `Connection timeout`: Network or firewall issue

### Debug Mode

Enable debug logging by adding to your `.env.local`:
```
DEBUG=mysql2:*
```

## API Endpoints

### GET /api/test-db
Tests the database connection and returns status information.

### POST /api/migrate
Runs the database migration to set up the schema.

## Scripts

- `npm run db:migrate` - Run database migration
- `npm run db:test` - Test database connection via API

## Security Notes

- Database credentials are stored in `.env.local` (not committed to git)
- Connection pooling is configured for optimal performance
- Prepared statements are used to prevent SQL injection
- Foreign key constraints ensure data integrity

## Performance Considerations

- Connection pooling with 10 concurrent connections
- Indexed columns for optimal query performance
- JSON fields for flexible metadata storage
- Proper foreign key relationships for data consistency

## Migration from Firebase

If migrating from Firebase, you'll need to:
1. Export existing data from Firebase
2. Transform the data to match the new schema
3. Import the data using the database models
4. Update application code to use MariaDB instead of Firebase

## Support

For database-related issues:
1. Check the server logs for detailed error messages
2. Use the database test interface for diagnostics
3. Verify environment configuration
4. Test connection manually using database tools
