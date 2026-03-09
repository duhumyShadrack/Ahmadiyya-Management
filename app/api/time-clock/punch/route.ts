import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { type, latitude, longitude, accuracy, job_site_id } = body;

  if (!['in', 'out'].includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  if (typeof latitude !== 'number' || typeof longitude !== 'number') return NextResponse.json({ error: 'Invalid location' }, { status: 400 });

  // Geofence check
  const { data: site, error: siteErr } = await supabase
    .from('job_sites')
    .select('latitude, longitude, radius_meters')
    .eq('id', job_site_id)
    .single();

  if (siteErr || !site) return NextResponse.json({ error: 'Job site not found' }, { status: 404 });

  const distance = getDistanceInMeters(latitude, longitude, site.latitude, site.longitude);

  if (distance > (site.radius_meters || 100)) {
    return NextResponse.json({ error: 'You are not within the allowed radius of the job site' }, { status: 403 });
  }

  // Proceed with insert
  const { error } = await supabase.from('time_clock_entries').insert({
    user_id: user.id,
    type,
    latitude,
    longitude,
    accuracy,
    job_site_id,
  });

  if (error) return NextResponse.json({ error: 'Failed to record punch' }, { status: 500 });

  return NextResponse.json({ success: true, message: `Clocked ${type.toUpperCase()} successfully` });
}

// Haversine distance
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // meters
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}
