export async function GET() {
  const supabase = createClient();
  const { data } = await supabase.from('job_sites').select('*').order('name');
  return NextResponse.json(data || []);
}
