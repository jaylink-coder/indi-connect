# Indi Connect - Deployment Guide

## Prerequisites

1. **PostgreSQL Database** - Set up with Supabase, Neon, or local PostgreSQL
2. **Clerk Account** - For authentication (https://clerk.com)
3. **M-Pesa Daraja Account** - For payment integration (https://developer.safaricom.co.ke)
4. **Twilio Account** - For SMS notifications (https://twilio.com)
5. **Vercel Account** - For deployment (https://vercel.com)

## Environment Variables Setup

Update `.env.local` with your actual credentials:

### Database
```env
DATABASE_URL="postgresql://user:password@host:5432/database_name?schema=public"
```

### Clerk Authentication
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### M-Pesa Daraja API
```env
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379
MPESA_ENVIRONMENT=sandbox  # Change to "live" for production
```

### Twilio SMS
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### Church Configuration
```env
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
CHURCH_NAME="Indi Connect - AIPCA"
```

## Database Setup

### 1. Initialize Database
```bash
npx prisma migrate dev --name init
```

### 2. Seed Database with Sample Data
```bash
npx prisma db seed
```

### 3. View Database with Prisma Studio
```bash
npx prisma studio
```

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000

## Vercel Deployment

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial deployment setup"
git push origin main
```

### 2. Import to Vercel
1. Go to https://vercel.com
2. Import your GitHub repository
3. Vercel will automatically detect Next.js
4. Add environment variables in Vercel dashboard
5. Deploy

### 3. Configure Environment Variables in Vercel
Add all the environment variables from `.env.local` to your Vercel project settings.

## M-Pesa Daraja Setup

### 1. Get Credentials
- Log in to https://developer.safaricom.co.ke
- Create a new app
- Note down Consumer Key and Consumer Secret
- Generate Passkey for your shortcode

### 2. Configure Callback URLs
In your Daraja dashboard, set these callback URLs:
- Validation URL: `https://your-domain.vercel.app/api/mpesa/validation-confirmation`
- Confirmation URL: `https://your-domain.vercel.app/api/mpesa/validation-confirmation`
- STK Push Callback: `https://your-domain.vercel.app/api/mpesa/stk-callback`

## Clerk Setup

### 1. Create Application
- Log in to https://dashboard.clerk.com
- Create a new application
- Configure JWT templates and roles
- Add your domain to allowed origins

### 2. Configure Roles
Set up the following roles in Clerk:
- Super Admin
- Pastor
- Deacon
- Treasurer
- Secretary
- Congregation Member

## Twilio Setup

### 1. Get Credentials
- Log in to https://console.twilio.com
- Note down Account SID and Auth Token
- Purchase a phone number or use trial number

### 2. Configure SMS
Ensure your phone number is verified for trial accounts.

## Production Checklist

- [ ] Database connected and migrated
- [ ] Environment variables configured
- [ ] Clerk authentication working
- [ ] M-Pesa Daraja credentials set
- [ ] Twilio SMS configured
- [ ] SSL/HTTPS enabled (automatic on Vercel)
- [ ] Domain configured
- [ ] Test payment flow in sandbox
- [ ] Test SMS notifications
- [ ] Backup strategy in place
- [ ] Monitoring set up

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL format
- Check database is accessible
- Ensure Prisma client is generated: `npx prisma generate`

### M-Pesa Integration Issues
- Verify credentials are correct
- Check callback URLs are publicly accessible
- Test in sandbox environment first
- Check timestamps are in correct format

### Authentication Issues
- Verify Clerk keys are correct
- Check middleware configuration
- Ensure protected routes are properly set up

## Support

For issues related to:
- **Database**: Check Prisma documentation
- **Authentication**: Check Clerk documentation
- **Payments**: Check Safaricom Daraja documentation
- **SMS**: Check Twilio documentation
- **Deployment**: Check Vercel documentation
