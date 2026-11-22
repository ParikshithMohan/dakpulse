import type { APIRoute } from 'astro';
import { getTrackingDetails, isValidConsignmentNumber, sanitizeConsignmentNumber } from '../../lib/tracking-engine';
import type { BulkTrackingSummary, TrackingResult } from '../../lib/types';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const list: unknown = body?.consignments;

    if (!Array.isArray(list) || list.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Provide an array of consignment numbers under "consignments"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Limit to max 50 items per batch
    const sanitizedList = Array.from(
      new Set(
        list
          .filter((item): item is string => typeof item === 'string')
          .map((item) => sanitizeConsignmentNumber(item))
          .filter((item) => isValidConsignmentNumber(item))
      )
    ).slice(0, 50);

    if (sanitizedList.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No valid 13-character Indian Post consignment numbers found in request',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parallel resolution across live engine
    const detailsPromises = sanitizedList.map((awb) => getTrackingDetails(awb));
    const rawDetails = await Promise.all(detailsPromises);

    const results: TrackingResult[] = [];
    let delivered = 0;
    let inTransit = 0;
    let outForDelivery = 0;
    let exceptions = 0;

    for (const detail of rawDetails) {
      if (detail) {
        results.push(detail);
        if (detail.currentStatus === 'delivered') delivered++;
        else if (detail.currentStatus === 'out_for_delivery') outForDelivery++;
        else if (detail.currentStatus === 'exception' || detail.currentStatus === 'rto') exceptions++;
        else inTransit++;
      }
    }

    const summary: BulkTrackingSummary = {
      total: results.length,
      delivered,
      inTransit,
      outForDelivery,
      exceptions,
      results,
    };

    return new Response(
      JSON.stringify({ success: true, summary }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON payload in request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
