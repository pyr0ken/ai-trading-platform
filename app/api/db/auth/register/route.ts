import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    const email = `${cleanUsername}@steepquant.com`;

    const supabase = getSupabaseServerClient();

    // Create user in Supabase Auth via Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: cleanUsername },
    });

    if (authError) {
      // If user already exists in auth, return clean error
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return NextResponse.json(
          { success: false, error: `Username @${cleanUsername} is already registered. Please sign in instead.` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: authError.message },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // Ensure profile row exists in public.profiles
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      username: cleanUsername,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (profileError) {
      console.warn('Profile upsert warning:', profileError.message);
    }

    // Ensure paper account exists
    await supabase.from('paper_accounts').upsert({
      user_id: userId,
      balance: 10000.00,
      equity: 10000.00,
    }, { onConflict: 'user_id' });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        username: cleanUsername,
        created_at: authData.user.created_at,
      },
    });
  } catch (error) {
    console.error('Error in /api/db/auth/register:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Registration failed.' },
      { status: 500 }
    );
  }
}
