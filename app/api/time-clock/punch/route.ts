import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { type, latitude, longitude, accuracy } = body;

  if (!['in', 'out'].includes(type)) {
    return NextResponse.json({ error: 'Type must be "in" or "out"' }, { status: 400 });
  }

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return NextResponse.json({ error: 'Valid latitude and longitude required' }, { status: 400 });
  }

  // Optional geofence check (uncomment if you added job_sites table)
  /*
  if (body.job_site_id) {
    const { data: site } = await supabase
      .from('job_sites')
      .select('latitude, longitude, radius_meters')
      .eq('id', body.job_site_id)
      .single();

    if (site) {
      const distance = getDistanceInMeters(
        latitude, longitude,
        site.latitude, site.longitude
      );
      if (distance > (site.radius_meters || 100)) {
        return NextResponse.json(
          { error: `You must be within ${site.radius_meters || 100}m of the job site to punch` },
          { status: 403 }
        );
      }
    }
  }
  */

  const { error } = await supabase.from('time_clock_entries').insert({
    user_id: user.id,
    type,
    latitude,
    longitude,
    accuracy,
    // job_site_id: body.job_site_id || null,
    // notes: body.notes || null,
  });

  if (error) {
    console.error('Punch error:', error);
    return NextResponse.json({ error: 'Failed to record punch' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Clocked ${type === 'in' ? 'IN' : 'OUT'} successfully`,
  });
}

// Helper function (haversine)
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
