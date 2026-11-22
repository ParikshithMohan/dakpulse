import type { TrackingEvent } from './types';

export interface SmartMilestone {
  title: string;
  office: string;
  city: string;
  date: string;
  time: string;
  status: string;
  badgeLabel: string;
  badgeClass: string;
  scansCount: number;
  details?: string;
  isLatest: boolean;
}

/**
 * Extract normalized regional city/hub name from office string
 * e.g. "Coimbatore RMS (641002)" -> "Coimbatore"
 * "CHENNAI CENTRAL RMS TMO (600003)" -> "Chennai"
 * "AMBALA RMS SET 4 (133001)" -> "Ambala"
 */
function extractHubCity(office: string): string {
  const cleaned = office.replace(/\s*\(\d{6}\)\s*$/, '').trim();
  const upper = cleaned.toUpperCase();

  // Well known sorting hubs
  if (upper.includes('COIMBATORE')) return 'Coimbatore';
  if (upper.includes('CHENNAI')) return 'Chennai';
  if (upper.includes('AMBALA')) return 'Ambala';
  if (upper.includes('KARNAL')) return 'Karnal';
  if (upper.includes('ASSAND')) return 'Assand';
  if (upper.includes('UDAMALPET')) return 'Udamalpet';
  if (upper.includes('MUMBAI') || upper.includes('BOMBAY')) return 'Mumbai';
  if (upper.includes('DELHI')) return 'Delhi';
  if (upper.includes('BENGALURU') || upper.includes('BANGALORE')) return 'Bengaluru';
  if (upper.includes('KOLKATA') || upper.includes('CALCUTTA')) return 'Kolkata';
  if (upper.includes('HYDERABAD')) return 'Hyderabad';
  if (upper.includes('AHMEDABAD')) return 'Ahmedabad';
  if (upper.includes('PUNE')) return 'Pune';
  if (upper.includes('LUCKNOW')) return 'Lucknow';
  if (upper.includes('VARANASI')) return 'Varanasi';
  if (upper.includes('JAIPUR')) return 'Jaipur';
  if (upper.includes('SRINAGAR')) return 'Srinagar';
  if (upper.includes('ITANAGAR')) return 'Itanagar';

  // Generic fallback: take first 1-2 words before RMS, TMO, SO, BO, H.O, GPO
  const stripped = cleaned
    .replace(/\b(RMS|TMO|SO|BO|HO|H\.O|GPO|MDG|NSH|SPC|SET\s*\d+|ROAD SORTING|SUB DISTRICT|SHAND|AP)\b/gi, '')
    .trim();
  return stripped || cleaned;
}

/**
 * Consolidate dozens of repetitive RMS internal bag operations (BAG_OPEN, BAG_CLOSE, BAG_DISPATCH)
 * into 4-6 high-level customer milestones.
 */
export function buildSmartMilestones(events: TrackingEvent[]): SmartMilestone[] {
  if (!events || events.length === 0) return [];

  const milestones: SmartMilestone[] = [];
  const hubGroups = new Map<string, TrackingEvent[]>();
  const groupOrder: string[] = [];

  for (const ev of events) {
    const hubCity = extractHubCity(ev.office);
    if (!hubGroups.has(hubCity)) {
      hubGroups.set(hubCity, []);
      groupOrder.push(hubCity);
    }
    hubGroups.get(hubCity)!.push(ev);
  }

  groupOrder.forEach((hubCity, groupIdx) => {
    const evs = hubGroups.get(hubCity)!;
    const latestInGroup = evs[0];
    const isFirstGroup = groupIdx === 0;
    const isLastGroup = groupIdx === groupOrder.length - 1;

    let title = latestInGroup.event;
    let badgeLabel = 'In Transit';
    let badgeClass = 'bg-amber-500/10 text-amber-500 border-amber-500/25';

    const hasDelivered = evs.some((e) => e.event.toUpperCase().includes('DELIVERED') || e.status === 'delivered');
    const hasOutForDelivery = evs.some((e) => e.event.toUpperCase().includes('OUT FOR DELIVERY') || e.status === 'out_for_delivery');
    const isBooking = isLastGroup || evs.some((e) => e.event.toUpperCase().includes('BOOK') || e.status === 'booked');

    if (hasDelivered) {
      title = 'Delivered to Recipient';
      badgeLabel = 'Delivered';
      badgeClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25';
    } else if (hasOutForDelivery) {
      title = `Out for Delivery (${hubCity})`;
      badgeLabel = 'Out for Delivery';
      badgeClass = 'bg-blue-500/10 text-blue-500 border-blue-500/25';
    } else if (isBooking) {
      title = `Booked at Origin Office (${hubCity})`;
      badgeLabel = 'Origin Booking';
      badgeClass = 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25';
    } else {
      title = `Transited via ${hubCity} Sorting Hub`;
      badgeLabel = 'Transit Hub';
      badgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/25';
    }

    milestones.push({
      title,
      office: latestInGroup.office,
      city: hubCity,
      date: latestInGroup.date,
      time: latestInGroup.time,
      status: latestInGroup.status,
      badgeLabel,
      badgeClass,
      scansCount: evs.length,
      details: latestInGroup.details || (evs.length > 1 ? `${evs.length} internal bag & mail scans consolidated` : undefined),
      isLatest: isFirstGroup,
    });
  });

  return milestones;
}
