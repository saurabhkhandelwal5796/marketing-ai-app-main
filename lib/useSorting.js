import { useMemo, useState } from "react";

/**
 * Custom hook for sortable tables
 * @param {Array} data - The array of data to sort
 * @param {string} defaultSortKey - Default column to sort by
 * @param {string} defaultSortOrder - Default sort order ('asc' or 'desc')
 * @returns {Object} - { sortedData, sortBy, sortOrder, onSort }
 */
export function useSorting(data, defaultSortKey = "created_at", defaultSortOrder = "desc") {
  const [sortBy, setSortBy] = useState(defaultSortKey);
  const [sortOrder, setSortOrder] = useState(defaultSortOrder);

  const onSort = (key) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortOrder("asc");
  };

  const sortedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    
    const sorted = [...data];
    sorted.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle date fields
      if (sortBy.includes("date") || sortBy.includes("_at")) {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }
      // Handle string fields
      else if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
        return sortOrder === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      // Handle numeric fields
      else if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Default comparison
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      return sortOrder === "asc" 
        ? (aVal > bVal ? 1 : -1) 
        : (aVal < bVal ? 1 : -1);
    });
    
    return sorted;
  }, [data, sortBy, sortOrder]);

  return { sortedData, sortBy, sortOrder, onSort };
}
