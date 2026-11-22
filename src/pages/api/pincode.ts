import type { APIRoute } from 'astro';
import { lookupPincode } from '../../lib/postal-api';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') ?? '';

  if (!query.trim()) {
    return new Response(
      JSON.stringify({ success: false, error: 'Query parameter is required (e.g. 110001 or Delhi)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const offices = await lookupPincode(query);
    return new Response(
      JSON.stringify({ success: true, count: offices.length, offices }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to look up postal pincode directory' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
