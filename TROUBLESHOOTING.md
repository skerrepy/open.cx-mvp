# Troubleshooting Guide

## Sign In Button Does Nothing

If clicking the sign in button doesn't work, check the following:

### 1. Enable Email Authentication in Supabase

- Go to your Supabase Dashboard → **Authentication** → **Providers**
- Make sure **Email** provider is **Enabled**
- Under Email settings, ensure:
  - ✅ Enable email signup
  - ✅ Enable email login

### 2. Configure Redirect URLs

The redirect URL must be whitelisted in Supabase:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `http://localhost:3000` (for development)
3. In **Redirect URLs**, add:
   - `http://localhost:3000/dashboard`
   - `http://localhost:3000/**` (allows all localhost paths)

### 3. Check Browser Console

Open browser DevTools (F12) → Console tab and look for errors:
- If you see authentication errors, check your Supabase credentials
- If you see CORS errors, check your redirect URL configuration
- If you see network errors, check your internet connection and Supabase status

### 4. Verify Environment Variables

Make sure your `.env.local` file has:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Important**: Restart your dev server after changing environment variables:
```bash
# Stop the server (Ctrl+C) and restart
pnpm dev
```

### 5. Disable Email Confirmation (Development)

For faster testing during development:
- Go to **Authentication** → **Providers** → **Email**
- Uncheck **Enable email confirmations**
- This allows immediate login without email verification

### 6. Test Authentication Directly

Try signing in programmatically to see if there's an error:

```javascript
// In browser console on login page
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'yourpassword'
});
console.log({ data, error });
```

If this works but the UI doesn't, it's a UI/redirect issue.

## Infinite Rerender Issue (Fixed)

This has been fixed by:
- Removing router from useEffect dependencies
- Using useRef to prevent multiple redirects
- Using router.replace instead of router.push

If you still experience rerenders:
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check for multiple Supabase client instances

## Common Error Messages

### "Unsupported provider: Provider email could not be found"
→ Enable Email provider in Supabase Dashboard → Authentication → Providers

### "Invalid redirect URL"
→ Add your redirect URL to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

### "Email not confirmed"
→ Either confirm your email or disable email confirmations in Supabase settings (for development)

### "Invalid login credentials"
→ Check your email and password are correct

## Still Having Issues?

1. Check Supabase logs:
   - Go to **Logs** → **Auth Logs** in Supabase Dashboard
   - Look for failed authentication attempts

2. Verify Supabase project is active:
   - Check that your project isn't paused
   - Verify your API keys are correct

3. Check Next.js console:
   - Look at the terminal where `pnpm dev` is running
   - Check for any server-side errors

