// app/api/whatsapp/webhook/route.ts

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();

  const from = formData.get('From')?.toString(); // whatsapp:+501...
  const body = formData.get('Body')?.toString()?.trim().toLowerCase() || '';

  if (!from || !body) {
    return new Response('Missing params', { status: 200 });
  }

  const phone = from.replace('whatsapp:', '');

  const supabase = createClient();

  // Find customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name')
    .eq('phone', phone)
    .single();

  if (!customer) return new Response('OK', { status: 200 });

  // Find oldest overdue invoice
  const { data: overdue } = await supabase
    .from('invoices')
    .select('id, amount, due_date')
    .eq('customer_id', customer.id)
    .eq('status', 'pending')
    .order('due_date')
    .limit(1);

  if (!overdue?.length) {
    await sendWhatsApp(phone, `Hi ${customer.name}, no overdue invoices. Thank you!`);
    return new Response('OK', { status: 200 });
  }

  const inv = overdue[0];

  if (body.includes('pay') || body.includes('pagar') || body === 'yes') {
    const paymentLink = `https://pay.yourdomain.com/invoice/${inv.id}`;
    await sendWhatsApp(phone, `Thank you! Pay here:\n${paymentLink}\nAmount: $${inv.amount}`);
  } else if (body.includes('info') || body.includes('details') || body.includes('cuánto')) {
    await sendWhatsApp(phone, `Invoice #${inv.id}\nAmount: $${inv.amount}\nDue: ${new Date(inv.due_date).toLocaleDateString()}\nReply PAY for link.`);
  } else if (body.includes('no') || body.includes('cannot') || body.includes('no puedo')) {
    await sendWhatsApp(phone, `Understood. A team member will contact you soon.`);
    await logConversation(customer.id, inv.id, body, 'whatsapp', true);
  } else {
    await sendWhatsApp(phone, `Hi ${customer.name}, please reply:\nPAY - payment link\nINFO - invoice details`);
    await logConversation(customer.id, inv.id, body, 'whatsapp', false);
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

async function logConversation(customerId: string, invoiceId: string, message: string, channel: string, needsHuman: boolean) {
  const supabase = createClient();
  await supabase.from('collection_logs').insert({
    customer_id: customerId,
    invoice_id: invoiceId,
    message,
    channel,
    needs_human: needsHuman,
  });
}
