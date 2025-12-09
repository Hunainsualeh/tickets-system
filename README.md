# Ticketing System - Dispatch Management

A modern, full-stack ticketing system built with Next.js, TypeScript, Prisma, and PostgreSQL.

## Features

### Admin Dashboard
- Create and manage users with role-based access
- Manage branches (Branch, Back Office, Hybrid, Data Center)
- Create and track tickets
- Update ticket statuses and priorities
- View comprehensive analytics and statistics
- Full CRUD operations for all resources

### User Dashboard
- Submit dispatch requests (tickets)
- View personal ticket history
- Track ticket status in real-time
- View status history with notes
- Priority-based ticket submission

## Tech Stack

**Frontend:**
- Next.js 16 with TypeScript
- Tailwind CSS for styling
- Lucide React for icons
- Component-based architecture

**Backend:**
- Next.js API Routes
- Prisma ORM
- PostgreSQL database
- JWT authentication
- bcryptjs for password hashing

## Getting Started

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database running

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
Edit `.env` file with your database connection:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
JWT_SECRET="your-secure-secret-key"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

3. **Generate Prisma Client:**
```bash
npm run db:generate
```

4. **Push database schema:**
```bash
npm run db:push
```

5. **Seed the database with sample data:**
```bash
npm run db:seed
```

### Running the Application

**Development mode:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Credentials

After seeding, you can log in with:

**Admin Account:**
- Username: `admin`
- Password: `admin123`

**User Accounts:**
- Username: `john_doe` / Password: `user123`
- Username: `jane_smith` / Password: `user123`

## Database Schema

### Models
- **User**: Authentication and user management (ADMIN/USER roles)
- **Branch**: Branch locations with categories
- **Ticket**: Dispatch requests/tickets
- **StatusHistory**: Audit trail for ticket status changes

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

### Branches
- `GET /api/branches` - List all branches
- `POST /api/branches` - Create branch (Admin)
- `PUT /api/branches/[id]` - Update branch (Admin)
- `DELETE /api/branches/[id]` - Delete branch (Admin)

### Tickets
- `GET /api/tickets` - List tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/[id]` - Get ticket details
- `PUT /api/tickets/[id]` - Update ticket
- `DELETE /api/tickets/[id]` - Delete ticket (Admin)

## Workflow

1. Admin creates a user with username and password
2. User logs in with provided credentials
3. User submits dispatch request with branch, priority, and issue details
4. Admin views all requests in the admin dashboard
5. Ticket status updates through: PENDING → ACKNOWLEDGED → IN_PROGRESS → COMPLETED

## Security
- JWT token-based authentication
- Passwords hashed with bcryptjs
- Role-based access control (RBAC)
- API route protection with middleware





 npx prisma generate
 npx prisma generate