import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { invoiceId, channel } = await request.json();

  // Fetch invoice + customer
  const { data: inv } = await supabase
    .from('invoices')
    .select('*, customer:customers (phone, email, whatsapp_number)')
    .eq('id', invoiceId)
    .single();

  if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  // Send based on channel
  if (channel === 'whatsapp') {
    // Twilio WhatsApp
    // await sendWhatsAppReminder(inv);
  } else if (channel === 'email') {
    // Resend / SendGrid
    // await sendEmailReminder(inv);
  } else if (channel === 'voice') {
    // Twilio Voice
    // await sendVoiceReminder(inv);
  }

  // Log
  await supabase.from('collection_logs').insert({
    invoice_id: invoiceId,
    customer_id: inv.customer_id,
    message: `Manual reminder sent via ${channel}`,
    channel,
  });

  return NextResponse.json({ success: true });
}
