# AlphaPro Dashboard - Table Format Specification

## New Table Layout Convention

### Core Principle
- **First Column Header**: DAY
- **Row 1**: Today
- **Rows 2-7**: Numeric days (2, 3, 4, 5, 6, 7...)
- **Columns**: Metrics/Values

---

## Example: Home Page Profit Metrics

### Final Format (CORRECT)
```
+------------+---------------+------------+------------+-----------+-----------+
| DAY        | PROFIT/TRADE | TRADES/HOUR| PROFIT/HOUR| TODAY PROF| GAS FEES  |
+------------+---------------+------------+------------+-----------+-----------+
| Today     | $45.20       | 12.5       | $565.00    | $2,450    | $125.00   |
| 2         | $42.80       | 11.2       | $480.00    | $2,100    | $110.00   |
| 3         | $38.50       | 10.8       | $420.00    | $1,890    | $95.00    |
| 4         | $40.20       | 9.5        | $380.00    | $1,650    | $88.00    |
| 5         | $35.00       | 8.2        | $290.00    | $1,200    | $75.00    |
| 6         | $32.50       | 7.5        | $250.00    | $950      | $65.00    |
| 7         | $30.00       | 6.8        | $210.00    | $720      | $55.00    |
+------------+---------------+------------+------------+-----------+-----------+
```

### Explanation
- **Row 1**: Today (most recent)
- **Row 2**: 2 days ago
- **Row 3**: 3 days ago
- **Row N**: N days ago

---

## Implementation Files

| File | Purpose |
|------|---------|
| `src/utils/dateUtils.ts` | Date formatting utilities |
| `src/components/DataTable.tsx` | Reusable table component |
| `src/pages/Home.tsx` | Dashboard home page |

---

## Summary

| Aspect | Implementation |
|--------|---------------|
| First Column Header | DAY |
| Row 1 | Today |
| Row 2+ | 2, 3, 4, 5, 6, 7... (days ago) |
| Default Sort | Descending (Today at top) |
| All Pages | Consistent day-row format |
| Sortable | By day column |
