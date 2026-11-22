import { describe, expect, it } from 'vitest';
import { calculatePostage, estimateDistanceSlabFromPincodes } from '../src/lib/postage-engine';
import { buildSmartMilestones } from '../src/lib/audit-trail';
import type { TrackingEvent } from '../src/lib/types';

describe('India Post Postage Engine', () => {
  it('correctly calculates Speed Post tariff with 18% GST for 250g within 201-1000km slab', () => {
    const res = calculatePostage({
      weightGrams: 250,
      distanceSlab: '201_to_1000',
    });

    const speedPost = res.options.find((o) => o.serviceCode === 'speed_post');
    expect(speedPost).toBeDefined();
    // 201g to 500g slab for 201-1000km is ₹60 base + 18% GST (10.8) = ₹70.8
    expect(speedPost?.baseTariff).toBe(60);
    expect(speedPost?.gst).toBe(10.8);
    expect(speedPost?.totalTariff).toBe(70.8);
    expect(speedPost?.isEligible).toBe(true);
    expect(speedPost?.isRecommended).toBe(true);
  });

  it('correctly detects distance slab from 6-digit Pincodes', () => {
    // Same city prefix (e.g. 560001 Bangalore to 560034 Bangalore)
    expect(estimateDistanceSlabFromPincodes('560001', '560034').slab).toBe('local');

    // Intra-district (e.g. 560001 Bangalore GPO to 562106 Ramanagara)
    expect(estimateDistanceSlabFromPincodes('560001', '562106').slab).toBe('up_to_200');

    // Intra-state regional (e.g. 560001 Bangalore to 570001 Mysore)
    expect(estimateDistanceSlabFromPincodes('560001', '570001').slab).toBe('201_to_1000');

    // Cross-country (e.g. 110001 Delhi to 600001 Chennai)
    const longDist = estimateDistanceSlabFromPincodes('110001', '600001');
    expect(['1001_to_2000', 'above_2000']).toContain(longDist.slab);
  });

  it('handles item eligibility limits (e.g. registered post max 2kg)', () => {
    const res = calculatePostage({
      weightGrams: 3500, // 3.5 kg
      distanceSlab: 'local',
    });

    const regPost = res.options.find((o) => o.serviceCode === 'registered_post');
    expect(regPost?.isEligible).toBe(false);
    expect(regPost?.ineligibilityReason).toContain('2 kg');

    const businessParcel = res.options.find((o) => o.serviceCode === 'business_parcel');
    expect(businessParcel?.isEligible).toBe(true);
  });
});

describe('Smart Audit Trail Compaction', () => {
  it('deduplicates repetitive RMS scans into high-level customer milestones', () => {
    const rawEvents: TrackingEvent[] = [
      { date: '19/11/2026', time: '15:42:00', office: 'Assand SO (132039)', event: 'Item Delivered', status: 'delivered' },
      { date: '19/11/2026', time: '09:12:00', office: 'Assand SO (132039)', event: 'Out for Delivery', status: 'out_for_delivery' },
      { date: '19/11/2026', time: '08:30:15', office: 'Assand SO (132039)', event: 'BAG_OPEN', status: 'in_transit' },
      { date: '18/11/2026', time: '22:15:44', office: 'KARNAL RMS (132001)', event: 'BAG_DISPATCH', status: 'in_transit' },
      { date: '18/11/2026', time: '21:30:10', office: 'KARNAL RMS (132001)', event: 'TMO_RECEIVE', status: 'in_transit' },
      { date: '18/11/2026', time: '20:45:00', office: 'KARNAL RMS (132001)', event: 'BAG_OPEN', status: 'in_transit' },
      { date: '18/11/2026', time: '19:10:00', office: 'KARNAL RMS (132001)', event: 'BAG_CLOSE', status: 'in_transit' },
      { date: '14/11/2026', time: '14:15:30', office: 'Udamalpet MDG (642126)', event: 'Item Booked', status: 'booked' },
    ];

    const milestones = buildSmartMilestones(rawEvents);
    // Raw events: 8 -> Consolidated hubs: 3 (Assand, Karnal, Udamalpet)
    expect(milestones.length).toBe(3);
    expect(milestones[0].title).toBe('Delivered to Recipient');
    expect(milestones[0].scansCount).toBe(3); // 3 scans consolidated
    expect(milestones[1].title).toContain('Karnal');
    expect(milestones[1].scansCount).toBe(4); // 4 scans consolidated
    expect(milestones[2].title).toContain('Udamalpet');
  });
});
