import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/**
 * Handles email verification tokens.
 * This allows using your own domain for verification links instead of Supabase's URL.
 * 
 * Usage in email template:
 * {{ .SiteURL }}/api/auth/verify?token={{ .Token }}&type={{ .Type }}&redirect_to={{ .RedirectTo }}
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token_hash') || searchParams.get('token');
  const type = searchParams.get('type') as 'signup' | 'recovery' | 'invite' | 'email_change' | null;
  const redirectTo = searchParams.get('redirect_to');

  if (!token || !type) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type === 'signup' ? 'email' : type,
    });

    if (error) {
      console.error('Verification error:', error.message);
      
      // Determine redirect based on error type
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/forgot-password?error=expired', request.url));
      }
      return NextResponse.redirect(new URL('/login?error=verification_failed', request.url));
    }

    // Success - redirect based on type
    if (type === 'recovery') {
      const session = data?.session;
      if (!session?.access_token || !session.refresh_token) {
        return NextResponse.redirect(new URL('/forgot-password?error=invalid_session', request.url));
      }

      const redirectUrl = new URL('/reset-password', request.url);
      redirectUrl.searchParams.set('access_token', session.access_token);
      redirectUrl.searchParams.set('refresh_token', session.refresh_token);
      return NextResponse.redirect(redirectUrl);
    }
    
    if (type === 'signup') {
      return NextResponse.redirect(new URL('/confirmed-email', request.url));
    }

    // Default redirect
    const finalRedirect = redirectTo || '/practice';
    return NextResponse.redirect(new URL(finalRedirect, request.url));

  } catch (err) {
    console.error('Unexpected verification error:', err);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
