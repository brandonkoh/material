/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-ignore
import ExcelJSImport from "exceljs/dist/exceljs.min.js";
import * as ExcelJSType from "exceljs";
import { PurchaseItem } from "../types";

const getExcelJS = (): any => {
  if (ExcelJSImport && ExcelJSImport.Workbook) {
    return ExcelJSImport;
  }
  if (ExcelJSImport && (ExcelJSImport as any).default && (ExcelJSImport as any).default.Workbook) {
    return (ExcelJSImport as any).default;
  }
  if (typeof window !== "undefined" && (window as any).ExcelJS) {
    return (window as any).ExcelJS;
  }
  return ExcelJSImport;
};

/**
 * Helper to convert ArrayBuffer to Base64 string
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

interface ImageDetails {
  base64: string;
  extension: "png" | "jpeg" | "gif";
}

function parsePhoto(photoStr: string): ImageDetails | null {
  if (!photoStr) return null;
  
  // If it's already base64 data URL
  if (photoStr.startsWith("data:image/")) {
    const match = photoStr.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (match && match.length === 3) {
      let ext = match[1].toLowerCase();
      if (ext === "jpg") ext = "jpeg";
      if (ext !== "png" && ext !== "jpeg" && ext !== "gif") {
        ext = "png"; // Fallback
      }
      return {
        extension: ext as "png" | "jpeg" | "gif",
        base64: match[2]
      };
    }
  }
  
  // If it's a raw base64 string
  const cleanStr = photoStr.trim();
  if (/^[A-Za-z0-9+/=]+$/.test(cleanStr)) {
    return {
      extension: "png",
      base64: cleanStr
    };
  }
  
  return null;
}

function getImageDimensions(photoStr: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || 100, height: img.naturalHeight || 100 });
    };
    img.onerror = () => {
      resolve(null);
    };
    if (photoStr.startsWith("data:image/")) {
      img.src = photoStr;
    } else {
      img.src = `data:image/png;base64,${photoStr}`;
    }
  });
}

/**
 * Exports purchase items to an Excel file.
 */
export async function exportToExcel(
  items: PurchaseItem[], 
  filename: string = "자재구매신청서.xlsx",
  onProgress?: (percent: number) => void
) {
  if (onProgress) onProgress(0);
  const workbook = new (getExcelJS().Workbook)();
  const worksheet = workbook.addWorksheet("자재구매신청서");

  const headers = [
    "index",
    "bom\ncode",
    "일자",
    "구분",
    "종목",
    "품목",
    "품목명",
    "요청수량",
    "단위",
    "단가",
    "비고",
    "금액",
    "사진",
    "구매사이트",
    "재고",
    "기타(견적서)",
    "입고\n여부"
  ];

  worksheet.addRow(headers);

  let maxPhotoWidth = 0;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const rowNum = idx + 2; // header is row 1

    worksheet.addRow([
      item.index !== undefined ? item.index : idx + 1,
      item.bomCode || "",
      item.date || "",
      item.division || "",
      item.sector || "",
      item.item || "",
      item.itemName || "",
      item.quantity || 0,
      item.unit || "",
      item.price || 0,
      item.remark || "",
      (item.quantity || 0) * (item.price || 0),
      (item.photoName && item.photoName !== "imported_from_excel") ? `[사진] ${item.photoName}` : (item.photo && item.photoName !== "imported_from_excel" ? "[사진 첨부됨]" : ""),
      item.buySite || "",
      item.stock || "",
      item.attachmentName ? `[견적서] ${item.attachmentName} ${item.comment ? `(${item.comment})` : ""}` : (item.comment || ""),
      item.incomingStatus || "미입고"
    ]);

    if (item.photo) {
      const details = parsePhoto(item.photo);
      if (details) {
        try {
          const dims = await getImageDimensions(item.photo);
          if (dims) {
            const maxBound = 120; // 120px max size for crisp Excel thumbnails
            let targetWidth = dims.width;
            let targetHeight = dims.height;
            if (dims.width > maxBound || dims.height > maxBound) {
              const ratio = Math.min(maxBound / dims.width, maxBound / dims.height);
              targetWidth = dims.width * ratio;
              targetHeight = dims.height * ratio;
            }

            const imageId = workbook.addImage({
              base64: details.base64,
              extension: details.extension,
            });

            // Set specific row height to fit the scaled image nicely
            // Row height in points: 1 point = 1.33 pixels. We add 12px vertical padding.
            worksheet.getRow(rowNum).height = (targetHeight + 12) * 0.75;

            if (targetWidth > maxPhotoWidth) {
              maxPhotoWidth = targetWidth;
            }

            // Put image in column 13 (Column M), index 12
            worksheet.addImage(imageId, {
              tl: { col: 12, row: rowNum - 1 },
              ext: { width: targetWidth, height: targetHeight },
              editAs: 'oneCell'
            });

            // Set the alignment of the cell containing the fallback text/image placeholder
            const cell = worksheet.getCell(rowNum, 13);
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        } catch (err) {
          console.error("Failed to embed image in excel export:", err);
        }
      }
    }

    if (onProgress) {
      onProgress(Math.round(((idx + 1) / items.length) * 100));
      // Yield control slightly so that React renders progress bar smoothly
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }

  // Adjust column widths
  worksheet.columns = [
    { width: 6 },  // index
    { width: 15 }, // bom\ncode
    { width: 12 }, // 일자
    { width: 10 }, // 구분
    { width: 12 }, // 종목
    { width: 15 }, // 품목
    { width: 25 }, // 품목명
    { width: 10 }, // 요청수량
    { width: 8 },  // 단위
    { width: 12 }, // 단가
    { width: 20 }, // 비고
    { width: 14 }, // 금액
    { width: 15 }, // 사진
    { width: 20 }, // 구매사이트
    { width: 10 }, // 재고
    { width: 25 }, // 기타(견적서)
    { width: 10 }  // 입고\n여부
  ];

  // If we had photos, dynamically adjust the width of column 13 ("사진") to fit the widest photo
  if (maxPhotoWidth > 0) {
    // Column width unit in Excel is approx 7.5 pixels. We add 16px horizontal padding.
    worksheet.getColumn(13).width = Math.max(15, (maxPhotoWidth + 16) / 7.5);
  }

  // Format all cells: set font size to 10, align properly, and apply comma format to price and amount
  worksheet.eachRow((row, rowNum) => {
    row.eachCell((cell, colNumber) => {
      // Set font size to 10 for all cells
      cell.font = {
        name: cell.font?.name || "맑은 고딕",
        size: 10,
        bold: cell.font?.bold,
        color: cell.font?.color,
        italic: cell.font?.italic,
        underline: cell.font?.underline
      };

      // Align cells vertically & horizontally
      let horizontalAlign: "left" | "center" | "right" = "left";
      if (rowNum === 1) {
        horizontalAlign = "center";
      } else if (colNumber === 1 || colNumber === 3 || colNumber === 4 || colNumber === 5 || colNumber === 8 || colNumber === 9 || colNumber === 13 || colNumber === 17) {
        horizontalAlign = "center";
      } else if (colNumber === 10 || colNumber === 12) {
        horizontalAlign = "right";
      }

      cell.alignment = {
        vertical: "middle",
        horizontal: cell.alignment?.horizontal || horizontalAlign,
        wrapText: colNumber === 2 || colNumber === 17 ? true : (cell.alignment?.wrapText || false)
      };

      // For "단가" (Col 10) and "금액" (Col 12) columns, apply number format with commas
      if (rowNum > 1 && (colNumber === 10 || colNumber === 12)) {
        cell.numFmt = '#,##0';
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Helper to get string value from exceljs cell
 */
const getCellValue = (cell: ExcelJSType.Cell): string => {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map(rt => rt.text || "").join("").trim();
    }
    if ("result" in value) {
      return String(value.result || "").trim();
    }
    if ("text" in value) {
      return String(value.text || "").trim();
    }
  }
  return String(value).trim();
};

/**
 * Imports purchase items from an uploaded Excel file.
 */
export async function importFromExcel(file: File, onProgress?: (percent: number) => void): Promise<Partial<PurchaseItem>[]> {
  try {
    const data = await file.arrayBuffer();
    const workbook = new (getExcelJS().Workbook)();
    await workbook.xlsx.load(data);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("워크시트를 찾을 수 없습니다.");
    }

    // Helper to format date consistently to YYYY-MM-DD
    const formatExcelDate = (rawValue: any): string => {
      let dateObj: Date | null = null;
      
      if (rawValue instanceof Date) {
        dateObj = rawValue;
      } else if (rawValue && typeof rawValue === "object" && "result" in rawValue && rawValue.result instanceof Date) {
        dateObj = rawValue.result;
      }
      
      if (dateObj) {
        const y = dateObj.getUTCFullYear();
        const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getUTCDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
      
      const valStr = String(rawValue && typeof rawValue === "object" && "result" in rawValue ? rawValue.result : (rawValue || "")).trim();
      if (!valStr) return "";
      
      const normalized = valStr.replace(/\//g, "-").replace(/\./g, "-");
      const parts = normalized.split("-");
      if (parts.length === 3) {
        let y = parts[0];
        let m = parts[1].padStart(2, "0");
        let d = parts[2].padStart(2, "0");
        if (y.length === 2) {
          y = "20" + y; // handle YY-MM-DD
        }
        if (y.length === 4 && m.length <= 2 && d.length <= 2) {
          return `${y}-${m}-${d}`;
        }
      }
      return valStr;
    };

    const headers: string[] = [];
    let headerRowIndex = 1;
    
    // Scan first 20 rows for headers to be more robust
    for (let i = 1; i <= Math.min(20, worksheet.rowCount); i++) {
      const row = worksheet.getRow(i);
      let foundCount = 0;
      row.eachCell({ includeEmpty: false }, (cell) => {
        const val = getCellValue(cell).toLowerCase().replace(/\s/g, "");
        if (
          val.includes("구분") || 
          val.includes("품목명") || 
          val.includes("index") || 
          val.includes("일자") || 
          val.includes("품목") || 
          val.includes("수량") ||
          val.includes("bom")
        ) {
          foundCount++;
        }
      });
      
      // If at least 2 headers match, we assume this is the header row
      if (foundCount >= 2) {
        headerRowIndex = i;
        // Collect all headers in this row using values.length to prevent skipping sparse columns
        const maxCol = Math.max(row.values.length - 1, row.cellCount);
        for (let j = 1; j <= maxCol; j++) {
          headers[j - 1] = getCellValue(row.getCell(j)).trim();
        }
        break;
      }
    }

    if (headers.length === 0) {
      const row = worksheet.getRow(1);
      const maxCol = Math.max(row.values.length - 1, row.cellCount);
      for (let j = 1; j <= maxCol; j++) {
        headers[j - 1] = getCellValue(row.getCell(j));
      }
      headerRowIndex = 1;
    }

    // Extract images and group them by cell (row, col)
    const imagesMap: { [key: string]: string } = {};
    const images = worksheet.getImages();
    
    for (const img of images) {
      const image = workbook.getImage(Number(img.imageId));
      if (image && img.range && img.range.tl) {
        const rowIdx = Math.floor(img.range.tl.row) + 1;
        const colIdx = Math.floor(img.range.tl.col) + 1;
        
        if (image.buffer) {
          const base64 = `data:image/${image.extension};base64,${arrayBufferToBase64(image.buffer as ArrayBuffer)}`;
          imagesMap[`${rowIdx}-${colIdx}`] = base64;
        }
      }
    }

    if (onProgress) onProgress(0);

    const rowsToProcess: ExcelJSType.Row[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > headerRowIndex) {
        rowsToProcess.push(row);
      }
    });

    const items: Partial<PurchaseItem>[] = [];

    for (let idx = 0; idx < rowsToProcess.length; idx++) {
      const row = rowsToProcess[idx];
      const rowNumber = row.number;

      const item: Partial<PurchaseItem> = {
        id: `imported-${Date.now()}-${rowNumber}-${Math.random().toString(36).substr(2, 4)}`,
        status: "대기",
      };

      headers.forEach((header, colIdx) => {
        if (!header) return;
        const cell = row.getCell(colIdx + 1);
        const rawValue = cell.value;
        const valStr = getCellValue(cell);
        const cleanHeader = header.toLowerCase().replace(/\s/g, "");

        if (cleanHeader === "index") {
          // skip
        } else if (cleanHeader === "bomcode" || cleanHeader === "bom\ncode") {
          item.bomCode = valStr;
        } else if (cleanHeader === "일자") {
          item.date = formatExcelDate(rawValue);
        } else if (cleanHeader === "구분") {
          item.division = valStr;
        } else if (cleanHeader === "종목") {
          item.sector = valStr;
        } else if (cleanHeader === "품목") {
          item.item = valStr;
        } else if (cleanHeader === "품목명") {
          item.itemName = valStr;
        } else if (cleanHeader === "요청수량") {
          item.quantity = parseFloat(valStr) || 0;
        } else if (cleanHeader === "단위") {
          item.unit = valStr;
        } else if (cleanHeader === "단가") {
          item.price = parseFloat(valStr.replace(/[^0-9.]/g, "")) || 0;
        } else if (cleanHeader === "비고") {
          item.remark = valStr;
        } else if (cleanHeader === "구매사이트") {
          item.buySite = valStr;
        } else if (cleanHeader === "재고") {
          item.stock = valStr;
        } else if (cleanHeader === "기타(견적서)" || cleanHeader === "기타") {
          if (valStr.startsWith("[견적서]")) {
            const match = valStr.match(/\[견적서\]\s*([^(]+)(?:\((.*)\))?/);
            if (match) {
              item.attachmentName = match[1].trim();
              item.comment = match[2] ? match[2].trim() : "";
            } else {
              item.comment = valStr;
            }
          } else {
            item.comment = valStr;
          }
        } else if (cleanHeader === "입고여부" || cleanHeader === "입고\n여부") {
          item.incomingStatus = valStr === "입고완료" ? "입고완료" : "미입고";
        } else if (cleanHeader === "사진") {
          const imageBase64 = imagesMap[`${rowNumber}-${colIdx + 1}`];
          if (imageBase64) {
            item.photo = imageBase64;
            item.photoName = "imported_from_excel";
          } else if (valStr.startsWith("[사진]")) {
            item.photoName = valStr.replace("[사진]", "").trim();
          }
        }
      });

      if (item.division || item.item || item.itemName) {
        item.bomCode = item.bomCode || "";
        item.date = item.date || new Date().toISOString().split("T")[0];
        item.division = item.division || "기타";
        item.sector = item.sector || "기타";
        item.item = item.item || "기타";
        item.itemName = item.itemName || "";
        item.quantity = item.quantity !== undefined ? item.quantity : 1;
        item.unit = item.unit || "EA";
        item.price = item.price !== undefined ? item.price : 0;
        item.remark = item.remark || "";
        item.photo = item.photo || "";
        item.buySite = item.buySite || "";
        item.stock = item.stock !== undefined ? item.stock : "";
        item.comment = item.comment || "";
        item.incomingStatus = item.incomingStatus || "미입고";
        item.status = "대기";

        items.push(item);
      }

      if (onProgress) {
        onProgress(Math.round(((idx + 1) / rowsToProcess.length) * 100));
        // Yield control slightly so that React renders progress bar smoothly
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }

    return items;
  } catch (err) {
    console.error("Excel import error:", err);
    throw err;
  }
}
