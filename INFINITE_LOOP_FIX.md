# Infinite Loop Fix - "Maximum Update Depth Exceeded"

## Problem
After implementing the hard reset logic, the Dashboard component was stuck in an infinite render loop with the error:
```
Maximum update depth exceeded
```

The courses were not showing, and the app was completely frozen.

## Root Cause

The problematic code was in the "stale grades cleanup" useEffect:

```typescript
// ❌ BROKEN CODE
useEffect(() => {
  const allComponentIds = new Set(
    semesters.flatMap(s => 
      s.courses.flatMap(c => 
        c.gradeComponents.map(gc => gc.id)
      )
    )
  );
  
  setLocalGrades(prev => {
    const cleaned: Record<string, number> = {};
    Object.keys(prev).forEach(id => {
      if (allComponentIds.has(id)) {
        cleaned[id] = prev[id];
      }
    });
    return cleaned; // ⚠️ Always returns a NEW object
  });
}, [semesters]);
```

### Why This Caused an Infinite Loop

1. **Effect depends on `semesters`** → Runs whenever `semesters` changes
2. **Always calls `setLocalGrades`** → Even when nothing actually changed
3. **Always returns new object** → React sees it as a state change
4. **`effectiveSemesters` depends on `localGrades`** → Recalculates
5. **Components re-render** → Query refetches
6. **`semesters` reference changes** → Effect runs again
7. **Loop repeats** → Maximum update depth exceeded

### The Cascade Effect

```
semesters changes
  ↓
useEffect runs
  ↓
setLocalGrades called (new object)
  ↓
localGrades changes
  ↓
effectiveSemesters recalculates
  ↓
Component re-renders
  ↓
React Query refetches (sees new render)
  ↓
semesters reference changes
  ↓
[LOOP BACK TO TOP]
```

## Solution

### Fix #1: Only Update State When Necessary

```typescript
// ✅ FIXED CODE
setLocalGrades(prev => {
  // Check if any keys need to be removed
  const keysToRemove = Object.keys(prev).filter(id => !allComponentIds.has(id));
  
  // Only update state if there are actually stale keys to remove
  if (keysToRemove.length === 0) {
    return prev; // ✅ Return SAME object to prevent re-render
  }
  
  // Create cleaned object only if necessary
  const cleaned: Record<string, number> = {};
  Object.keys(prev).forEach(id => {
    if (allComponentIds.has(id)) {
      cleaned[id] = prev[id];
    }
  });
  return cleaned;
});
```

**Key Change:** Return the same `prev` object if nothing needs to be cleaned. This prevents React from detecting a state change and triggering a re-render.

### Fix #2: Skip During Hard Refresh

```typescript
useEffect(() => {
  // Don't clean during hard refresh (state is already cleared)
  if (isHardRefreshing) return;
  
  // ... rest of the effect
}, [semesters, isHardRefreshing]);
```

**Key Change:** Skip the cleanup effect entirely during hard refresh, since the state is already explicitly cleared as part of the refresh process.

## Prevention Pattern

### General Rule for setState in useEffect

```typescript
// ❌ BAD - Always creates new object
useEffect(() => {
  setState(prev => {
    return { ...prev }; // Always new reference
  });
}, [dependency]);

// ✅ GOOD - Only updates when necessary
useEffect(() => {
  setState(prev => {
    if (noChangeNeeded) {
      return prev; // Same reference, no re-render
    }
    return { ...prev, newValue }; // New reference only when needed
  });
}, [dependency]);
```

### Checklist for useEffect with setState

When writing a `useEffect` that calls `setState`:

1. ✅ **Check if update is necessary** before calling setState
2. ✅ **Return the same object/array** if no changes needed
3. ✅ **Add guards** for special states (like `isHardRefreshing`)
4. ✅ **Use refs** for tracking if you need to know "first run" vs "subsequent runs"
5. ✅ **Be careful with object/array dependencies** - they create new references

## Testing Verification

After the fix, verify that:
- ✅ Dashboard loads without errors
- ✅ Courses display correctly
- ✅ No "Maximum update depth exceeded" error
- ✅ Grade changes still work
- ✅ Refresh button still works
- ✅ No infinite loops in console

## Related Files Modified

- `client/src/pages/Dashboard.tsx` - Fixed the stale grades cleanup effect

## Lessons Learned

1. **Never call `setState` unconditionally in `useEffect`** - Always check if the update is necessary
2. **Return the same reference** when state hasn't actually changed to prevent unnecessary re-renders
3. **Be mindful of cascading effects** - State A changing can trigger State B which triggers State A again
4. **Add guards for special states** - Skip effects during operations like hard refresh
5. **Test with React DevTools Profiler** - Catch excessive re-renders early

## Additional Notes

This is a common React anti-pattern that can be hard to debug because:
- The error message doesn't point to the specific useEffect
- The loop happens so fast that console.logs might not help
- It can work fine initially and only break after certain state changes

Always remember: **If setState is in a useEffect, ask yourself "Could this trigger its own dependency?"**
