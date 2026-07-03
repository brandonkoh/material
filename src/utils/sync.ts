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
    if (
      firstCol === "No" || 
      secondCol === "문서번호" || 
      firstCol === "문서번호" || 
      firstCol.toLowerCase() === "id" || 
      firstCol.toLowerCase() === "index"
    ) {
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
      const parsedItems: any[] = [];

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

      // Map parsed items into strictly typed PurchaseItems
      const mappedItems: PurchaseItem[] = parsedItems.filter(Boolean).map((it: any, idx: number) => {
        return {
          id: String(it.id || `item-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`),
          bomCode: String(it.bomCode || ""),
          date: String(it.date || rawDate),
          division: String(it.division || "기타"),
          sector: String(it.sector || "기타"),
          item: String(it.item || "기타"),
          itemName: String(it.itemName || ""),
          quantity: Number(it.quantity !== undefined ? it.quantity : 1),
          unit: String(it.unit || "EA"),
          price: Number(it.price !== undefined ? it.price : 0),
          remark: String(it.remark || ""),
          photo: String(it.photo || ""),
          photoName: String(it.photoName || ""),
          buySite: String(it.buySite || ""),
          stock: String(it.stock !== undefined ? it.stock : ""),
          comment: String(it.comment || ""),
          incomingStatus: String(it.incomingStatus === "입고완료" ? "입고완료" : "미입고") as "미입고" | "입고완료",
          status: String(it.status === "결재" ? "결재" : it.status === "거부" ? "거부" : "대기") as "대기" | "결재" | "거부",
          attachmentName: it.attachmentName ? String(it.attachmentName) : undefined,
          attachmentData: it.attachmentData ? String(it.attachmentData) : undefined,
        };
      });

      if (requestMap.has(id)) {
        const existing = requestMap.get(id)!;
        for (const item of mappedItems) {
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
          items: mappedItems
        });
      }
    }
  }

  return Array.from(requestMap.values()).sort((a, b) => a.index - b.index);
}

/**
 * Robustly parses input of unknown format into typed PurchaseRequests
 */
export function robustParseData(data: any): PurchaseRequest[] {
  let workingData = data;

  // 1. Un-nest or un-wrap from object if wrapped (e.g. { status: 'success', data: [...] })
  if (workingData && typeof workingData === "object" && !Array.isArray(workingData)) {
    if ("data" in workingData) {
      workingData = workingData.data;
    } else if ("requests" in workingData) {
      workingData = workingData.requests;
    }
  }

  // 2. Recursively parse if it's a JSON string
  let parseAttempts = 0;
  while (typeof workingData === "string" && parseAttempts < 5) {
    parseAttempts++;
    const trimmed = workingData.trim();
    if (!trimmed) {
      return [];
    }
    try {
      workingData = JSON.parse(trimmed);
    } catch (e) {
      // Not a valid JSON, break out of string loop
      break;
    }
  }

  // 3. Check again if parsed object has nested 'data' or 'requests'
  if (workingData && typeof workingData === "object" && !Array.isArray(workingData)) {
    if ("data" in workingData) {
      workingData = workingData.data;
    } else if ("requests" in workingData) {
      workingData = workingData.requests;
    }
  }

  // 4. One more round of parsing string if needed
  parseAttempts = 0;
  while (typeof workingData === "string" && parseAttempts < 5) {
    parseAttempts++;
    const trimmed = workingData.trim();
    if (!trimmed) {
      return [];
    }
    try {
      workingData = JSON.parse(trimmed);
    } catch (e) {
      break;
    }
  }

  // 5. Ensure we have an array
  if (!Array.isArray(workingData)) {
    return [];
  }

  if (workingData.length === 0) {
    return [];
  }

  // 6. Check if it's a 2D array of spreadsheet rows
  if (Array.isArray(workingData[0])) {
    return parseGasRows(workingData);
  }

  // 7. Otherwise, assume it's already an array of PurchaseRequests (structured or partially structured objects)
  const mappedRequests: PurchaseRequest[] = [];
  
  for (const item of workingData) {
    if (!item || typeof item !== "object") continue;

    // Check if it's a PurchaseRequest (has items array)
    if (Array.isArray(item.items)) {
      const mappedItems: PurchaseItem[] = item.items.map((it: any, itIdx: number) => {
        return {
          id: String(it.id || `item-${Date.now()}-${itIdx}-${Math.random().toString(36).substr(2, 4)}`),
          bomCode: String(it.bomCode || ""),
          date: String(it.date || item.date || new Date().toISOString().split("T")[0]),
          division: String(it.division || "기타"),
          sector: String(it.sector || "기타"),
          item: String(it.item || "기타"),
          itemName: String(it.itemName || ""),
          quantity: Number(it.quantity !== undefined ? it.quantity : 1),
          unit: String(it.unit || "EA"),
          price: Number(it.price !== undefined ? it.price : 0),
          remark: String(it.remark || ""),
          photo: String(it.photo || ""),
          photoName: String(it.photoName || ""),
          buySite: String(it.buySite || ""),
          stock: String(it.stock !== undefined ? it.stock : ""),
          comment: String(it.comment || ""),
          incomingStatus: String(it.incomingStatus === "입고완료" ? "입고완료" : "미입고") as "미입고" | "입고완료",
          status: String(it.status === "결재" ? "결재" : it.status === "거부" ? "거부" : "대기") as "대기" | "결재" | "거부",
          attachmentName: it.attachmentName ? String(it.attachmentName) : undefined,
          attachmentData: it.attachmentData ? String(it.attachmentData) : undefined,
        };
      });

      mappedRequests.push({
        id: String(item.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`),
        index: Number(item.index || mappedRequests.length + 1),
        date: String(item.date || new Date().toISOString().split("T")[0]),
        requester: String(item.requester || "admin"),
        items: mappedItems,
        createdAt: String(item.createdAt || new Date().toISOString())
      });
    } else {
      // If we got individual flat items instead of grouped requests, we group them!
      // This is handled in the fallback step below.
    }
  }

  if (mappedRequests.length > 0) {
    return mappedRequests.sort((a, b) => a.index - b.index);
  }

  // 8. Fallback: If workingData is a flat list of individual purchase items, group them by date/requestId
  const groups: Record<string, any[]> = {};
  workingData.forEach((it: any) => {
    if (!it || typeof it !== "object") return;
    const docNo = String(it.docNo || it.docNum || it.requestId || "default");
    const d = String(it.date || new Date().toISOString().split("T")[0]);
    const key = docNo !== "default" ? docNo : d;
    if (!groups[key]) groups[key] = [];
    groups[key].push(it);
  });

  const keys = Object.keys(groups);
  if (keys.length > 0) {
    let indexCounter = 1;
    keys.forEach(key => {
      const itemsInGroup = groups[key];
      const date = String(itemsInGroup[0].date || new Date().toISOString().split("T")[0]);
      const requester = String(itemsInGroup[0].requester || "admin");
      
      const mappedItems: PurchaseItem[] = itemsInGroup.map((it: any, idx: number) => ({
        id: String(it.id || `item-${Date.now()}-${idx}`),
        bomCode: String(it.bomCode || ""),
        date: String(it.date || date),
        division: String(it.division || "기타"),
        sector: String(it.sector || "기타"),
        item: String(it.item || "기타"),
        itemName: String(it.itemName || it.item_name || ""),
        quantity: Number(it.quantity !== undefined ? it.quantity : it.qty !== undefined ? it.qty : 1),
        unit: String(it.unit || "EA"),
        price: Number(it.price !== undefined ? it.price : 0),
        remark: String(it.remark || ""),
        photo: String(it.photo || ""),
        photoName: String(it.photoName || ""),
        buySite: String(it.buySite || ""),
        stock: String(it.stock !== undefined ? it.stock : ""),
        comment: String(it.comment || ""),
        incomingStatus: String(it.incomingStatus === "입고완료" ? "입고완료" : "미입고") as "미입고" | "입고완료",
        status: String(it.status === "결재" ? "결재" : it.status === "거부" ? "거부" : "대기") as "대기" | "결재" | "거부",
      }));

      mappedRequests.push({
        id: key.startsWith("req-") ? key : `req-${key}`,
        index: indexCounter++,
        date,
        requester,
        items: mappedItems,
        createdAt: new Date().toISOString()
      });
    });
    return mappedRequests;
  }

  return [];
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
    if (!dataText || dataText.trim() === "") {
      return [];
    }

    return robustParseData(dataText);
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
