# MySpeedPost Pro 📮

A high-performance, ad-free India Post Speed Post & Parcel Tracking web application, reverse-engineered and built for modern Indian logistics and e-commerce workflows.

## Features

- **Live India Post Tracking**: Real-time consignment status, sorting hub scan events, booking timestamps, tariff details, and destination routing without manual CAPTCHA friction.
- **In-Place Dynamic Route Mapping**: Interactive Leaflet corridor map showing origin booking offices, transit mail offices (RMS/NSH), and delivery sub-offices across India with automatic night/light mode tile adaptation.
- **Multi-Tier Pincode & Branch Directory**: Search over 150,000+ Indian post offices by 6-digit Pincode, branch name, or district with sub-10ms in-memory cache and live government API fallback.
- **Bulk Consignment Auditing**: Batch input up to 50 tracking numbers simultaneously, instant KPI breakdown (Delivered, In Transit, Out for Delivery, Exceptions), and one-click CSV export.
- **Barcode & QR Camera Scanner**: Live camera-based optical barcode scanner using `html5-qrcode` with native `<dialog>` light-dismiss modal.
- **Zero Ads & Privacy-First**: 100% telemetry-clean, fast server-side rendering with Astro 5 and Tailwind CSS v4.

## Tech Stack

- **Framework**: [Astro 5](https://astro.build/) (Server-Side Rendering with `@astrojs/node`)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Mapping**: [Leaflet](https://leafletjs.com/) with OpenStreetMap tiles
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
git clone https://github.com/ParikshithMohan/speedpost-pro.git
cd speedpost-pro

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
│   ├── RouteMap.astro             # Leaflet live route mapping
│   ├── StatusBadge.astro          # Color-coded consignment status badges
│   └── TrackingTimeline.astro     # Audit trail scan event nodes
├── layouts/
│   └── Layout.astro               # Base HTML skeleton & theme provider
├── lib/
│   ├── live-scraper.ts            # Edge tracking extractor & parser
│   ├── postal-api.ts              # Multi-tier pincode directory client
│   ├── tracking-engine.ts         # Consolidated tracking pipeline
│   └── types.ts                   # TypeScript interfaces & models
├── pages/
│   ├── api/
│   │   ├── bulk.ts                # POST batch tracking endpoint
│   │   ├── pincode.ts             # GET pincode directory endpoint
│   │   └── track.ts               # GET single consignment endpoint
│   ├── bulk-tracking.astro        # Bulk audit route
│   ├── index.astro                # Home tracking route
│   └── pincode-search.astro       # Pincode search route
└── styles/
    └── global.css                 # Tailwind CSS v4 themes & variables
```

## License

MIT License. Designed & developed for Indian e-commerce & postal logistics.
