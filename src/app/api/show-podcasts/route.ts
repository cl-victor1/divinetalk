import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);
const EXCLUDED_USER_IDS = [
  '52038f8d-908a-440f-99d0-52014a10ea2c',
  '52295eae-d4a3-44fb-a42a-8d2f7e817ce8',
  '2cca136a-01da-4716-9b8a-59e978ac9c4d',
  '30828e02-324e-4ca8-9681-ede8308b9a9c',
  '72e8c0bb-3e2a-42e4-a6a5-ba50f31a97d0',
  '92f119e6-5d40-4030-9b43-5c26dea73a0c',
  'ff238ca2-4226-4275-9018-3d30a09d2c36',
];

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('user_podcasts')
      .select('slug, created_at, title')
      .gt('created_at', '2024-11-08 04:30:03.012676+00')
      .not('user_id', 'in', EXCLUDED_USER_IDS)
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch podcasts' }, { status: 500 });
  }
} 

export const runtime = 'edge';
