import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { adjustment } = body; // e.g. 50 or -20

  if (typeof adjustment !== 'number') {
    return NextResponse.json({ error: 'Invalid adjustment' }, { status: 400 });
  }

  // Get current balance first
  const { data: cust } = await supabase.from('customers').select('balance').eq('id', params.id).single();
  if (!cust) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const newBalance = (cust.balance || 0) + adjustment;

  const { error } = await supabase
    .from('customers')
    .update({ balance: newBalance })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, newBalance });
}
