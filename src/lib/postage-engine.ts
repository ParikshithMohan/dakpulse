// India Post Domestic Postage & Tariff Engine

export interface PostageOption {
  serviceName: string;
  serviceCode: 'speed_post' | 'registered_post' | 'business_parcel' | 'ordinary_post';
  baseTariff: number;
  gst: number;
  totalTariff: number;
  estimatedDays: string;
  features: string[];
  isRecommended?: boolean;
  maxWeightAllowed: number;
  isEligible: boolean;
  ineligibilityReason?: string;
}

export type DistanceSlab = 'local' | 'up_to_200' | '201_to_1000' | '1001_to_2000' | 'above_2000';

export interface CalculationInput {
  weightGrams: number;
  distanceSlab: DistanceSlab;
  originPincode?: string;
  destinationPincode?: string;
}

export interface CalculationResult {
  weightGrams: number;
  distanceSlab: DistanceSlab;
  distanceDescription: string;
  originCity?: string;
  destinationCity?: string;
  options: PostageOption[];
}

// Distance slab labels
export const DISTANCE_SLAB_LABELS: Record<DistanceSlab, string> = {
  local: 'Local (Within same city / municipal limits)',
  up_to_200: 'Up to 200 km (Intra-State / Neighboring District)',
  '201_to_1000': '201 km to 1,000 km (Regional Transit)',
  '1001_to_2000': '1,001 km to 2,000 km (Inter-State / Metro Corridor)',
  above_2000: 'Above 2,000 km (Cross-Country / North-East / Islands)',
};

/**
 * Determine distance slab based on Indian 6-digit Pincodes
 */
export function estimateDistanceSlabFromPincodes(origin: string, dest: string): {
  slab: DistanceSlab;
  description: string;
} {
  const o = origin.trim();
  const d = dest.trim();

  if (!/^\d{6}$/.test(o) || !/^\d{6}$/.test(d)) {
    return {
      slab: '201_to_1000',
      description: 'Standard Regional Tariff (Default)',
    };
  }

  // Same 3-digit prefix -> Local delivery office cluster
  if (o.slice(0, 3) === d.slice(0, 3)) {
    return {
      slab: 'local',
      description: 'Local Hub Corridor (< 50 km)',
    };
  }

  const oZone = parseInt(o[0], 10);
  const dZone = parseInt(d[0], 10);

  // Same postal zone -> Up to 200km or 201-1000km
  if (oZone === dZone) {
    if (o.slice(0, 2) === d.slice(0, 2)) {
      return {
        slab: 'up_to_200',
        description: 'Intra-Circle Postal Hubs (~150 km)',
      };
    }
    return {
      slab: '201_to_1000',
      description: 'Intra-State Regional Corridor (~450 km)',
    };
  }

  const zoneDiff = Math.abs(oZone - dZone);

  // Adjacent zones (e.g. Zone 1 North to Zone 2 UP, or Zone 5 South to Zone 6 TN)
  if (zoneDiff <= 2) {
    return {
      slab: '201_to_1000',
      description: 'Inter-State Regional Grid (~750 km)',
    };
  }

  // Moderate distance (e.g. Zone 1 to Zone 4)
  if (zoneDiff <= 4) {
    return {
      slab: '1001_to_2000',
      description: 'National Trunk Corridor (~1,450 km)',
    };
  }

  // Far cross-country (e.g. Zone 1 North to Zone 6 South, or Zone 3 West to Zone 7 East)
  return {
    slab: 'above_2000',
    description: 'Long-Haul Express Corridor (> 2,000 km)',
  };
}

/**
 * Calculate Speed Post (Domestic) Tariff
 * Official India Post Domestic Speed Post Tariffs
 */
function calculateSpeedPost(weightGrams: number, slab: DistanceSlab): PostageOption {
  let base = 0;
  let estimatedDays = '2 - 3 Days';

  if (weightGrams <= 50) {
    if (slab === 'local') base = 15;
    else if (slab === 'up_to_200' || slab === '201_to_1000') base = 35;
    else if (slab === '1001_to_2000') base = 60;
    else base = 70;
  } else if (weightGrams <= 200) {
    if (slab === 'local') base = 25;
    else if (slab === 'up_to_200') base = 40;
    else if (slab === '201_to_1000') base = 50;
    else if (slab === '1001_to_2000') base = 70;
    else base = 80;
  } else if (weightGrams <= 500) {
    if (slab === 'local') base = 30;
    else if (slab === 'up_to_200') base = 50;
    else if (slab === '201_to_1000') base = 60;
    else if (slab === '1001_to_2000') base = 80;
    else base = 90;
  } else {
    // 500g base + additional per 500g
    let base500 = 0;
    let perAdd500 = 0;

    if (slab === 'local') {
      base500 = 30;
      perAdd500 = 10;
    } else if (slab === 'up_to_200') {
      base500 = 50;
      perAdd500 = 15;
    } else if (slab === '201_to_1000') {
      base500 = 60;
      perAdd500 = 30;
    } else if (slab === '1001_to_2000') {
      base500 = 80;
      perAdd500 = 40;
    } else {
      base500 = 90;
      perAdd500 = 50;
    }

    const additionalWeight = weightGrams - 500;
    const additionalUnits = Math.ceil(additionalWeight / 500);
    base = base500 + additionalUnits * perAdd500;
  }

  if (slab === 'local') estimatedDays = '1 - 2 Business Days';
  else if (slab === 'up_to_200' || slab === '201_to_1000') estimatedDays = '2 - 3 Business Days';
  else estimatedDays = '3 - 4 Business Days';

  const gst = Math.round(base * 0.18 * 100) / 100;
  const total = Math.round((base + gst) * 100) / 100;

  return {
    serviceName: 'Speed Post (Domestic)',
    serviceCode: 'speed_post',
    baseTariff: base,
    gst,
    totalTariff: total,
    estimatedDays,
    features: ['Fastest transit time', 'Live tracking with SMS alerts', 'Proof of delivery available', 'Covered under RMS express air network'],
    isRecommended: weightGrams <= 2000,
    maxWeightAllowed: 35000,
    isEligible: weightGrams <= 35000,
    ineligibilityReason: weightGrams > 35000 ? 'Speed post limit is 35 kg' : undefined,
  };
}

/**
 * Calculate Registered Post (Letter / Document) Tariff
 */
function calculateRegisteredPost(weightGrams: number, slab: DistanceSlab): PostageOption {
  // Letters: up to 2,000g max
  const isEligible = weightGrams <= 2000;
  if (!isEligible) {
    return {
      serviceName: 'Registered Post',
      serviceCode: 'registered_post',
      baseTariff: 0,
      gst: 0,
      totalTariff: 0,
      estimatedDays: '3 - 6 Days',
      features: ['Signed legal proof of delivery', 'Barcode tracking included', 'Standard surface / rail transport'],
      isRecommended: false,
      maxWeightAllowed: 2000,
      isEligible: false,
      ineligibilityReason: 'Registered Letter limit is 2 kg (Use Speed Post or Parcel for heavier items)',
    };
  }

  // Base letter postage: ₹5 for first 20g + ₹17 registration fee = ₹22
  let base = 22;
  if (weightGrams > 20) {
    const additionalGrams = weightGrams - 20;
    const additionalUnits = Math.ceil(additionalGrams / 20);
    base += additionalUnits * 5;
  }

  // Registered Post does not attract commercial 18% GST for basic public documents
  const gst = 0;
  const total = base;

  let estimatedDays = '3 - 5 Business Days';
  if (slab === 'above_2000') estimatedDays = '5 - 7 Business Days';

  return {
    serviceName: 'Registered Post',
    serviceCode: 'registered_post',
    baseTariff: base,
    gst,
    totalTariff: total,
    estimatedDays,
    features: ['Signed recipient acknowledgment', 'Secure hand-to-hand transit', 'Recommended for official & legal documents'],
    isRecommended: weightGrams <= 100 && slab !== 'above_2000',
    maxWeightAllowed: 2000,
    isEligible: true,
  };
}

/**
 * Calculate Business Parcel / Standard Parcel Tariff
 */
function calculateBusinessParcel(weightGrams: number, slab: DistanceSlab): PostageOption {
  // Standard Parcel: base 500g + additional 500g
  let base500 = 45;
  let perAdd500 = 16;

  if (slab === 'local') {
    base500 = 40;
    perAdd500 = 12;
  } else if (slab === 'up_to_200') {
    base500 = 45;
    perAdd500 = 16;
  } else if (slab === '201_to_1000') {
    base500 = 60;
    perAdd500 = 20;
  } else if (slab === '1001_to_2000') {
    base500 = 75;
    perAdd500 = 25;
  } else {
    base500 = 90;
    perAdd500 = 30;
  }

  let base = base500;
  if (weightGrams > 500) {
    const additionalWeight = weightGrams - 500;
    const additionalUnits = Math.ceil(additionalWeight / 500);
    base += additionalUnits * perAdd500;
  }

  const gst = Math.round(base * 0.18 * 100) / 100;
  const total = Math.round((base + gst) * 100) / 100;

  let estimatedDays = '4 - 6 Business Days';
  if (slab === 'above_2000') estimatedDays = '6 - 8 Business Days';

  return {
    serviceName: 'Business Parcel',
    serviceCode: 'business_parcel',
    baseTariff: base,
    gst,
    totalTariff: total,
    estimatedDays,
    features: ['Economical for heavier boxes (> 500g)', 'Full barcode tracking', 'Direct B2B and consumer delivery'],
    isRecommended: weightGrams > 2000,
    maxWeightAllowed: 35000,
    isEligible: weightGrams <= 35000,
    ineligibilityReason: weightGrams > 35000 ? 'Parcel limit is 35 kg' : undefined,
  };
}

/**
 * Calculate Ordinary Post (Standard Unregistered Mail)
 */
function calculateOrdinaryPost(weightGrams: number, slab: DistanceSlab): PostageOption {
  const isEligible = weightGrams <= 2000;
  if (!isEligible) {
    return {
      serviceName: 'Ordinary Post',
      serviceCode: 'ordinary_post',
      baseTariff: 0,
      gst: 0,
      totalTariff: 0,
      estimatedDays: '4 - 7 Days',
      features: ['Basic stamped letter mail', 'No tracking or receipt'],
      isRecommended: false,
      maxWeightAllowed: 2000,
      isEligible: false,
      ineligibilityReason: 'Ordinary post limit is 2 kg',
    };
  }

  let base = 5;
  if (weightGrams > 20) {
    const additionalGrams = weightGrams - 20;
    const additionalUnits = Math.ceil(additionalGrams / 20);
    base += additionalUnits * 5;
  }

  let estimatedDays = '4 - 7 Business Days';
  if (slab === 'above_2000') estimatedDays = '7 - 10 Business Days';

  return {
    serviceName: 'Ordinary Post (Stamped Mail)',
    serviceCode: 'ordinary_post',
    baseTariff: base,
    gst: 0,
    totalTariff: base,
    estimatedDays,
    features: ['Lowest cost for non-urgent letters', 'Dropped in red mailbox', 'Note: No tracking number issued'],
    isRecommended: false,
    maxWeightAllowed: 2000,
    isEligible: true,
  };
}

/**
 * Master Postage Calculation Function
 */
export function calculatePostage(input: CalculationInput): CalculationResult {
  const weight = Math.max(1, Math.min(input.weightGrams, 35000));
  let slab = input.distanceSlab;
  let distDesc = DISTANCE_SLAB_LABELS[slab];

  if (input.originPincode && input.destinationPincode) {
    const est = estimateDistanceSlabFromPincodes(input.originPincode, input.destinationPincode);
    slab = est.slab;
    distDesc = `${est.description} (${DISTANCE_SLAB_LABELS[slab]})`;
  }

  const speedPost = calculateSpeedPost(weight, slab);
  const registeredPost = calculateRegisteredPost(weight, slab);
  const businessParcel = calculateBusinessParcel(weight, slab);
  const ordinaryPost = calculateOrdinaryPost(weight, slab);

  return {
    weightGrams: weight,
    distanceSlab: slab,
    distanceDescription: distDesc,
    options: [speedPost, registeredPost, businessParcel, ordinaryPost],
  };
}
