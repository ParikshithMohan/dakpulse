import type { APIRoute } from 'astro';
import { getTrackingDetails, isValidConsignmentNumber, sanitizeConsignmentNumber } from '../../lib/tracking-engine';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const consignment = url.searchParams.get('consignment') ?? '';

  if (!consignment) {
    return new Response(
      JSON.stringify({ success: false, error: 'Consignment number is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const sanitized = sanitizeConsignmentNumber(consignment);
  if (!isValidConsignmentNumber(sanitized)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid India Post consignment number format. Expected 13 characters (e.g. EK123456789IN, CX137150258IN)',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const details = await getTrackingDetails(sanitized);
  if (!details) {
    return new Response(
      JSON.stringify({ success: false, error: 'Consignment tracking details not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data: details }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
