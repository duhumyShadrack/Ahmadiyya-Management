import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { invoiceId, channel } = await request.json();

  // Fetch invoice
  const { data: inv } = await supabase
    .from('invoices')
    .select('*, customer:customers (phone, email, whatsapp_number, name)')
    .eq('id', invoiceId)
    .single();

  if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  if (channel === 'whatsapp') {
    // Twilio WhatsApp
    const message = `Manual reminder: Invoice #${inv.id} for $${inv.amount} is overdue.`;
    // await sendWhatsApp(inv.customer.whatsapp_number || inv.customer.phone, message);
  } else if (channel === 'email') {
    // Resend
    // await sendEmailReminder(inv);
  } else if (channel === 'voice') {
    // Twilio Voice
    // await fetch('https://api.twilio.com/.../Calls.json', { ... });
  }

  // Log manual action
  await supabase.from('collection_logs').insert({
    invoice_id: invoiceId,
    customer_id: inv.customer_id,
    message: `Manual ${channel} reminder sent by admin`,
    channel,
  });

  return NextResponse.json({ success: true });
}
