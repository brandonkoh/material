/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "admin" | "결재자" | "신청자";

export interface User {
  username: string; // admin, 결재자, 신청자
  role: UserRole;
  passwordHash: string; // Stored password (plain for this demo, editable by admin)
}

export interface PurchaseItem {
  id: string;
  index?: number;        // Global index (if calculated)
  bomCode: string;       // bom code (two lines in table display)
  date: string;          // 일자
  division: string;      // 구분 (Category Division)
  sector: string;        // 종목 (Category Sector)
  item: string;          // 품목 (Category Item)
  itemName: string;      // 품목명
  quantity: number;      // 요청수량
  unit: string;          // 단위
  price: number;         // 단가
  remark: string;        // 비고
  photo: string;         // 사진 (base64 image or file placeholder URL)
  photoName?: string;    // 사진 파일명
  buySite: string;       // 구매사이트
  stock: string | number;// 재고
  attachmentName?: string; // 기타 견적서 파일명
  attachmentData?: string; // 기타 견적서 base64 data
  comment: string;       // 기타 코멘트
  incomingStatus: "미입고" | "입고완료"; // 입고여부 (two lines in header)
  status: "대기" | "결재" | "거부";     // 품목별 결재상태
}

export interface PurchaseRequest {
  id: string;
  index: number;
  date: string;          // 일자
  requester: string;     // 신청자명
  items: PurchaseItem[];
  createdAt: string;     // 작성 시간
}
