# Supabase Authentication Setup Guide

## Enable Email Authentication in Supabase

The error "Unsupported provider: Provider email could not be found" means email authentication needs to be enabled in your Supabase project.

### Steps to Enable Email Auth:

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Enable Email Provider**
   - Go to **Authentication** → **Providers** in the left sidebar
   - Find **Email** provider
   - Toggle it to **Enabled**
   - Configure email settings:
     - **Enable email confirmations**: Optional (recommended for production)
     - **Secure email change**: Enable for security

3. **Configure Email Templates (Optional)**
   - Go to **Authentication** → **Email Templates**
   - Customize the confirmation, magic link, and password reset emails
   - For development, you can disable email confirmations to test faster

4. **Set Site URL**
   - Go to **Authentication** → **URL Configuration**
   - Set **Site URL** to: `http://localhost:3000` (for development)
   - Add **Redirect URLs**:
     - `http://localhost:3000/dashboard`
     - `http://localhost:3000/auth/callback`
   - For production, add your production URL

5. **Configure Email Settings**
   - Go to **Settings** → **Auth**
   - Under **Email Auth**, ensure:
     - ✅ Enable email signup
     - ✅ Enable email login
     - Configure SMTP settings if you want custom email sending

### Quick Test (Development Mode)

For quick testing during development, you can:

1. Disable email confirmations:
   - Go to **Authentication** → **Providers** → **Email**
   - Uncheck "Enable email confirmations"

2. This allows users to sign up and sign in immediately without email verification

### Troubleshooting

If you still get errors:

1. **Check Environment Variables**
   ```bash
   # In your .env.local file
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Verify Redirect URLs**
   - Make sure your redirect URL is whitelisted in Supabase dashboard
   - Check that `http://localhost:3000/dashboard` is in the allowed redirect URLs

3. **Check Browser Console**
   - Open browser dev tools (F12)
   - Look for any additional error messages

4. **Test with Supabase CLI (Optional)**
   ```bash
   npx supabase auth sign-up --email test@example.com --password testpassword
   ```

### Production Setup

For production:

1. Enable email confirmations
2. Configure custom SMTP (recommended)
3. Set up proper site URL and redirect URLs
4. Configure rate limiting
5. Enable additional security features (2FA, etc.)

### Additional OAuth Providers (Optional)

If you want to add Google, GitHub, etc.:

1. Go to **Authentication** → **Providers**
2. Enable the desired provider
3. Configure OAuth credentials
4. Update the login page:
   ```tsx
   providers={["google", "github"]}
   ```

Then the providers will appear as buttons alongside email/password.

