import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as
    | 'invite'
    | 'recovery'
    | 'signup'
    | 'email'
    | null
  const code = searchParams.get('code')
  const redirect_to = searchParams.get('redirect_to') ?? '/'

  const supabase = await createClient()
  const baseUrl = request.nextUrl.origin

  if (code) {
    // PKCE flow
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        `${baseUrl}${redirect_to}?error=invalid_token`
      )
    }
    return NextResponse.redirect(`${baseUrl}${redirect_to}`)
  }

  if (token_hash && type) {
    // Implicit flow (invite, recovery)
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (error) {
      // Determine error redirect based on type
      const errorRedirect =
        type === 'invite' ? '/invite' : type === 'recovery' ? '/reset-password' : redirect_to
      return NextResponse.redirect(
        `${baseUrl}${errorRedirect}?error=invalid_token`
      )
    }
    // Determine success redirect based on type
    const successRedirect =
      type === 'invite' ? '/invite' : type === 'recovery' ? '/reset-password' : redirect_to
    return NextResponse.redirect(`${baseUrl}${successRedirect}`)
  }

  // No valid params
  return NextResponse.redirect(`${baseUrl}/login`)
}
