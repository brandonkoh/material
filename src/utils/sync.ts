import { PurchaseRequest, PurchaseItem } from "../types";

/**
 * Parse a Google Apps Script string representation of a JS object (key=value format)
 * e.g. "{id=item-1-1, bomCode=MECH-FCU-001, quantity=5}"
 */
function parseGasItemString(str: string): any {
  let clean = str.trim();
  if (clean.startsWith("{") && clean.endsWith("}")) {
    clean = clean.slice(1, -1);
  } else if (clean.startsWith("[") && clean.endsWith("]")) {
    clean = clean.slice(1, -1);
  }

  const obj: any = {};
  // Split by key-value pairs (using negative lookahead or simple regex matching keys)
  const pairs = clean.split(/,\s+(?=[a-zA-Z0-9]+=)/);
  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx !== -1) {
      const key = pair.substring(0, eqIdx).trim();
      let value: any = pair.substring(eqIdx + 1).trim();

      // Try to parse values
      if (value === "true") value = true;
      else if (value === "false") value = false;
      else if (!isNaN(Number(value)) && value !== "") value = Number(value);

      obj[key] = value;
    }
  }
  return obj;
}

/**
 * Convert Google Apps Script rows (array of arrays) back to PurchaseRequest objects
 */
export function parseGasRows(rows: any[]): PurchaseRequest[] {
  const requestMap = new Map<string, PurchaseRequest>();

  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 5) continue;

    // Skip header row
    const firstCol = String(row[0] || "").trim();
    const secondCol = String(row[1] || "").trim();
    if (firstCol === "No" || secondCol === "문서번호" || firstCol === "문서번호") {
      continue;
    }

    // Determine format by row length
    if (row.length >= 15) {
      // Format 2: Item-centric rows (자재구매목록 format)
      const docNum = String(row[1] || "").trim();
      if (!docNum) continue;

      // Group key is docNum (e.g., "20260703-004")
      const requestId = `req-${docNum}`;
      const requester = String(row[2] || "알수없음");
      
      // Parse Date from docNum
      let date = String(row[4] || "").trim();
      if (!date && docNum.length >= 8) {
        const yr = docNum.substring(0, 4);
        const mn = docNum.substring(4, 6);
        const dy = docNum.substring(6, 8);
        date = `${yr}-${mn}-${dy}`;
      }
      if (date.includes("T")) {
        date = date.split("T")[0];
      }

      // Parse index (e.g., "001" -> 1)
      let index = 1;
      const parts = docNum.split("-");
      if (parts.length > 1) {
        const parsedIdx = Number(parts[1]);
        if (!isNaN(parsedIdx)) {
          index = parsedIdx;
        }
      }

      // Reconstruct single PurchaseItem
      const bomCode = String(row[3] || "").trim();
      const division = String(row[5] || "기타").trim();
      const sector = String(row[6] || "기타").trim();
      const itemType = String(row[7] || "기타").trim();
      const itemName = String(row[8] || "").trim();
      const quantity = Number(row[9] || 1);
      const unit = String(row[10] || "EA").trim();
      const price = Number(row[11] || 0);
      const incomingStatus = String(row[13] || "미입고").trim() as "미입고" | "입고완료";
      const status = String(row[14] || "대기").trim() as "대기" | "결재" | "거부";
      const buySite = String(row[15] || "").trim();
      const stock = String(row[16] || "0").trim();
      const remark = String(row[17] || "").trim();
      const comment = String(row[18] || "").trim();
      
      // Generate unique item ID
      const itemId = `item-${docNum}-${bomCode || "no-bom"}-${itemName || "no-name"}-${index}`;

      const purchaseItem: PurchaseItem = {
        id: itemId,
        bomCode,
        date,
        division,
        sector,
        item: itemType,
        itemName,
        quantity,
        unit,
        price,
        incomingStatus,
        status,
        buySite,
        stock,
        remark,
        comment,
        photo: "" // photos are stored in system db if available
      };

      if (requestMap.has(requestId)) {
        const existing = requestMap.get(requestId)!;
        // Avoid duplicate items
        if (!existing.items.some(it => it.itemName === purchaseItem.itemName && it.bomCode === purchaseItem.bomCode)) {
          existing.items.push(purchaseItem);
        }
      } else {
        requestMap.set(requestId, {
          id: requestId,
          index,
          date,
          requester,
          createdAt: date + "T00:00:00Z",
          items: [purchaseItem]
        });
      }
    } else {
      // Format 1: Request-centric rows (system db or wrapper list)
      const id = String(row[0] || "");
      if (!id) continue;

      const index = Number(row[1] || 1);
      let rawDate = String(row[2] || "");
      if (rawDate.includes("T")) {
        rawDate = rawDate.split("T")[0];
      }
      const requester = String(row[3] || "");
      const createdAt = String(row[4] || new Date().toISOString());

      // Parse items column
      const itemsCol = row[5];
      const parsedItems: PurchaseItem[] = [];

      if (itemsCol) {
        if (Array.isArray(itemsCol)) {
          parsedItems.push(...itemsCol);
        } else if (typeof itemsCol === "object") {
          parsedItems.push(itemsCol);
        } else if (typeof itemsCol === "string") {
          const str = itemsCol.trim();
          if (str) {
            if (str.startsWith("[") && str.endsWith("]")) {
              try {
                const json = JSON.parse(str);
                if (Array.isArray(json)) {
                  parsedItems.push(...json);
                }
              } catch (e) {
                const matches = str.match(/\{[^}]+\}/g);
                if (matches) {
                  for (const m of matches) {
                    parsedItems.push(parseGasItemString(m));
                  }
                }
              }
            } else if (str.startsWith("{") && str.endsWith("}")) {
              try {
                const json = JSON.parse(str);
                parsedItems.push(json);
              } catch (e) {
                parsedItems.push(parseGasItemString(str));
              }
            } else if (str.includes("=")) {
              parsedItems.push(parseGasItemString(str));
            }
          }
        }
      }

      if (requestMap.has(id)) {
        const existing = requestMap.get(id)!;
        for (const item of parsedItems) {
          if (item && item.id && !existing.items.some(it => it.id === item.id)) {
            existing.items.push(item);
          }
        }
      } else {
        requestMap.set(id, {
          id,
          index,
          date: rawDate,
          requester,
          createdAt,
          items: parsedItems.filter(Boolean)
        });
      }
    }
  }

  return Array.from(requestMap.values()).sort((a, b) => a.index - b.index);
}

/**
 * Get the saved Google Apps Script Web App URL from window.GOOGLE_SCRIPT_URL
 */
export function getGasUrl(): string {
  return window.GOOGLE_SCRIPT_URL || "";
}

/**
 * Save the Google Apps Script Web App URL to window.GOOGLE_SCRIPT_URL
 */
export function setGasUrl(url: string): void {
  window.GOOGLE_SCRIPT_URL = url.trim();
}

/**
 * Fetch data from Google Apps Script (GET)
 */
export async function pullFromGas(url?: string): Promise<PurchaseRequest[]> {
  const targetUrl = (window.GOOGLE_SCRIPT_URL || url || "").trim();
  if (!targetUrl) throw new Error("GOOGLE_SCRIPT_URL이 설정되지 않았습니다.");

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
    
    // Check for wrapper object { status: 'success', data: [...] }
    let rawList: any[] = [];
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      rawList = parsed.data;
    } else {
      return [];
    }

    // If rawList consists of arrays (sheets rows format), parse them
    if (rawList.length > 0 && Array.isArray(rawList[0])) {
      return parseGasRows(rawList);
    }

    // Otherwise, assume it is already an array of PurchaseRequests
    return rawList;
  } catch (error: any) {
    console.error("Failed to pull from Google Apps Script:", error);
    throw new Error(error.message || "구글 시트 데이터를 가져오는데 실패했습니다. URL 또는 CORS 설정을 확인하세요.");
  }
}

/**
 * Send data to Google Apps Script (POST) using text/plain to bypass CORS preflight blocking
 */
export async function pushToGas(url: string | undefined, requests: PurchaseRequest[]): Promise<{ status: string; count?: number; message?: string }> {
  const targetUrl = (window.GOOGLE_SCRIPT_URL || url || "").trim();
  if (!targetUrl) throw new Error("GOOGLE_SCRIPT_URL이 설정되지 않았습니다.");

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
