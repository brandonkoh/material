/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PurchaseRequest } from "../types";

export const initialRequests: PurchaseRequest[] = [
  {
    id: "req-1",
    index: 1,
    date: "2026-06-25",
    requester: "신청자",
    createdAt: "2026-06-25T10:30:00Z",
    items: [
      {
        id: "item-1-1",
        bomCode: "MECH-FCU-001",
        date: "2026-06-25",
        division: "기계",
        sector: "FCU",
        item: "FCU구동기",
        itemName: "FCU 열동식 구동기 220V",
        quantity: 5,
        unit: "EA",
        price: 24000,
        remark: "B동 3층 객실 구동기 교체용",
        photo: "",
        buySite: "https://example.com/fcu-valve",
        stock: "2",
        comment: "기존 구동기 노후화로 인한 전량 교체 요청",
        incomingStatus: "미입고",
        status: "결재"
      },
      {
        id: "item-1-2",
        bomCode: "MECH-FCU-002",
        date: "2026-06-25",
        division: "기계",
        sector: "FCU",
        item: "필터",
        itemName: "FCU 세척형 에어필터 400x200",
        quantity: 20,
        unit: "EA",
        price: 8500,
        remark: "A동 전 객실 교체 주기 도래",
        photo: "",
        buySite: "https://example.com/filter-shop",
        stock: "10",
        comment: "견적서 동봉함. 할인 단가 적용",
        incomingStatus: "입고완료",
        status: "결재"
      }
    ]
  },
  {
    id: "req-2",
    index: 2,
    date: "2026-06-27",
    requester: "신청자",
    createdAt: "2026-06-27T14:15:00Z",
    items: [
      {
        id: "item-2-1",
        bomCode: "ELEC-LGT-104",
        date: "2026-06-27",
        division: "전기",
        sector: "조명",
        item: "램프",
        itemName: "LED 다운라이트 6인치 15W 주백색",
        quantity: 50,
        unit: "EA",
        price: 4500,
        remark: "로비 조명 개선 사업용",
        photo: "",
        buySite: "https://smartstore.naver.com/led",
        stock: "5",
        comment: "대량 구매로 추가 할인 가능여부 확인 요망",
        incomingStatus: "미입고",
        status: "대기"
      },
      {
        id: "item-2-2",
        bomCode: "ELEC-WIR-055",
        date: "2026-06-27",
        division: "전기",
        sector: "전선",
        item: "케이블타이",
        itemName: "내열성 케이블타이 300mm",
        quantity: 10,
        unit: "PK",
        price: 3200,
        remark: "전선 정리 및 유지보수용 소모품",
        photo: "",
        buySite: "",
        stock: "없음",
        comment: "묶음 단위(100개입)",
        incomingStatus: "미입고",
        status: "대기"
      }
    ]
  },
  {
    id: "req-3",
    index: 3,
    date: "2026-06-28",
    requester: "admin",
    createdAt: "2026-06-28T09:00:00Z",
    items: [
      {
        id: "item-3-1",
        bomCode: "MAIN-MAT-902",
        date: "2026-06-28",
        division: "시설",
        sector: "자재",
        item: "실리콘",
        itemName: "바이오 실리콘 백색 (신에츠)",
        quantity: 30,
        unit: "EA",
        price: 3800,
        remark: "화장실 수전 및 틈새 보수용",
        photo: "",
        buySite: "",
        stock: "15",
        comment: "바이오 실리콘 백색 필수",
        incomingStatus: "입고완료",
        status: "거부"
      }
    ]
  }
];
