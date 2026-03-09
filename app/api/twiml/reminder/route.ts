// app/api/twiml/reminder/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Hello. This is an automated reminder from H Dee Handyman Services. Your invoice is overdue. Please contact us to arrange payment. Thank you.</Say>
  <Pause length="2" />
  <Say voice="Polly.Joanna">This call will repeat in a moment if not acknowledged.</Say>
</Response>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}
