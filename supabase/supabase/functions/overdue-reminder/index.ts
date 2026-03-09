// supabase/functions/overdue-reminder/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: overdueInvoices, error } = await supabase
    .from('invoices')
    .select(`
      id, amount, due_date, status, customer_id,
      customer:customers (name, phone, email, whatsapp_number)
    `)
    .eq('status', 'pending')
    .lt('due_date', thirtyDaysAgo.toISOString())
    .order('due_date');

  if (error) {
    console.error('Failed to fetch overdue invoices', error);
    return new Response('Error', { status: 500 });
  }

  for (const inv of overdueInvoices || []) {
    const daysOverdue = Math.floor((Date.now() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));

    // Channel logic
    if (daysOverdue >= 30) {
      // Escalate to human + send final warning
      await sendFinalWarning(inv);
      await supabase.from('invoices').update({ escalated_to_human: true }).eq('id', inv.id);
    } else if (daysOverdue >= 15) {
      await sendWhatsAppReminder(inv);
      await sendEmailReminder(inv);
      await sendVoiceReminder(inv);
    } else if (daysOverdue >= 8) {
      await sendEmailReminder(inv);
    } else {
      await sendWhatsAppReminder(inv);
    }

    // Update counters
    await supabase
      .from('invoices')
      .update({ 
        reminder_count: inv.reminder_count + 1,
        last_reminder_sent: new Date().toISOString()
      })
      .eq('id', inv.id);
  }

  return new Response('Overdue reminders processed', { status: 200 });
});
