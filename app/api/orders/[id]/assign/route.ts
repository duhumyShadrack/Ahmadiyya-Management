import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  // 1. Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Admin / manager role check
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
  }

  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden – only admins/managers can assign drivers' }, { status: 403 });
  }

  // 3. Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { driver_id } = body; // string (profile id) or null to unassign

  // Optional: validate driver exists & is actually a driver
  if (driver_id) {
    const { data: driverCheck } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', driver_id)
      .single();

    if (!driverCheck || driverCheck.role !== 'driver') {
      return NextResponse.json({ error: 'Invalid driver ID or user is not a driver' }, { status: 400 });
    }
  }

  // 4. Update the order
  const { error: updateError } = await supabase
    .from('orders')
    .update({ driver_id })
    .eq('id', params.id);

  if (updateError) {
    console.error('Order update failed:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 5. Create notification for the assigned driver (if assigning, not unassigning)
  if (driver_id) {
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: driver_id, // assuming profiles.id matches auth.users.id
      title: 'New Order Assigned',
      body: `You have been assigned to order #${params.id.slice(0, 8)}`,
      type: 'success',
      order_id: params.id,
      read: false,
    });

    if (notifError) {
      console.error('Notification creation failed:', notifError);
      // Don't fail the whole request – log only
    }
  }

  // 6. Success response
  return NextResponse.json({
    success: true,
    message: driver_id
      ? 'Driver assigned and notification sent'
      : 'Driver unassigned successfully',
  });
}
