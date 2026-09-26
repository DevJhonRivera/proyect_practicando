import { useState } from "react";

export function usePagination(items, initialPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalItems = items.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / pageSize)
  );
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  const changePageSize = (value) => {
    setPageSize(Number(value));
    setPage(1);
  };

  return {
    currentPage,
    pageItems: items.slice(
      startIndex,
      startIndex + pageSize
    ),
    pageSize,
    setPage,
    setPageSize: changePageSize,
    startIndex,
    totalItems,
    totalPages,
  };
}
