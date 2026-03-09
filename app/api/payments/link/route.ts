// app/api/payments/link/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: Request) {
  const supabase = createClient();
  const { invoiceId } = await request.json();

  if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 });

  // Fetch invoice & customer
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      id, amount,
      customer:customers (email, name, phone)
    `)
    .eq('id', invoiceId)
    .single();

  if (error || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'bzd', // Belize Dollar – change to 'usd' if preferred
            product_data: {
              name: `Invoice #${invoice.id.slice(0, 8)} - ${invoice.customer?.name}`,
              description: 'Payment for services rendered',
            },
            unit_amount: Math.round(invoice.amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: invoice.id,
        customer_id: invoice.customer_id,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: 'https://yourdomain.com/payment/success?invoice_id={CHECKOUT_SESSION_ID}',
        },
      },
    });

    // Save link to invoice for reference
    await supabase
      .from('invoices')
      .update({ payment_link: paymentLink.url })
      .eq('id', invoice.id);

    return NextResponse.json({ success: true, link: paymentLink.url });
  } catch (err: any) {
    console.error('Stripe error:', err);
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 });
  }
}
