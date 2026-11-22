import type { APIRoute } from 'astro';
import { calculatePostage, estimateDistanceSlabFromPincodes, type DistanceSlab } from '../../lib/postage-engine';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const weightParam = url.searchParams.get('weight');
  const originPin = url.searchParams.get('origin') || '';
  const destPin = url.searchParams.get('dest') || '';
  const slabParam = url.searchParams.get('slab') as DistanceSlab | null;

  const weightGrams = Math.max(1, Math.min(35000, parseInt(weightParam || '250', 10) || 250));

  let slab: DistanceSlab = slabParam || '201_to_1000';
  if (originPin && destPin) {
    const estimated = estimateDistanceSlabFromPincodes(originPin, destPin);
    slab = estimated.slab;
  }

  const result = calculatePostage({
    weightGrams,
    distanceSlab: slab,
    originPincode: originPin,
    destinationPincode: destPin,
  });

  return new Response(JSON.stringify({ success: true, data: result }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
