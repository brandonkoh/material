/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PurchaseRequest } from "../types";

const LOCAL_STORAGE_KEY = "purchase_management_requests";

// Load all purchase requests from localStorage
export async function getAllRequests(): Promise<PurchaseRequest[]> {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      return [];
    }
    const requestsList: PurchaseRequest[] = JSON.parse(data);
    // Sort by index ascending (preserving original order)
    return requestsList.sort((a, b) => a.index - b.index);
  } catch (error) {
    console.error("Failed to load requests from localStorage:", error);
    return [];
  }
}

// Overwrite or save multiple purchase requests to localStorage
export async function saveRequests(allData: PurchaseRequest[]): Promise<boolean> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allData));
    return true;
  } catch (error) {
    console.error("Save to localStorage failed:", error);
    return false;
  }
}

// Add or update a single purchase request in localStorage
export async function saveRequest(newRequest: PurchaseRequest): Promise<boolean> {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    let requestsList: PurchaseRequest[] = [];
    if (data) {
      requestsList = JSON.parse(data);
    }
    
    const existingIndex = requestsList.findIndex((req) => req.id === newRequest.id);
    if (existingIndex >= 0) {
      requestsList[existingIndex] = newRequest;
    } else {
      requestsList.push(newRequest);
    }
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(requestsList));
    return true;
  } catch (error) {
    console.error("Save single request to localStorage failed:", error);
    return false;
  }
}

// Delete multiple purchase requests from localStorage
export async function deleteRequests(idsToDelete: (string | number)[]): Promise<boolean> {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return true;
    
    let requestsList: PurchaseRequest[] = JSON.parse(data);
    const idsStrSet = new Set(idsToDelete.map(id => String(id)));
    requestsList = requestsList.filter((req) => !idsStrSet.has(String(req.id)));
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(requestsList));
    return true;
  } catch (error) {
    console.error("Delete from localStorage failed:", error);
    return false;
  }
}

