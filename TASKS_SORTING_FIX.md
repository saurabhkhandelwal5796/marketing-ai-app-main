# Tasks Sorting Fix - Complete Solution

## Problem
Tasks sorting was not working when a user filter (assignee) was applied. The sorting only worked when "Select user" (no filter) was selected.

## Root Causes

### Issue 1: Client-side filtering after API call
The `userId` filter was being applied client-side AFTER fetching all tasks from the API. This meant:
- API sorted ALL tasks
- Client filtered by userId
- Result: Sorted order was based on all tasks, not the filtered subset

### Issue 2: Client-side re-sorting
The `tasksFiltered` useMemo had a hardcoded sort at the end:
```javascript
list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
```
This was overriding the server-side sorting.

### Issue 3: Milestone tasks not sorted
The API was combining regular tasks and milestone tasks, but only regular tasks were sorted by the database. Milestone tasks were appended without sorting.

## Solutions Applied

### Fix 1: Pass userId to API
**File:** `app/my-tasks/page.js`

```javascript
const loadTasks = async () => {
  const params = new URLSearchParams({
    sortBy: sortBy,
    sortOrder: sortOrder,
  });
  if (userId) {
    params.set("userId", userId);  // ✅ Pass filter to API
  }
  const res = await fetch(`/api/tasks?${params.toString()}`);
  // ...
};
```

**Added dependency:**
```javascript
useEffect(() => {
  loadTasks();
}, [sortBy, sortOrder, userId]);  // ✅ Reload when userId changes
```

### Fix 2: Remove client-side userId filtering
**File:** `app/my-tasks/page.js`

```javascript
// REMOVED this code:
// if (userId) {
//   list = list.filter((t) => t.assignee_id === userId);
// }
```

Now the API handles the filtering, so we don't need to filter again on the client.

### Fix 3: Remove client-side sorting
**File:** `app/my-tasks/page.js`

```javascript
// REMOVED this code:
// list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
```

Data is already sorted from the API.

### Fix 4: Sort combined tasks in API
**File:** `app/api/tasks/route.js`

```javascript
// Combine and sort all tasks
const allTasks = [...(data || []), ...normalizedMilestoneTasks];
allTasks.sort((a, b) => {
  const aVal = a[sortBy];
  const bVal = b[sortBy];
  
  // Handle null/undefined values
  if (aVal == null && bVal == null) return 0;
  if (aVal == null) return ascending ? 1 : -1;
  if (bVal == null) return ascending ? -1 : 1;
  
  // Compare values
  if (aVal < bVal) return ascending ? -1 : 1;
  if (aVal > bVal) return ascending ? 1 : -1;
  return 0;
});

return NextResponse.json({ tasks: allTasks });
```

This ensures both regular tasks AND milestone tasks are sorted together.

## How It Works Now

### Scenario 1: No user filter (Select user = empty)
1. User clicks sort header (e.g., Due Date ascending)
2. `loadTasks()` called with `sortBy=due_date`, `sortOrder=asc`, no userId
3. API fetches ALL tasks (for admin) or user's tasks (for non-admin)
4. API sorts regular tasks by due_date
5. API combines with milestone tasks and sorts again
6. Client receives sorted data
7. Client applies other filters (Today's Tasks, High Priority, etc.) without re-sorting
8. Table displays properly sorted tasks

### Scenario 2: With user filter (e.g., John Doe selected)
1. User selects "John Doe" from assignee dropdown
2. `loadTasks()` called with `userId=john-id`, `sortBy=created_at`, `sortOrder=desc`
3. API fetches ONLY John's tasks (filtered at database level)
4. API sorts John's tasks by created_at descending
5. API combines with John's milestone tasks and sorts again
6. Client receives sorted, filtered data
7. User clicks sort header (e.g., Due Date ascending)
8. `loadTasks()` called again with `userId=john-id`, `sortBy=due_date`, `sortOrder=asc`
9. API fetches and sorts ONLY John's tasks by due_date
10. Table displays John's tasks sorted by due date

## Benefits

✅ Sorting works with ANY filter combination
✅ Database handles sorting (more efficient)
✅ No client-side sorting conflicts
✅ Milestone tasks included in sort
✅ Consistent behavior across all scenarios

## Testing Checklist

- [x] Sort by Created Date with no user filter
- [x] Sort by Due Date with no user filter
- [x] Select a user, then sort by Created Date
- [x] Select a user, then sort by Due Date
- [x] Change sort order (asc/desc) with user filter
- [x] Apply other filters (Today's Tasks, High Priority) with sorting
- [x] Verify milestone tasks are included in sort
- [x] Switch between users and verify sorting persists correctly
