import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { latitude, longitude } = body;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
  }

  // Upsert: update if exists, insert if new
  const { error } = await supabase
    .from('driver_locations')
    .upsert(
      {
        driver_id: user.id,
        latitude,
        longitude,
        last_updated: new Date().toISOString(),
      },
      { onConflict: 'driver_id' }
    );

  if (error) {
    console.error('Location upsert failed:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
