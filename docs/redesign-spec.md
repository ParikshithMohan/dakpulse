# DakPulse Redesign Specification: Modern Designer Tech SaaS & High-Velocity Tracking

## 1. Brand Thesis & Direction
- **Identity**: DakPulse — The High-Velocity Postal Logistics & Consignment Telemetry Platform for India Post.
- **Aesthetic Benchmark**: Linear, Vercel, Stripe, Raycast, Supabase.
- **Target Audience**: High-volume e-commerce shippers, developers, logistics managers, and everyday senders tracking India Post consignments.
- **Core Priority**: Sub-second search efficiency, zero advertising, compacted high-signal audit trails, and precise geospatial routing.

## 2. Visual Architecture & Design System
- **Foundation**: Pitch-black canvas (`#09090b` / `#0d0e12`) with hairline zinc borders (`rgba(255,255,255,0.08)` / `#27272a`).
- **Accent Ramp**:
  - Primary Accent: Signal Crimson (`#ef4444` / `#dc2626`) for postal heritage, paired with radiant Emerald (`#10b981` / `#059669`) for live delivery telemetry.
  - Neutral Scale: Zinc-950 foundation, Zinc-900 elevated cards, Zinc-400 muted text, Zinc-100 high-contrast headings.
- **Typography Tokens**:
  - Headings: `Space Grotesk` (700/600, tight letter-spacing `-0.035em`).
  - Body: `Plus Jakarta Sans` (400/500/600).
  - Telemetry / Codes: `Space Mono` (400/700 tabular digits).
- **Structural Grid & Micro-Details**:
  - Guide lines: Subtle 1px borders with corner crosshair markers (`+`) at section boundaries.
  - Keyboard accessibility: `/` or `⌘K` to focus consignment search, `Esc` to clear/close.

## 3. Component Hierarchy
1. **Header & Telemetry Pill**:
   - Sticky frosted glass (`backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800/80`).
   - Live network status pip: `● India Post RMS Live • Zero Ads • Sub-second`.
   - Navigation links with active indicator tab.
2. **Hero & Command-Line Consignment Bar**:
   - Hero header with high-impact Grotesque typography and technical badge.
   - Command-bar search with instant submit, camera barcode scanner, keyboard shortcut prompt, and real-time status feedback.
   - One-click live sample consignments: `EE710744405IN` (Speed Post), `CX137150258IN` (Air Parcel), `JA075033095IN` (Tracked).
   - Local search history chips with instant re-query and clear action.
3. **2.5D Isometric Diorama & Algorithmic Transit Radar**:
   - **Isometric Diorama** (`illustration-isometric-mono`): Handcrafted 30° true-isometric vector SVG platform featuring a national sorting hub, air conveyor, parcel matrix, and telemetry antenna.
   - **Algorithmic Corridor Canvas** (`algorithmic-art`): Live interactive canvas pulsing transit packets across major postal nodes (DEL, BOM, BLR, MAA, CCU, HYD).
4. **Live Consignment Results View**:
   - Hero Consignment Metric Card with current status badge, booking date, destination, and SLA timeline.
   - 5-Point Compacted Milestone Stepper (Booked → Dispatched → In Transit → Out for Delivery → Delivered).
   - Geographic Route Corridor Map (Dark Leaflet OpenStreetMap with custom postal hub icons and active transit polyline).
   - Smart Consolidated Audit Trail: High-signal bag events with expandable raw scan log (30+ events toggle).
5. **Interactive Core Modules**:
   - **Domestic Postage Tariff Calculator**: Interactive slider and distance tariff engine (Local, 200km, 1000km, 2000km, >2000km).
   - **Pincode & Delivery Office Directory**: Sub-second search for 155,000+ PINs with Taluk/District data.
   - **High-Throughput Bulk Dispatch Manifest**: Multi-consignment tracker for e-commerce shipments with CSV export.
6. **Technical Specs & Developer API**:
   - Terminal curl preview showing JSON API endpoint.
   - Article prefix reference matrix (EM, CX, RT, JA, SP).
   - Clean industrial footer with open-source GitHub link.
