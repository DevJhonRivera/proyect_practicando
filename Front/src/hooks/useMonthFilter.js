import { useMemo, useState } from "react";

export function currentMonthValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${now.getFullYear()}-${month}`;
}

export function currentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0);

  return {
    from: firstDay,
    to: `${year}-${String(month + 1).padStart(2, "0")}-${String(
      lastDay.getDate()
    ).padStart(2, "0")}`,
  };
}

export function monthValueRange(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return {};
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    desde: `${month}-01`,
    hasta: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function useMonthFilter(
  items,
  getDate = (item) => item.createdAt
) {
  const [month, setMonth] = useState(currentMonthValue);

  const filteredItems = useMemo(() => {
    if (!month) {
      return items;
    }

    return items.filter((item) => {
      const value = getDate(item);

      if (!value) {
        return false;
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return false;
      }

      const itemMonth = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      return itemMonth === month;
    });
  }, [getDate, items, month]);

  return {
    filteredItems,
    month,
    setMonth,
  };
}
