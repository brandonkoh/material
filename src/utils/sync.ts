import { PurchaseRequest } from "../types";

const GAS_URL_KEY = "material_system_gas_url";

/**
 * Get the saved Google Apps Script Web App URL from localStorage
 */
export function getGasUrl(): string {
  return localStorage.getItem(GAS_URL_KEY) || "";
}

/**
 * Save the Google Apps Script Web App URL to localStorage
 */
export function setGasUrl(url: string): void {
  localStorage.setItem(GAS_URL_KEY, url.trim());
}

/**
 * Fetch data from Google Apps Script (GET)
 */
export async function pullFromGas(url: string): Promise<PurchaseRequest[]> {
  const targetUrl = url.trim();
  if (!targetUrl) throw new Error("Google Apps Script URL이 설정되지 않았습니다.");

  try {
    // We fetch from the Google Apps Script Web App URL.
    // Apps Script redirects, so the fetch API automatically handles redirect.
    const response = await fetch(targetUrl, {
      method: "GET",
      mode: "cors",
      credentials: "omit"
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const dataText = await response.text();
    if (!dataText) {
      return [];
    }

    const parsed = JSON.parse(dataText);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    // In case of wrapper object { status: 'success', data: [...] }
    if (parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    }

    return [];
  } catch (error: any) {
    console.error("Failed to pull from Google Apps Script:", error);
    throw new Error(error.message || "구글 시트 데이터를 가져오는데 실패했습니다. URL 또는 CORS 설정을 확인하세요.");
  }
}

/**
 * Send data to Google Apps Script (POST) using text/plain to bypass CORS preflight blocking
 */
export async function pushToGas(url: string, requests: PurchaseRequest[]): Promise<{ status: string; count?: number; message?: string }> {
  const targetUrl = url.trim();
  if (!targetUrl) throw new Error("Google Apps Script URL이 설정되지 않았습니다.");

  try {
    // Send as text/plain;charset=utf-8 to prevent CORS preflight OPTIONS block
    const response = await fetch(targetUrl, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(requests),
      credentials: "omit"
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const resText = await response.text();
    try {
      return JSON.parse(resText);
    } catch (e) {
      // Sometimes GAS returns raw text or HTML redirects, fallback to successful parse of text
      return { status: "success", message: resText };
    }
  } catch (error: any) {
    console.error("Failed to push to Google Apps Script:", error);
    throw new Error(error.message || "구글 시트로 데이터를 저장하는데 실패했습니다. URL 또는 CORS 설정을 확인하세요.");
  }
}
