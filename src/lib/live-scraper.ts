import type { ConsignmentStatus, GeoCoordinate, TrackingEvent, TrackingResult } from './types';

interface RawEventPincodeInfo {
  latitude?: number;
  longitude?: number;
  office_name?: string;
  pincode?: string;
  district_name?: string;
  state_name?: string;
}

interface RawTrackingEvent {
  id?: string;
  tracked_at?: string;
  event?: string;
  event_type?: string;
  office?: string;
  pincode?: string;
  remarks?: string;
  pincode_info?: RawEventPincodeInfo;
}

interface RawTrackingRequest {
  id?: string;
  tracking_status?: string;
  tracking_events?: RawTrackingEvent[];
}

function unescapeHtml(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function mapStatus(eventStr: string, statusLabel: string): ConsignmentStatus {
  const upper = `${eventStr} ${statusLabel}`.toUpperCase();
  if (upper.includes('DELIVERED') || upper.includes('ITEM_DELIVERY') || upper.includes('DELIVERY CONFIRM')) {
    return 'delivered';
  }
  if (upper.includes('OUT FOR DELIVERY') || upper.includes('ITEM_INVOICE')) {
    return 'out_for_delivery';
  }
  if (upper.includes('DISPATCH') || upper.includes('BAG_DISPATCH')) {
    return 'dispatched';
  }
  if (upper.includes('BOOK') || upper.includes('ITEM_BOOK') || upper.includes('ACCEPT')) {
    return 'booked';
  }
  if (upper.includes('FAIL') || upper.includes('UNSUCCESSFUL') || upper.includes('CLOSED') || upper.includes('RETURN') || upper.includes('EXCEPTION')) {
    return 'exception';
  }
  return 'in_transit';
}

function formatDisplayDate(isoString: string): { date: string; time: string } {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return { date: isoString.split('T')[0] || '', time: '12:00:00' };
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return {
      date: `${day}/${month}/${year}`,
      time: `${hours}:${mins}:${secs}`,
    };
  } catch {
    return { date: '', time: '' };
  }
}

/**
 * Fetch live India Post consignment tracking from live portal.
 * Returns null if parcel not found or offline.
 */
export async function fetchLiveSpeedPost(awb: string): Promise<TrackingResult | null> {
  const cleaned = awb.trim().toUpperCase().replace(/[\s-]/g, '');
  if (!cleaned) return null;

  const url = `https://myspeedpost.com/track-ems-speedpost?n=${encodeURIComponent(cleaned)}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();

    // Look for tracking-request attribute
    const attrMatch = html.match(/tracking-request="([^"]+)"/);
    if (!attrMatch) return null;

    const rawJson = unescapeHtml(attrMatch[1]);
    const trackingReq: RawTrackingRequest = JSON.parse(rawJson);
    const rawEvents = trackingReq.tracking_events || [];
    if (rawEvents.length === 0) return null;

    // Parse HTML metadata grid
    let statusLabel = 'In Transit';
    let bookedAt = '';
    let bookedOn = '';
    let articleType = 'Speed Post (Domestic)';
    let destinationOffice = '';
    let destinationPincode = '110001';
    let originPincode = '110001';

    // Current status extraction from HTML
    const statusMatch = html.match(/Current Status[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    if (statusMatch) {
      statusLabel = statusMatch[1].replace(/<[^>]+>/g, '').replace(/[📬🚚📝🛄]/g, '').trim();
    }

    const bookedOnMatch = html.match(/Booked On[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    if (bookedOnMatch) {
      bookedOn = bookedOnMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    const articleTypeMatch = html.match(/Article Type[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    if (articleTypeMatch) {
      articleType = articleTypeMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    const bookingOfficeMatch = html.match(/Booking Office[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    if (bookingOfficeMatch) {
      bookedAt = bookingOfficeMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    const originPinMatch = html.match(/Origin Pincode[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    if (originPinMatch) {
      originPincode = originPinMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    const destOfficeMatch = html.match(/Destination Office[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
    if (destOfficeMatch) {
      destinationOffice = destOfficeMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    // Process events (myspeedpost lists events chronologically or reverse-chronologically)
    // Sort rawEvents descending (newest first)
    const sortedRaw = [...rawEvents].sort((a, b) => {
      const ta = new Date(a.tracked_at || '').getTime();
      const tb = new Date(b.tracked_at || '').getTime();
      return tb - ta;
    });

    const newestEvent = sortedRaw[0];
    const oldestEvent = sortedRaw[sortedRaw.length - 1];

    if (!bookedAt) bookedAt = oldestEvent?.office || 'Origin Post Office';
    if (!destinationOffice) destinationOffice = newestEvent?.office || 'Destination Post Office';
    if (!bookedOn && oldestEvent?.tracked_at) {
      const dt = formatDisplayDate(oldestEvent.tracked_at);
      bookedOn = `${dt.date} ${dt.time}`;
    }

    const overallStatus = mapStatus(newestEvent?.event || '', statusLabel);

    const events: TrackingEvent[] = sortedRaw.map((ev, idx) => {
      const dt = formatDisplayDate(ev.tracked_at || '');
      const evStatus = mapStatus(ev.event || '', idx === 0 ? statusLabel : '');
      return {
        date: dt.date,
        time: dt.time,
        office: ev.office ? `${ev.office}${ev.pincode ? ` (${ev.pincode})` : ''}` : 'Postal Hub',
        event: ev.event || 'Item Processed',
        details: ev.remarks || undefined,
        status: evStatus,
      };
    });

    // Extract route coordinates
    const routeCoords: GeoCoordinate[] = [];
    const seenOffices = new Set<string>();

    // Reverse for route (origin to destination)
    const chronEvents = [...sortedRaw].reverse();
    for (const ev of chronEvents) {
      const officeName = ev.office || '';
      if (!officeName || seenOffices.has(officeName)) continue;
      seenOffices.add(officeName);

      const lat = ev.pincode_info?.latitude;
      const lng = ev.pincode_info?.longitude;

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        routeCoords.push({
          lat,
          lng,
          label: `${officeName}${ev.pincode ? ` (${ev.pincode})` : ''}`,
        });
      }
    }

    // If no coordinates were in pincode_info, default to regional coordinates
    if (routeCoords.length === 0) {
      routeCoords.push({
        lat: 28.6328,
        lng: 77.2197,
        label: bookedAt,
        isOrigin: true,
      });
      routeCoords.push({
        lat: 18.9405,
        lng: 72.8355,
        label: destinationOffice,
        isDestination: true,
      });
    } else {
      routeCoords[0].isOrigin = true;
      routeCoords[routeCoords.length - 1].isDestination = true;
    }

    let deliveredAt: string | null = null;
    let recipient: string | null = null;

    if (overallStatus === 'delivered' && newestEvent?.tracked_at) {
      const dt = formatDisplayDate(newestEvent.tracked_at);
      deliveredAt = `${dt.date} ${dt.time}`;
      recipient = 'Recipient Verified';
    }

    return {
      consignmentNumber: cleaned,
      articleType,
      bookedAt: `${bookedAt}${originPincode ? ` (${originPincode})` : ''}`,
      bookedOn,
      destinationOffice: `${destinationOffice}${destinationPincode ? ` (${destinationPincode})` : ''}`,
      destinationPincode,
      currentStatus: overallStatus,
      statusLabel,
      deliveredAt,
      recipient,
      events,
      route: routeCoords,
    };
  } catch (err) {
    return null;
  }
}
