# Performance Optimization Quick Reference Card

Print this for quick reference while implementing optimizations.

---

## File Locations

```
Utilities:
├── src/utils/debounce.js                    # Debounce functions
├── src/utils/throttle.js                    # Throttle functions

Hooks:
├── src/hooks/useCache.js                    # Caching with TTL
├── src/hooks/useDebouncedSearch.js          # Pre-built search

Components:
├── src/components/PageLoader.jsx            # Loading fallback

Services:
├── src/services/api.js                      # Caching layer

Documentation:
├── PERFORMANCE_README.md                    # Start here (800 lines)
├── src/INTEGRATION_GUIDE.md                 # Step-by-step (700 lines)
├── src/OPTIMIZATION_GUIDE.md                # Deep dive (800 lines)
├── src/ExampleOptimizedComponent.jsx        # Code example (400 lines)
├── VALIDATION_CHECKLIST.md                  # Test checklist
└── QUICK_REFERENCE.md                       # This file
```

---

## Common Code Snippets

### 1. Add Caching to Component
```javascript
import { useCache } from '../hooks/useCache';

const { data, loading, error, invalidateCache } = useCache(
  'cache-key',
  fetchFunction,
  { duration: 5 * 60 * 1000 }  // 5 minutes
);
```

### 2. Add Debounced Search
```javascript
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';

const { results, searchQuery, setSearchQuery } = useDebouncedSearch(
  async (query) => api.search(query),
  300  // 300ms delay
);

<input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
```

### 3. Memoize Component
```javascript
import { memo } from 'react';

const MyItem = memo(function MyItem({ item }) {
  return <div>{item.name}</div>;
});
```

### 4. Memoize Expensive Calculation
```javascript
import { useMemo } from 'react';

const sorted = useMemo(() => {
  return data.sort((a, b) => a.name.localeCompare(b.name));
}, [data]);
```

### 5. Stable Callback
```javascript
import { useCallback } from 'react';

const handleClick = useCallback(() => {
  doSomething();
}, []);  // Dependencies for re-creation
```

### 6. Manual Cache Invalidation
```javascript
import { invalidateCache } from '../services/api';

await updateItem(data);
invalidateCache('items/');  // Pattern-based invalidation
```

---

## Cache TTL Configuration

```javascript
Profile data:           10 minutes
List data:              2 minutes
General data:           5 minutes
Admin data:             2 minutes
```

**Example:**
```javascript
{ duration: 10 * 60 * 1000 }  // 10 minutes
{ duration: 2 * 60 * 1000 }   // 2 minutes
{ duration: 5 * 1000 }        // 5 seconds
```

---

## Performance Targets

**Core Web Vitals:**
```
FCP (First Contentful Paint)  ≤ 1.8s   ✅ Target
LCP (Largest Contentful Paint) ≤ 2.5s   ✅ Target
CLS (Cumulative Layout Shift)  ≤ 0.1    ✅ Target
TTI (Time to Interactive)      ≤ 3.8s   ✅ Target
```

**Bundle:**
```
Initial JS:             < 200KB gzipped
Page JS:                < 50KB gzipped
CSS:                    < 50KB gzipped
```

**Lighthouse:**
```
Performance:            ≥ 90
Accessibility:          ≥ 90
Best Practices:         ≥ 90
SEO:                    ≥ 90
```

---

## Debugging Checklist

| Issue | Check | Solution |
|-------|-------|----------|
| Cache not updating | DevTools > Network | Call `invalidateCache()` after mutation |
| Debounce not working | Type fast, watch Network | Increase delay: `debounceAsync(fn, 500)` |
| memo() not preventing re-renders | React profiler | Use `useCallback` for props passed to memoized components |
| useMemo() not optimizing | DevTools > Performance | Check dependency array - might be too broad |
| Lazy loading issues | Console errors | Check async import syntax in `App.jsx` |

---

## Testing Commands

```bash
# Development
npm run dev                # Start dev server

# Production
npm run build              # Build for production
npm run preview            # Preview production build

# Lighthouse
# 1. npm run preview
# 2. DevTools > Lighthouse > Generate report
# 3. Check Performance score ≥ 90

# Analyze bundle
# 1. npm run build
# 2. ls -lah dist/assets/  (Mac/Linux)
# 3. dir dist\assets\      (Windows)
# Check for multiple chunks
```

---

## Before/After Checklist

### HistoryPage
- [ ] Import `useCache` hook
- [ ] Wrap API call with `useCache('resume-history', ...)`
- [ ] Import `useDebouncedSearch` hook
- [ ] Replace search with `useDebouncedSearch(..., 300)`
- [ ] Wrap resume item in `memo()`
- [ ] Add `useCallback` for event handlers

### DashboardPage
- [ ] Wrap component with `memo()`
- [ ] Import `useCache` hook
- [ ] Replace `useState` + `useEffect` with `useCache()`

### LinkedInImportPage
- [ ] Import `useDebouncedSearch` and `debounce`
- [ ] Add 500ms debounce to URL import
- [ ] Cache import history with `useCache()`

### AdminPages
- [ ] Wrap table rows in `memo()` component
- [ ] Use `useCallback` for delete/edit handlers
- [ ] Cache admin data with `useCache()` (2min TTL)

---

## Expected Performance Improvements

| Optimization | Expected Impact |
|---|---|
| Code Splitting | 40% faster initial load |
| API Caching | 80% fewer requests |
| Debouncing | 95% fewer search requests |
| Memoization | 30% fewer re-renders |
| Throttling | 70% fewer scroll events |

**Combined:** 30-50% faster, smoother UX, less bandwidth

---

## Hook Return Values

### useCache()
```javascript
{
  data: T,              // Cached data
  loading: boolean,     // Loading state
  error: Error | null,  // Error if failed
  refetch: () => void,  // Manual refetch
  invalidateCache: () => void  // Clear cache
}
```

### useDebouncedSearch()
```javascript
{
  results: T[],         // Search results
  loading: boolean,     // Searching...
  error: Error | null,  // Search error
  searchQuery: string,  // Current search text
  setSearchQuery: (q: string) => void,  // Update search
  clearResults: () => void  // Clear results
}
```

---

## Cache Patterns

### Pattern 1: Remove All User Data
```javascript
invalidateCache('user/');  // Clears user/profile, user/security, etc.
```

### Pattern 2: Remove Specific Cache
```javascript
invalidateCache('resume-history');  // Exact match
```

### Pattern 3: Remove All Caches
```javascript
invalidateCache();  // No pattern = clear everything
```

---

## React Patterns

### Pattern: memo() for List Items
```javascript
// ❌ Wrong: Component recreated every render
{items.map(item => (
  <div key={item.id}>{item.name}</div>
))}

// ✅ Right: Memoized, only updates when item changes
const ListItem = memo(function ListItem({ item }) {
  return <div>{item.name}</div>;
});

{items.map(item => (
  <ListItem key={item.id} item={item} />
))}
```

### Pattern: useCallback for Handlers
```javascript
// ❌ Wrong: Function recreated every render
<DeleteButton onClick={() => deleteItem(id)} />

// ✅ Right: Stable reference
const handleDelete = useCallback(
  () => deleteItem(id),
  [id]
);
<DeleteButton onClick={handleDelete} />
```

### Pattern: useMemo for Calculations
```javascript
// ❌ Wrong: Recalculates every render
const sorted = items.sort((a, b) => a.name.localeCompare(b.name));

// ✅ Right: Only when items change
const sorted = useMemo(
  () => items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);
```

---

## Build Optimization Config (vite.config.mjs)

Already configured:
- ✅ Vendor chunking (react, ui, utils)
- ✅ CSS code splitting
- ✅ Terser minification
- ✅ Console removal
- ✅ No source maps in production

No additional configuration needed.

---

## API Endpoints with Cache Configuration

All configured automatically in `src/services/api.js`:

| Endpoint | Cache Duration | Auto-Invalidation |
|---|---|---|
| GET /api/me | 10 min | On login/logout |
| GET /api/resume_history | 2 min | On upload/delete |
| POST /api/* | - | Clears related |
| PUT /api/* | - | Clears related |
| DELETE /api/* | - | Clears related |

---

## Common Mistakes to Avoid

❌ **Don't:** Import hook but forget to use it
```javascript
import { useCache } from '../hooks/useCache';
// Forgot to actually call useCache()
```

❌ **Don't:** Forget dependency array
```javascript
const handler = useCallback(() => {}, );  // ❌ Missing []
```

❌ **Don't:** Use memo without stable props
```javascript
<MemoizedItem item={item} onClick={() => handle()} />  // ❌ onClick recreated every time
```

❌ **Don't:** Re-create debounced function
```javascript
{/* ❌ Creates new debounce every render */}
onChange={(e) => debounce((q) => search(q), 300)(e.target.value)}
```

✅ **Do:** Create debounce outside render
```javascript
const debouncedSearch = useMemo(
  () => debounce((q) => search(q), 300),
  []
);

onChange={(e) => debouncedSearch(e.target.value)}
```

---

## Import Statements Quick Reference

```javascript
// Hooks
import { useCache } from '../hooks/useCache';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';

// React
import { memo, useMemo, useCallback, useState, useEffect } from 'react';

// Utils
import { debounce, debounceAsync } from '../utils/debounce';
import { throttle, throttleAsync } from '../utils/throttle';

// Components
import { PageLoader, LoadingSpinner, SkeletonLoader } from '../components/PageLoader';

// Services
import { api, invalidateCache } from '../services/api';
```

---

## URLs for Testing

```
Development:     http://localhost:3000
Production Prev: http://localhost:4173 (after npm run preview)

Key Pages:
/                 # Landing
/dashboard        # Profile dashboard (uses cache)
/history          # Resume history (search debounced)
/linkedin-import  # LinkedIn import (URL debounced)
/admin            # Admin pages (tables memoized)
```

---

## Performance Monitoring in DevTools

```
Network Tab:
  ├─ Filter XHR/Fetch
  ├─ Watch for duplicate requests
  └─ Check for cache headers

Performance Tab:
  ├─ FCP target: < 1.8s
  ├─ LCP target: < 2.5s
  └─ TTI target: < 3.8s

Lighthouse:
  ├─ Performance: ≥ 90
  ├─ FCP/LCP metrics
  └─ Bundle size analysis
```

---

## Success Indicators

✅ **Development:**
- No console errors
- Pages load smoothly
- Search works without lag
- Navigation is fast

✅ **Production Build:**
- Multiple JS chunks generated
- Bundle size < 500KB total
- Lighthouse score ≥ 90
- No network duplicates

✅ **User Experience:**
- Initial load faster
- Interactions snappy
- Minimal re-renders
- Smooth animations

---

## Next Steps

1. Read `PERFORMANCE_README.md` (overview)
2. Check `INTEGRATION_GUIDE.md` for your page type
3. Apply patterns to component
4. Test with Lighthouse
5. Verify performance improvement

---

**Last Updated:** March 27, 2026  
**Version:** 1.0  
**Status:** Ready for Integration

