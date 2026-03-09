// supabase/functions/overdue-reminder/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async () => {
  console.log('Overdue reminder function started at', new Date().toISOString());

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch overdue invoices
  const { data: overdueInvoices, error } = await supabase
    .from('invoices')
    .select(`
      id, amount, due_date, status, reminder_count, reminder_level, last_reminder_sent,
      customer:customers (id, name, phone, email, whatsapp_number)
    `)
    .eq('status', 'pending')
    .lt('due_date', thirtyDaysAgo.toISOString())
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching overdue invoices:', error);
    return new Response('Error fetching overdue invoices', { status: 500 });
  }

  if (!overdueInvoices?.length) {
    console.log('No overdue invoices found.');
    return new Response('No overdue invoices to process', { status: 200 });
  }

  console.log(`Found ${overdueInvoices.length} overdue invoices`);

  for (const inv of overdueInvoices) {
    const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000);
    const currentLevel = inv.reminder_level || 0;

    let sent = false;

    // Reminder escalation logic
    if (daysOverdue >= 30 && currentLevel < 3) {
      await sendFinalWarning(inv);
      sent = true;
      console.log(`Final warning sent for invoice ${inv.id}`);
    } else if (daysOverdue >= 15 && currentLevel < 2) {
      await sendVoiceReminder(inv);
      sent = true;
      console.log(`Voice reminder sent for invoice ${inv.id}`);
    } else if (daysOverdue >= 8 && currentLevel < 1) {
      await sendEmailReminder(inv);
      sent = true;
      console.log(`Email reminder sent for invoice ${inv.id}`);
    } else if (daysOverdue >= 1 && currentLevel < 0) {
      await sendWhatsAppReminder(inv);
      sent = true;
      console.log(`WhatsApp reminder sent for invoice ${inv.id}`);
    }

    if (sent) {
      const newLevel = currentLevel + 1;
      const { error: updateErr } = await supabase
        .from('invoices')
        .update({ 
          reminder_level: newLevel,
          last_reminder_sent: new Date().toISOString(),
          reminder_count: (inv.reminder_count || 0) + 1,
        })
        .eq('id', inv.id);

      if (updateErr) {
        console.error(`Failed to update invoice ${inv.id}:`, updateErr);
      }
    }
  }

  return new Response('Overdue reminders processed successfully', { status: 200 });
});

// ────────────────────────────────────────────────
// Helper functions (implement with real credentials)
// ────────────────────────────────────────────────

async function sendWhatsAppReminder(invoice: any) {
  const customer = invoice.customer;
  const message = `Dear ${customer.name},\n\nYour invoice #${invoice.id} for $${invoice.amount} is overdue since ${new Date(invoice.due_date).toLocaleDateString()}.\n\nReply PAY for payment link or INFO for details.`;

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = 'whatsapp:' + Deno.env.get('TWILIO_WHATSAPP_NUMBER');

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: `whatsapp:${customer.whatsapp_number || customer.phone}`,
      From: fromNumber,
      Body: message,
    }),
  });

  if (!res.ok) {
    console.error('WhatsApp send failed:', await res.text());
  }
}

async function sendEmailReminder(invoice: any) {
  const customer = invoice.customer;
  const message = `Dear ${customer.name},\n\nInvoice #${invoice.id} for $${invoice.amount} is overdue.\n\nPlease settle soon. Payment link: [insert link]`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'billing@yourdomain.com',
      to: customer.email,
      subject: `Overdue Invoice #${invoice.id} - Action Required`,
      text: message,
      html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
    }),
  });

  if (!res.ok) {
    console.error('Email send failed:', await res.text());
  }
}

async function sendVoiceReminder(invoice: any) {
  const customer = invoice.customer;

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: customer.phone,
      From: Deno.env.get('TWILIO_PHONE_NUMBER')!,
      Url: 'https://yourdomain.com/api/twiml/reminder', // your TwiML endpoint
    }),
  });

  if (!res.ok) {
    console.error('Voice call failed:', await res.text());
  }
}

async function sendFinalWarning(invoice: any) {
  // Send both email & WhatsApp + log escalation
  await sendEmailReminder(invoice);
  await sendWhatsAppReminder(invoice);

  await supabase.from('collection_logs').insert({
    invoice_id: invoice.id,
    customer_id: invoice.customer_id,
    message: 'Final warning sent – escalate to human collection',
    channel: 'system',
    needs_human: true,
  });
}
