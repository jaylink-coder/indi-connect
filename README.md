# Indi Connect - AIPCA Church Management System

A comprehensive church management system built for AIPCA (African Independent Pentecostal Church of Africa) with multi-parish support, M-Pesa payment integration, and member management capabilities.

## Features

### Core Functionality
- **Multi-Parish Support**: Manage multiple church branches within a unified system
- **Member Management**: Track members, roles, and spiritual milestones
- **Financial Tracking**: Monitor tithes, cess, operations, and project contributions
- **Attendance System**: Track service attendance and generate reports
- **Project Management**: Manage church building projects and fundraising progress
- **Prayer Requests**: Submit and track prayer requests

### Integrations
- **M-Pesa Daraja API**: STK Push for mobile payments and automatic contribution tracking
- **Twilio SMS**: Payment confirmations, attendance reminders, and notifications
- **Clerk Authentication**: Role-based access control (Super Admin, Pastor, Deacon, Treasurer, Secretary, Member)

### User Roles
- **Super Admin**: Full system access
- **Pastor**: Member management and spiritual oversight
- **Deacon**: Parish operations and attendance
- **Treasurer**: Financial management and contribution tracking
- **Secretary**: Member records and communication
- **Congregation Member**: Personal dashboard and giving history

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase/Neon recommended)
- **Authentication**: Clerk
- **Payments**: M-Pesa Daraja API
- **SMS**: Twilio
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Clerk account
- M-Pesa Daraja developer account
- Twilio account

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd indi-connect
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.local.example .env.local
```

Update `.env.local` with your credentials (see DEPLOYMENT.md for details)

4. Set up the database
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

5. Run the development server
```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
indi-connect/
├── app/
│   ├── admin/              # Admin dashboard (Inner Circle)
│   ├── api/                # API routes
│   │   ├── members/        # Member management
│   │   ├── contributions/  # Financial tracking
│   │   ├── parishes/       # Parish management
│   │   ├── projects/       # Project management
│   │   └── mpesa/          # M-Pesa integration
│   ├── components/         # React components
│   ├── config/             # Configuration files
│   └── dashboard/          # Member dashboard
├── lib/                    # Utility libraries
│   ├── prisma.ts          # Prisma client
│   ├── mpesa.ts           # M-Pesa integration
│   └── twilio.ts          # Twilio SMS
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
└── public/                # Static assets
```

## Database Schema

The system uses a relational PostgreSQL database with the following main entities:

- **Users**: Church members with roles and parish assignments
- **Parishes**: Multiple church branches with M-Pesa paybill configuration
- **Contributions**: Financial records (tithe, cess, operations, projects)
- **Attendance**: Service attendance tracking
- **Projects**: Church building and fundraising projects
- **Milestones**: Spiritual milestones (baptism, confirmation, etc.)
- **Prayer Requests**: Member prayer requests

## API Endpoints

### Members
- `GET /api/members` - List all members
- `POST /api/members` - Create new member

### Contributions
- `GET /api/contributions` - List contributions (with filters)
- `POST /api/contributions` - Record contribution

### Parishes
- `GET /api/parishes` - List all parishes
- `POST /api/parishes` - Create new parish

### Projects
- `GET /api/projects` - List projects (with filters)
- `POST /api/projects` - Create new project

### M-Pesa
- `POST /api/mpesa/stk-push` - Initiate STK Push payment
- `POST /api/mpesa/stk-callback` - Handle payment callback
- `POST /api/mpesa/validation-confirmation` - Handle validation/confirmation

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables
4. Deploy

## Development

### Database Management
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# View database in Prisma Studio
npx prisma studio

# Seed database
npx prisma db seed
```

### Code Quality
```bash
# Lint code
npm run lint

# Build for production
npm run build
```

## Security Considerations

- All API routes are protected with Clerk authentication
- Role-based access control for sensitive operations
- Environment variables for sensitive data
- M-Pesa callbacks validated
- SQL injection prevention via Prisma ORM

## Support

For detailed deployment and configuration instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## License

Proprietary - AIPCA Church Management System
