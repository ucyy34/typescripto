# TypeScript Migration Guide

## TS Interop Standard

### Service Export Pattern
All TypeScript services must use the CommonJS-compatible export syntax:

```typescript
class MyService {
  // methods...
}

export = new MyService();
```

### Service Import Pattern
**In TypeScript files:**
```typescript
import myService from '../services/my.service';
```

**In JavaScript files (unchanged):**
```javascript
const myService = require('../services/my.service');
```

### Required tsconfig.json Settings
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowJs": true,
    "checkJs": false
  }
}
```

### Commands
| Script | Command | Description |
|--------|---------|-------------|
| Typecheck | `npm run typecheck` | Run TypeScript compiler in noEmit mode |
| Test | `npm test` | Run Jest test suite |
| Dev | `npm run dev:ts` | Start dev server with ts-node |

### Migration Phases Completed
- **PR1-PR3**: Core Services, Shipping, & Foundation (Completed)
- **PR4-PR5**: Controllers & Routes (Completed - 100% TS)
- **PR6-PR10**: Events, Config, & Initial Test Fixes (Completed)
- **PR11**: Stabilization - Fix All Test Suites (Completed - Exit 0)
- **PR12**: Models - Index Entrypoint CJS Bridge (Completed)
- **PR13**: Middlewares, Utils, Validators, Workers, Events, Config (Completed - 45 files)
- **PR14**: Stabilize Models Entrypoint (Completed - Single Source of Truth)

### Current Status (2024-12-28)
| Category | TypeScript | JavaScript | Notes |
|----------|------------|------------|-------|
| Controllers | 22 | 0 | ✅ 100% TS |
| Services | 25 | 0 | ✅ 100% TS |
| Models | 28 | 1 | index.js = CJS bridge |
| Routes | 17 | 0 | ✅ 100% TS |
| Middlewares | 8 | 0 | ✅ 100% TS |
| Utils | 6 | 0 | ✅ 100% TS |
| Validators | 16 | 0 | ✅ 100% TS |
| Workers | 6 | 0 | ✅ 100% TS |
| Events | 5 | 0 | ✅ 100% TS |
| Config | 4 | 0 | ✅ 100% TS |
| Migrations | 0 | 16 | Sequelize CLI requires JS |
| Scripts | 0 | 33 | Utility scripts (low priority) |
| Tests | 0 | 10+ | Jest test files |
| **Total** | **189** | **64** | ~75% TypeScript |

### Remaining (Optional)
- **Migrations**: Must stay JS for Sequelize CLI compatibility
- **Scripts**: One-off utility scripts, can remain JS
- **Test Files**: Can migrate to .ts but not critical

