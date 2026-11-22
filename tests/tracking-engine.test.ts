import { describe, it, expect } from 'vitest';
import { isValidConsignmentNumber, sanitizeConsignmentNumber, getTrackingDetails } from '../src/lib/tracking-engine';
import { lookupPincode } from '../src/lib/postal-api';

describe('Tracking Engine & Validation', () => {
  it('validates 13-character Indian Post consignment numbers', () => {
    expect(isValidConsignmentNumber('CX137150258IN')).toBe(true);
    expect(isValidConsignmentNumber('ek 982143051 in')).toBe(true);
    expect(isValidConsignmentNumber('ED-451209384-IN')).toBe(true);
    expect(isValidConsignmentNumber('')).toBe(false);
    expect(isValidConsignmentNumber('EK12345678IN')).toBe(false); // 8 digits
    expect(isValidConsignmentNumber('EK1234567890IN')).toBe(false); // 10 digits
    expect(isValidConsignmentNumber('ABC123456789IN')).toBe(false); // 3 prefix chars
  });

  it('sanitizes consignment numbers', () => {
    expect(sanitizeConsignmentNumber('  cx 137150258 in  ')).toBe('CX137150258IN');
  });

  it('retrieves consignment details for real parcel CX137150258IN', async () => {
    const details = await getTrackingDetails('CX137150258IN');
    expect(details).not.toBeNull();
    expect(details?.consignmentNumber).toBe('CX137150258IN');
    expect(details?.events.length).toBeGreaterThanOrEqual(1);
    expect(details?.route.length).toBeGreaterThanOrEqual(2);
    expect(details?.route[0].isOrigin).toBe(true);
    expect(details?.route[details.route.length - 1].isDestination).toBe(true);
  }, 15000);

  it('retrieves consignment details for live parcel JA075033095IN', async () => {
    const details = await getTrackingDetails('JA075033095IN');
    expect(details).not.toBeNull();
    expect(details?.consignmentNumber).toBe('JA075033095IN');
    expect(details?.events.length).toBeGreaterThanOrEqual(1);
  }, 15000);

  it('deterministically generates tracking for any valid consignment number', async () => {
    const details = await getTrackingDetails('EM998877665IN');
    expect(details).not.toBeNull();
    expect(details?.consignmentNumber).toBe('EM998877665IN');
    expect(['booked', 'dispatched', 'in_transit', 'out_for_delivery', 'delivered']).toContain(details?.currentStatus);
    expect(details?.events.length).toBeGreaterThan(0);
    expect(details?.route.length).toBeGreaterThanOrEqual(2);
  });

  it('returns null for invalid consignment numbers', async () => {
    expect(await getTrackingDetails('INVALID')).toBeNull();
  });
});

describe('Postal Pincode Client', () => {
  it('retrieves postal office details for pincode 110001', async () => {
    const offices = await lookupPincode('110001');
    expect(offices.length).toBeGreaterThan(0);
    expect(offices[0].pincode).toBe('110001');
    expect(offices[0].state).toBe('Delhi');
  });

  it('retrieves postal office details for pincode 110019', async () => {
    const offices = await lookupPincode('110019');
    expect(offices.length).toBeGreaterThan(0);
    expect(offices[0].pincode).toBe('110019');
  });

  it('returns empty array for empty query', async () => {
    const offices = await lookupPincode('');
    expect(offices).toEqual([]);
  });
});
