# Pinewood Derby Race Manager

A simple, local pinewood derby race manager built with Rust and Tauri. Runs on Windows 11 and macOS with integrated MicroWizard FastTrack timer support.

## Project Status

**Phase 1: Check-In System** - ✅ COMPLETE
- Tauri project setup
- SQLite database with scouts table
- Check-in form UI (React + TypeScript)
- Scout list display
- Validation (weight ≤ 5.0 oz, unique car numbers)

## Technology Stack

**Backend:**
- Rust with Tauri 2.1
- SQLite (via sqlx)
- tokio for async runtime

**Frontend:**
- React 18 + TypeScript
- Vite for build tooling
- Isolated in `ui/` directory

## Project Structure

```
pinewood/refinery/rig/
├── Cargo.toml          # Rust project (main)
├── src/
│   ├── main.rs         # Tauri application entry + commands
│   └── db.rs           # Database module
├── tauri.conf.json     # Tauri configuration
├── build.rs            # Tauri build script
└── ui/                 # Frontend (npm contained here only)
    ├── package.json
    ├── src/
    │   ├── App.tsx     # Main check-in UI
    │   ├── App.css
    │   ├── main.tsx
    │   └── index.css
    └── dist/           # Built frontend (gitignored)
```

## Development

### Prerequisites

- Rust 1.70+
- Node.js 18+ (for frontend only)

### Build Backend

```bash
cargo build
```

### Setup Frontend

```bash
cd ui
npm install
```

### Run in Development

```bash
# Terminal 1: Build frontend
cd ui
npm run dev

# Terminal 2: Run Tauri app
cargo tauri dev
```

### Build for Production

```bash
# Build frontend
cd ui
npm run build

# Build Tauri app
cargo build --release
```

### Testing

Frontend testing with Playwright:

```bash
cd ui
npm test              # Run all tests headless
npm run test:ui       # Run with UI mode
npm run test:headed   # Run with browser visible
```

**Test Coverage:**
- 16 tests covering check-in UI functionality
- Form validation (weight limits, required fields)
- Scout list display and management
- Error handling and warnings
- Browser vs Tauri context handling

## Features Implemented (Phase 1)

### Database Schema

**scouts table:**
- id (INTEGER PRIMARY KEY)
- name (TEXT NOT NULL)
- den (TEXT NOT NULL) - Tiger, Wolf, Bear, Webelos, Arrow of Light
- car_number (INTEGER UNIQUE NOT NULL)
- car_weight (REAL NOT NULL)
- checked_in (BOOLEAN DEFAULT 1)
- created_at (TEXT)

### Tauri Commands

- `init_database()` - Initialize SQLite database
- `checkin_scout(name, den, car_number, car_weight)` - Check in a scout
- `get_checked_in_scouts()` - Get list of all checked-in scouts
- `get_next_car_number()` - Get next available car number

### UI Components

- **Check-In Form:**
  - Den dropdown (5 dens)
  - Scout name input
  - Car number input (auto-increments)
  - Car weight input with validation
  - Real-time weight warning if > 5.0 oz
  - Form submission with error handling

- **Scout List:**
  - Scrollable list of checked-in scouts
  - Shows car number, name, den, weight
  - Count of total scouts
  - "Start Race" button (appears when ≥ 4 scouts)

## Next Steps

See `../../MVP_PLANNING.md` for full roadmap:

- Phase 2: Heat Scheduling Algorithm
- Phase 3: FastTrack Timer Integration
- Phase 4: Race Execution View
- Phase 5: Standings and Reports
- Phase 6: Polish and Packaging

## Build Notes

- ✅ Zero warnings in Rust build
- ✅ Frontend bundled with Vite
- ✅ SQLite database created on first run in app data directory
  - macOS: `~/Library/Application Support/com.pinewood.derby/pinewood.db`
  - Windows: `%APPDATA%/com.pinewood.derby/pinewood.db`
- ✅ All validations working client-side and server-side
- ✅ Playwright test suite with 16 tests (all passing)

## License

See LICENSE file for details.
