import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { type, latitude, longitude, accuracy, job_site_id } = body;

  if (!['in', 'out'].includes(type) || typeof latitude !== 'number' || typeof longitude !== 'number') {
    return NextResponse.json({ error: 'Invalid punch data' }, { status: 400 });
  }

  // Optional: Geofence verification (uncomment & adjust)
  // if (job_site_id) {
  //   const { data: site } = await supabase.from('job_sites').select('latitude, longitude, radius_meters').eq('id', job_site_id).single();
  //   if (site) {
  //     const distance = calculateDistance(latitude, longitude, site.latitude, site.longitude);
  //     if (distance > (site.radius_meters || 100)) {
  //       return NextResponse.json({ error: 'You are not at the job site' }, { status: 403 });
  //     }
  //   }
  // }

  const { error } = await supabase.from('time_clock_entries').insert({
    user_id: user.id,
    type,
    latitude,
    longitude,
    accuracy,
    job_site_id,
  });

  if (error) {
    console.error('Punch failed:', error);
    return NextResponse.json({ error: 'Failed to record punch' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: `Clocked ${type === 'in' ? 'in' : 'out'} successfully` });
}

// Optional helper (haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in meters
}
