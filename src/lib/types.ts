export type ConsignmentStatus =
  | 'booked'
  | 'dispatched'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'rto'
  | 'exception';

export interface TrackingEvent {
  date: string;
  time: string;
  office: string;
  event: string;
  details?: string;
  status: ConsignmentStatus;
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
  label: string;
  isOrigin?: boolean;
  isDestination?: boolean;
}

export interface TrackingResult {
  consignmentNumber: string;
  articleType: string;
  bookedAt: string;
  bookedOn: string;
  destinationOffice: string;
  destinationPincode: string;
  currentStatus: ConsignmentStatus;
  statusLabel: string;
  deliveredAt: string | null;
  recipient: string | null;
  events: TrackingEvent[];
  route: GeoCoordinate[];
}

export interface PincodeOffice {
  name: string;
  branchType: string;
  deliveryStatus: string;
  circle: string;
  district: string;
  division: string;
  region: string;
  state: string;
  country: string;
  pincode: string;
}

export interface BulkTrackingSummary {
  total: number;
  delivered: number;
  inTransit: number;
  outForDelivery: number;
  exceptions: number;
  results: TrackingResult[];
}
