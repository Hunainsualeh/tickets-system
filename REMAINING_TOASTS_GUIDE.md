# Complete Guide: Replace Remaining Alerts with Toasts

## Files Still Needing Updates:

### 1. **admin/teams/page.tsx** (4 alerts)
**Add at top:**
```typescript
import { useToast } from '@/app/components/ToastContainer';

// In component:
const toast = useToast();
```

**Replace:**
- Line 89: `alert('Please enter a team name')` → `toast.warning('Please enter a team name')`
- Line 100: `alert('Failed to create team')` → `toast.error('Failed to create team')`
- Line 119: `alert('Please select at least one user')` → `toast.warning('Please select at least one user')`
- Line 145: `alert('Failed to add members to team')` → `toast.error('Failed to add members to team')`

### 2. **admin/teams/list/page.tsx** (4 alerts, 1 confirm)
**Replace:**
- Line 64: `alert('Please enter a team name')` → `toast.warning('Please enter a team name')`
- Line 75: `alert('Failed to update team')` → `toast.error('Failed to update team')`
- Line 92: `alert(error.message || 'Failed to delete team')` → `toast.error(error.message || 'Failed to delete team')`
- Line 97: Keep `confirm()` for now (or create custom confirmation modal later)
- Line 122: `alert('Failed to remove member from team')` → `toast.error('Failed to remove member from team')`

### 3. **admin/page.tsx** (6 alerts, 2 confirms)
**Replace:**
- Line 248: `alert(error.message)` → `toast.error(error.message || 'Operation failed')`
- Line 273: `alert(error.message)` → `toast.error(error.message || 'Failed to create user')`
- Line 297: `alert(error.message)` → `toast.error(error.message || 'Failed to create branch')`
- Line 322: `alert(error.message)` → `toast.error(error.message || 'Failed to create ticket')`
- Line 350: `alert('Failed to parse file...')` → `toast.error('Failed to parse file. Please check the format.')`
- Line 278: Keep `confirm()` for team deletion
- Line 2319: Keep `confirm()` for request deletion

### 4. **admin/tickets/[id]/timeline/page.tsx** (1 alert)
**Replace:**
- Line 166: `alert('Failed to add note')` → `toast.error('Failed to add note')`

---

## Usage Examples:

```typescript
// Success message
toast.success('User created successfully!');

// Error message
toast.error(error.message || 'Failed to save');

// Warning (validation)
toast.warning('Please enter a username');

// Info
toast.info('Processing your request...');

// Custom duration (default is 5000ms)
toast.success('Saved!', 3000);
```

---

## Benefits:

✅ **No more alert() interruptions** - Non-blocking notifications  
✅ **Better UX** - Beautiful, consistent design  
✅ **Auto-dismiss** - Cleans up automatically  
✅ **Stacking** - Multiple toasts stack nicely  
✅ **Error Boundaries** - UI won't crash from unhandled errors  
✅ **Type-safe** - Full TypeScript support  

---

## Error Boundary Benefits:

**Before:** One error crashes entire app  
**After:** Error is caught, user sees friendly message, can refresh or go back  

**Production Ready:** Add error logging service integration in ErrorBoundary.tsx:
```typescript
componentDidCatch(error: Error, errorInfo: any) {
  // Send to Sentry, LogRocket, etc.
  Sentry.captureException(error, { extra: errorInfo });
}
```

---

## Quick Replace Script:

For each remaining file:
1. Import: `import { useToast } from '@/app/components/ToastContainer';`
2. Hook: `const toast = useToast();`
3. Replace: `alert(...)` → `toast.error(...)` or `toast.warning(...)`
4. Add success messages where appropriate
5. Keep `confirm()` for now (can create custom modal later)
