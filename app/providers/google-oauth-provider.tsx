"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";

export function GoogleOAuthAppProvider({ children }: { children: React.ReactNode }) {
  if (!googleClientId) {
    return <>{children}</>;
  }

  return <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>;
}
