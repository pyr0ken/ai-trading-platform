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

    // Authenticate user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    const userId = authData.user.id;

    // Fetch user profile
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        username: profile?.username || cleanUsername,
        created_at: profile?.created_at || authData.user.created_at,
      },
    });
  } catch (error) {
    console.error('Error in /api/db/auth/login:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Login failed.' },
      { status: 500 }
    );
  }
}
