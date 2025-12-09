# Quick Start Guide - Ticketing System

## Prerequisites

You need PostgreSQL installed and running. Choose one of these options:

### Option 1: Use Local PostgreSQL (Recommended for Testing)

1. **Install PostgreSQL:**
   - Download from: https://www.postgresql.org/download/
   - Or use: `winget install PostgreSQL.PostgreSQL`

2. **Start PostgreSQL service:**
   ```powershell
   # Start PostgreSQL service
   Start-Service postgresql-x64-16
   
   # Or if using different version, check service name:
   Get-Service -Name "*postgres*"
   ```

3. **Create database:**
   ```powershell
   # Connect to PostgreSQL (password: postgres by default)
   psql -U postgres
   
   # In psql console:
   CREATE DATABASE ticketing_system;
   \q
   ```

### Option 2: Use Docker (Easiest)

```powershell
# Pull and run PostgreSQL in Docker
docker run --name ticketing-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ticketing_system -p 5432:5432 -d postgres:16

# Check if running
docker ps
```

### Option 3: Use Cloud Database

Update `.env` with your cloud database URL:
```env
DATABASE_URL="postgresql://user:password@your-host.com:5432/database"
```

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
The `.env` file is already configured for local PostgreSQL:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketing_system?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production-make-it-very-secure"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

**Important:** Change `JWT_SECRET` for production!

### 3. Initialize Database
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push

# Seed database with sample data
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Default Login Credentials

After seeding, use these credentials:

### Admin Account
- **Username:** `admin`
- **Password:** `admin123`

### User Accounts  
- **Username:** `john_doe` | **Password:** `user123`
- **Username:** `jane_smith` | **Password:** `user123`

## Testing the API

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **In a new terminal, run the test script:**
   ```bash
   node test-api.js
   ```

This will test all API endpoints and show results.

## Troubleshooting

### Database Connection Errors

**Error: Can't reach database server**
- Make sure PostgreSQL is running
- Check connection string in `.env`
- Verify database exists

**Fix for Windows:**
```powershell
# Check PostgreSQL service status
Get-Service -Name "*postgres*"

# Start PostgreSQL service
Start-Service postgresql-x64-16
```

### Port Already in Use

**Error: Port 3000 is already in use**
```bash
# Kill process on port 3000
npx kill-port 3000

# Or change port in package.json:
"dev": "next dev -p 3001"
```

### Prisma Client Not Generated

```bash
# Regenerate Prisma Client
npm run db:generate
```

### Database Schema Out of Sync

```bash
# Reset database (WARNING: Deletes all data)
npx prisma db push --force-reset

# Seed again
npm run db:seed
```

## Project Structure

```
d:\tickets\frontend\
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data script
├── src/
│   ├── app/
│   │   ├── admin/            # Admin dashboard
│   │   ├── dashboard/        # User dashboard  
│   │   ├── login/            # Login page
│   │   ├── api/              # API routes
│   │   └── components/       # UI components
│   ├── lib/
│   │   ├── auth.ts           # JWT utilities
│   │   ├── middleware.ts     # Auth middleware
│   │   ├── prisma.ts         # Prisma client
│   │   └── api-client.ts     # API wrapper
│   └── types/
│       └── index.ts          # TypeScript types
├── .env                      # Environment variables
├── test-api.js              # API test script
└── README.md                # Full documentation
```

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma Client
npm run db:push         # Push schema to database
npm run db:seed         # Seed sample data

# Testing
node test-api.js        # Test all API endpoints
```

## Next Steps

1. ✅ Set up PostgreSQL
2. ✅ Initialize database
3. ✅ Start dev server
4. 🎯 Login with admin credentials
5. 🎯 Create users
6. 🎯 Add branches
7. 🎯 Test ticket workflow

## Support

For issues:
1. Check database is running
2. Verify `.env` configuration
3. Check console logs for errors
4. Run `node test-api.js` to test API

## Production Deployment

Before deploying to production:

1. **Update environment variables:**
   - Change `JWT_SECRET` to a strong, random string
   - Update `DATABASE_URL` to production database
   - Update `NEXT_PUBLIC_API_URL` to your domain

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Run database migrations:**
   ```bash
   npx prisma db push
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

Enjoy your Ticketing System! 🎉
