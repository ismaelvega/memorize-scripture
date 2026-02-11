import { NextRequest, NextResponse } from 'next/server';
import { bootstrapProfileFromUser } from '@/lib/auth/profile-bootstrap';
import { sanitizeNextPath } from '@/lib/auth/oauth';
import { getSupabaseServerClient } from '@/lib/supabase/server-client';

function buildOAuthErrorRedirect(requestUrl: string): URL {
  const redirectUrl = new URL('/login', requestUrl);
  redirectUrl.searchParams.set('error', 'oauth_failed');
  return redirectUrl;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'), '/');
  const oauthErrorUrl = buildOAuthErrorRedirect(request.url);

  if (!code) {
    return NextResponse.redirect(oauthErrorUrl);
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(oauthErrorUrl);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await bootstrapProfileFromUser(supabase, user);
    }

    return NextResponse.redirect(new URL(nextPath, request.url));
  } catch {
    return NextResponse.redirect(oauthErrorUrl);
  }
}
