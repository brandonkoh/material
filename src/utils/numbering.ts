/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PurchaseRequest } from "../types";

/**
 * Calculates the monthly sequence number for a request based on its date.
 * Logic: Group by Year/Month, sort by Date (asc) and then by original index (asc).
 */
export const getRequestMonthlyIndex = (req: PurchaseRequest, allRequests: PurchaseRequest[]): number => {
  if (!req.date) return 1;
  
  const [year, month] = req.date.split('-').map(Number);
  
  // Filter requests in the same month
  const sameMonthRequests = allRequests.filter(r => {
    if (!r.date) return false;
    const [ry, rm] = r.date.split('-').map(Number);
    return ry === year && rm === month;
  });

  // Sort them stable-ly to determine sequence
  const sorted = [...sameMonthRequests].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    // Fallback to original index if dates are same (to maintain creation order)
    return (a.index || 0) - (b.index || 0);
  });

  const seq = sorted.findIndex(r => r.id === req.id) + 1;
  return seq > 0 ? seq : 1;
};

/**
 * Calculates a global sequence number for an item across all requests,
 * ordered from oldest request to newest request, and by item order.
 */
export const getGlobalItemIndex = (itemId: string, allRequests: PurchaseRequest[]): number => {
  const sortedRequests = [...allRequests].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return (a.index || 0) - (b.index || 0);
  });

  let indexCounter = 1;
  for (const req of sortedRequests) {
    for (const item of req.items) {
      if (item.id === itemId) {
        return indexCounter;
      }
      indexCounter++;
    }
  }
  return 1;
};

/**
 * Formats the document number as "YYYY/M #N"
 */
export const formatDocNumber = (dateStr: string, monthlyIndex: number): string => {
  if (!dateStr) return `0000/0 #${monthlyIndex}`;
  const [year, month] = dateStr.split('-').map(Number);
  return `${year}/${month} #${monthlyIndex}`;
};
