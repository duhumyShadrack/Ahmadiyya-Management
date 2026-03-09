import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { jobId } = body;

  // Fetch job details
  const { data: job } = await supabase
    .from('jobs')
    .select('amount, customer_id')
    .eq('id', jobId)
    .single();

  if (!job || !job.amount) return NextResponse.json({ error: 'Invalid job or no amount' }, { status: 400 });

  // Create invoice
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      job_id: jobId,
      customer_id: job.customer_id,
      amount: job.amount,
      due_date: dueDate.toISOString(),
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });

  // Generate PDF (use a library like pdf-lib or serverless service)
  // For now, placeholder URL
  const pdfUrl = `https://placeholder.com/invoice-${invoice.id}.pdf`;

  await supabase.from('invoices').update({ pdf_url: pdfUrl }).eq('id', invoice.id);

  return NextResponse.json({ success: true, invoice });
}
