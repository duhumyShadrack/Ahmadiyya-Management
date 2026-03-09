// app/api/whatsapp/webhook/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Twilio/WhatsApp payload keys (may vary slightly depending on provider)
    const from = formData.get('From')?.toString();           // whatsapp:+5011234567
    const body = formData.get('Body')?.toString()?.trim();   // user's message
    const messageSid = formData.get('MessageSid')?.toString();

    if (!from || !body) {
      return new Response('Missing parameters', { status: 400 });
    }

    // Normalize phone number (remove whatsapp: prefix)
    const phone = from.replace('whatsapp:', '');

    const supabase = createClient();

    // 1. Find the customer by phone
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('phone', phone)
      .maybeSingle();

    if (custErr || !customer) {
      console.error('No customer found for phone:', phone);
      // Still return 200 – WhatsApp requires OK response
      return new Response('OK', { status: 200 });
    }

    // 2. Find any relevant overdue invoices for this customer
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('id, amount, due_date, status')
      .eq('customer_id', customer.id)
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString());

    if (!overdueInvoices?.length) {
      // Optional: polite response if no overdue
      await sendWhatsAppMessage(phone, `Hi ${customer.name}, thank you for your message. You have no overdue invoices at the moment.`);
      return new Response('OK', { status: 200 });
    }

    // 3. Simple intent detection (expandable)
    const msgLower = body.toLowerCase();

    if (msgLower.includes('pay') || msgLower.includes('pagar') || msgLower === 'yes') {
      // Send payment link (replace with real Stripe/PayPal/etc link)
      const paymentLink = `https://pay.yourdomain.com/invoice/${overdueInvoices[0].id}`;
      await sendWhatsAppMessage(
        phone,
        `Thank you ${customer.name}!\n\nPlease complete payment here:\n${paymentLink}\n\nAmount due: $${overdueInvoices[0].amount}`
      );
    } 
    else if (msgLower.includes('info') || msgLower.includes('details') || msgLower.includes('cuánto')) {
      const inv = overdueInvoices[0];
      await sendWhatsAppMessage(
        phone,
        `Invoice #${inv.id}\nAmount: $${inv.amount}\nDue date: ${new Date(inv.due_date).toLocaleDateString()}\n\nReply PAY to get payment link.`
      );
    } 
    else if (msgLower.includes('no') || msgLower.includes('cannot') || msgLower.includes('no puedo')) {
      await sendWhatsAppMessage(
        phone,
        `Understood. We'll follow up with you soon regarding invoice #${overdueInvoices[0].id}.`
      );
      // Escalate / log
      await supabase.from('collection_logs').insert({
        customer_id: customer.id,
        invoice_id: overdueInvoices[0].id,
        message: body,
        channel: 'whatsapp',
        needs_human: true,
      });
    } 
    else {
      // Unknown reply → polite fallback + log
      await sendWhatsAppMessage(
        phone,
        `Hi ${customer.name}, thank you for replying. Please use one of these:\n• PAY – get payment link\n• INFO – see invoice details`
      );
      await supabase.from('collection_logs').insert({
        customer_id: customer.id,
        invoice_id: overdueInvoices[0].id,
        message: body,
        channel: 'whatsapp',
      });
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    return new Response('OK', { status: 200 }); // Always return 200 to WhatsApp/Twilio
  }
}

// Helper: send message back (same Twilio/WhatsApp API)
async function sendWhatsAppMessage(toPhone: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = 'whatsapp:+14155238886'; // your Twilio WhatsApp sender

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: `whatsapp:${toPhone}`,
      From: fromNumber,
      Body: message,
    }),
  });
}
