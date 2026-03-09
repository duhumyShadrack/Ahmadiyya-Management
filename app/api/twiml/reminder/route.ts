// app/api/twiml/reminder/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Hello. This is an automated reminder from Ahmadiyya Management.
  </Say>
  <Pause length="1" />
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Your invoice is currently overdue. Please contact us as soon as possible to arrange payment.
  </Say>
  <Pause length="1" />
  <Say voice="Polly.Joanna-Neural" language="en-US">
    You can reply to our WhatsApp message or email for a payment link.
  </Say>
  <Pause length="2" />
  <Say voice="Polly.Joanna-Neural" language="en-US">
    Thank you for your prompt attention. Goodbye.
  </Say>
</Response>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}
