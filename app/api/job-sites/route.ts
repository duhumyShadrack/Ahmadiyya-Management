import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('job_sites')
    .select('id, name, latitude, longitude, radius_meters')
    .order('name');

  if (error) return NextResponse.json({ error: 'Failed to fetch job sites' }, { status: 500 });

  return NextResponse.json(data || []);
}
