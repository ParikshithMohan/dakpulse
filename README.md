# DakPulse 📮

A fast, ad-free India Post Speed Post & parcel tracking web application with live transit corridor mapping, 154,000+ postal pincode directory, and instant postage rate calculator.

## Highlights

- **Smart Consignment Tracking**: Real-time delivery status, RMS sorting hub milestones, booking timestamps, tariff details, and destination routing without CAPTCHA friction.
- **Smart Compact Audit Trail**: Automatically condenses dozens of repetitive internal RMS bag operations (`BAG_OPEN`, `BAG_CLOSE`, `BAG_DISPATCH`) into 4–6 high-level customer milestones, with a one-click toggle to view the complete raw scan log.
- **Instant Postage Calculator**: Instant domestic tariff estimation for Speed Post, Registered Post, Business Parcel, and Ordinary Post with automatic 6-digit Pincode distance slab detection and 18% GST breakdown.
- **Dynamic Delivery Corridor Mapping**: Interactive Leaflet corridor map displaying origin booking offices, transit mail sorting offices (RMS/TMO), and delivery offices with automatic dark/light mode tile adaptation.
- **Pincode & Branch Directory**: Search over 150,000+ Indian post offices by 6-digit Pincode, branch name, or district with sub-10ms in-memory cache and live government API fallback.
- **Bulk Dispatch Auditing**: Batch query up to 50 tracking numbers simultaneously with KPI breakdown (Delivered, In Transit, Out for Delivery, Exceptions) and manifest CSV export.
- **Optical Barcode & QR Scanner**: Camera-based barcode scanner using `html5-qrcode` with accessible `<dialog>` modal.
- **Zero Ads & Privacy-First**: No ads, no third-party trackers, fast server-side rendering with Astro 5 and Tailwind CSS v4.

## Tech Stack

- **Framework**: [Astro 5](https://astro.build/) (Server-Side Rendering with `@astrojs/node`)
- **Design Tokens**: [Astryx](https://github.com/meta/astryx) (`@astryxdesign/theme-neutral`)
- **Typography**: Space Grotesk + Plus Jakarta Sans + Space Mono
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Mapping**: [Leaflet](https://leafletjs.com/) with CartoDB & OpenStreetMap tiles
- **Scanner**: `html5-qrcode`
- **Testing**: [Vitest](https://vitest.dev/)
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ (tested on Node 22)
- npm / pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/ParikshithMohan/dakpulse.git
cd dakpulse

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:4325` in your browser.

### Production Build

```bash
# Build standalone server bundle
npm run build

# Run production server
node dist/server/entry.mjs
```

### Running Tests

```bash
npm test
```

## Architecture

```
src/
├── components/
│   ├── BarcodeScannerModal.astro  # HTML5 QR/Barcode camera scanner
│   ├── BulkTrackingTable.astro    # Batch audit engine & CSV exporter
│   ├── ConsignmentTracker.astro   # Main tracking search & live timeline
│   ├── Navigation.astro           # Header & theme toggle
│   ├── PincodeLookup.astro        # Postal pincode directory UI
│   ├── PostageCalculator.astro    # Smart domestic tariff calculator
│   ├── RouteMap.astro             # Leaflet live route mapping
│   ├── StatusBadge.astro          # Color-coded consignment status badges
│   └── TrackingTimeline.astro     # Smart compact audit trail & timeline
├── layouts/
│   └── Layout.astro               # Base HTML skeleton & Astryx theme provider
├── lib/
│   ├── audit-trail.ts             # Smart milestone deduplication & consolidation
│   ├── live-scraper.ts            # Edge tracking extractor & parser
│   ├── postage-engine.ts          # India Post official tariff calculation rules
│   ├── postal-api.ts              # Multi-tier pincode directory client
│   ├── tracking-engine.ts         # Consolidated tracking pipeline
│   └── types.ts                   # TypeScript interfaces & models
├── pages/
│   ├── api/
│   │   ├── bulk.ts                # POST batch tracking endpoint
│   │   ├── pincode.ts             # GET pincode directory endpoint
│   │   ├── postage.ts             # GET postage tariff endpoint
│   │   └── track.ts               # GET single consignment endpoint
│   ├── bulk-tracking.astro        # Bulk audit route
│   ├── index.astro                # Home tracking route
│   ├── pincode-search.astro       # Pincode search route
│   └── postage-calculator.astro   # Postage calculator route
└── styles/
    └── global.css                 # Astryx design tokens & Tailwind CSS v4
```

## License

MIT License.
