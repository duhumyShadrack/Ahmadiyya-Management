// app/api/whatsapp/webhook/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();

  const from = formData.get('From')?.toString(); // whatsapp:+501...
  const body = formData.get('Body')?.toString()?.trim() || '';
  const messageSid = formData.get('MessageSid')?.toString();

  if (!from || !body) return new Response('OK', { status: 200 });

  const phone = from.replace('whatsapp:', '');

  const supabase = createClient();

  // Find customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('phone', phone)
    .single();

  if (!customer) {
    await sendWhatsApp(phone, 'Hi! This is Ahmadiyya Management. Please contact us directly for assistance.');
    return new Response('OK', { status: 200 });
  }

  // Find oldest overdue invoice
  const { data: overdue } = await supabase
    .from('invoices')
    .select('id, amount, due_date, status')
    .eq('customer_id', customer.id)
    .eq('status', 'pending')
    .order('due_date')
    .limit(1);

  if (!overdue?.length) {
    await sendWhatsApp(phone, `Hi ${customer.name}, no overdue invoices. Thank you for staying on top!`);
    return new Response('OK', { status: 200 });
  }

  const inv = overdue[0];
  const msg = body.toLowerCase();

  // Advanced intent detection
  if (msg.includes('pay') || msg.includes('pagar') || msg.includes('payment') || msg === 'yes' || msg.includes('pay now')) {
    const paymentLink = `https://pay.yourdomain.com/invoice/${inv.id}`; // or call your /api/payments/link
    await sendWhatsApp(phone, `Great! Pay your invoice #${inv.id} here:\n${paymentLink}\nAmount: $${inv.amount}\nDue: ${new Date(inv.due_date).toLocaleDateString()}`);
    await logConversation(customer.id, inv.id, body, 'whatsapp', false, 'payment_requested');
  } 
  else if (msg.includes('info') || msg.includes('details') || msg.includes('how much') || msg.includes('cuánto') || msg === 'balance') {
    await sendWhatsApp(phone, `Invoice #${inv.id}\nAmount: $${inv.amount}\nDue date: ${new Date(inv.due_date).toLocaleDateString()}\n\nReply PAY for payment link or ASK for more help.`);
    await logConversation(customer.id, inv.id, body, 'whatsapp', false, 'info_requested');
  } 
  else if (msg.includes("can't") || msg.includes('no puedo') || msg.includes('no') || msg.includes('later') || msg.includes('wait')) {
    await sendWhatsApp(phone, `Understood. We'll note this and follow up soon. Please try to pay as soon as possible to avoid extra charges. Reply INFO anytime.`);
    await logConversation(customer.id, inv.id, body, 'whatsapp', true, 'payment_delayed');
  } 
  else if (msg.includes('paid') || msg.includes('done') || msg.includes('sent') || msg.includes('transfer')) {
    await sendWhatsApp(phone, `Thank you for the update! We'll verify the payment and update your account. If there's any issue, we'll contact you.`);
    await logConversation(customer.id, inv.id, body, 'whatsapp', false, 'payment_claimed');
    // Optional: mark as 'paid_pending_verification' or notify admin
  } 
  else {
    await sendWhatsApp(phone, `Hi ${customer.name}, thanks for your message. For invoice #${inv.id}:\n• Reply PAY for payment link\n• Reply INFO for details\n• Or tell us how we can help!`);
    await logConversation(customer.id, inv.id, body, 'whatsapp', true, 'unknown_intent');
  }

  return new Response('OK', { status: 200 });
}

async function sendWhatsApp(to: string, message: string) {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER;

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: `whatsapp:${to}`,
      From: from,
      Body: message,
    }),
  });
}

async function logConversation(customerId: string, invoiceId: string, message: string, channel: string, needsHuman: boolean, intent: string) {
  const supabase = createClient();
  await supabase.from('collection_logs').insert({
    customer_id: customerId,
    invoice_id: invoiceId,
    message,
    channel,
    needs_human: needsHuman,
    intent,
  });
}
