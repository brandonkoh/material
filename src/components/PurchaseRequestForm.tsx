/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { PurchaseRequest, PurchaseItem, UserRole } from "../types";
import { Category } from "../data/categories";
import { exportToExcel } from "../utils/excel";
import { getRequestMonthlyIndex, formatDocNumber } from "../utils/numbering";
import { Plus, Trash2, Check, X, FileUp, Image as ImageIcon, Eye, Download, ArrowLeft, Save, FileSpreadsheet, Percent } from "lucide-react";

interface PurchaseRequestFormProps {
  categories: Category[];
  userRole: UserRole;
  username: string;
  requestToEdit?: PurchaseRequest | null;
  requests: PurchaseRequest[];
  onSave: (request: Omit<PurchaseRequest, "id" | "index"> & { id?: string }) => void;
  onCancel: () => void;
}

export default function PurchaseRequestForm({
  categories,
  userRole,
  username,
  requestToEdit,
  requests,
  onSave,
  onCancel
}: PurchaseRequestFormProps) {
  // Main items state
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [date, setDate] = useState("");
  const [isNew, setIsNew] = useState(true);

  // Load request details if editing
  useEffect(() => {
    if (requestToEdit) {
      setItems(requestToEdit.items.map(item => ({ ...item, bomCode: item.bomCode || "" })));
      setDate(requestToEdit.date);
      setIsNew(false);
    } else {
      // Create initial empty item for new request
      setDate(new Date().toISOString().split("T")[0]);
      setItems([createEmptyItem(1)]);
      setIsNew(true);
    }
  }, [requestToEdit]);

  // Unique lists for category filters
  const divisions = Array.from(new Set(categories.map((c) => c.division)));

  function createEmptyItem(index: number): PurchaseItem {
    // default to first division's first sector/item or '기타'
    const defaultDiv = "기계";
    const sectors = Array.from(new Set(categories.filter(c => c.division === defaultDiv).map(c => c.sector)));
    const defaultSec = sectors[0] || "기타";
    const defaultItems = categories.filter(c => c.division === defaultDiv && c.sector === defaultSec).map(c => c.item);
    const defaultItem = defaultItems[0] || "기타";

    return {
      id: `item-new-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
      bomCode: "",
      date: new Date().toISOString().split("T")[0],
      division: defaultDiv,
      sector: defaultSec,
      item: defaultItem,
      itemName: "",
      quantity: 1,
      unit: "EA",
      price: 0,
      remark: "",
      photo: "",
      buySite: "",
      stock: "",
      comment: "",
      incomingStatus: "미입고",
      status: "대기"
    };
  }

  const handleAddItemRow = () => {
    setItems([...items, createEmptyItem(items.length + 1)]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (items.length === 1) {
      alert("적어도 하나의 품목이 필요합니다.");
      return;
    }
    const updated = items.filter((_, i) => i !== idx);
    setItems(updated);
  };

  // Helper: Compress and resize image before storing
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Max width or height of 800px
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Quality 0.6 to significantly reduce size while maintaining visibility
          resolve(canvas.toDataURL("image/jpeg", 0.6));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Safe file loader helper
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImage(file);
      const updated = [...items];
      updated[idx].photo = compressedDataUrl;
      updated[idx].photoName = file.name;
      setItems(updated);
    } catch (err) {
      console.error("Image compression failed:", err);
      alert("이미지 처리 중 오류가 발생했습니다.");
    }
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit attachment size to 1MB to prevent storage quota issues
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_FILE_SIZE) {
      alert("⚠️ 첨부 파일 용량이 너무 큽니다. 1MB 이하의 파일만 업로드 가능합니다.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const updated = [...items];
      updated[idx].attachmentData = reader.result as string;
      updated[idx].attachmentName = file.name;
      setItems(updated);
    };
    reader.readAsDataURL(file);
  };

  const updateItemField = (idx: number, field: keyof PurchaseItem, value: any) => {
    const updated = [...items];

    if (field === "division") {
      // Cascading logic: reset sector and item
      const divSectors = Array.from(new Set(categories.filter(c => c.division === value).map(c => c.sector)));
      const nextSector = divSectors[0] || "기타";
      const sectorItems = categories.filter(c => c.division === value && c.sector === nextSector).map(c => c.item);
      const nextItem = sectorItems[0] || "기타";

      updated[idx].division = value;
      updated[idx].sector = nextSector;
      updated[idx].item = nextItem;
    } else if (field === "sector") {
      // Cascading logic: reset item
      const sectorItems = categories.filter(c => c.division === updated[idx].division && c.sector === value).map(c => c.item);
      const nextItem = sectorItems[0] || "기타";

      updated[idx].sector = value;
      updated[idx].item = nextItem;
    } else {
      (updated[idx] as any)[field] = value;
    }

    setItems(updated);
  };

  // Global Approvals (entire purchase request approve/reject)
  const handleGlobalApproval = (newStatus: "결재" | "거부") => {
    const updated = items.map(item => ({ ...item, status: newStatus }));
    setItems(updated);
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (items.some(item => !item.itemName.trim())) {
      alert("모든 행의 품목명을 기입하여 주십시오.");
      return;
    }

    onSave({
      id: requestToEdit?.id,
      date: date,
      requester: requestToEdit ? requestToEdit.requester : username,
      items: items,
      createdAt: requestToEdit ? requestToEdit.createdAt : new Date().toISOString()
    });
  };

  // Preview full photo in modal
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  // Check editable permission based on role
  // "신청자" can only request (create or edit their own before approval)
  // "결재자" can ONLY edit and approve/reject items (can edit all details during approval: "결재시에는 결재 담당자가 수량 등 모든 내용을 수정할 수 있도록 하며")
  // "admin" can do everything
  const canEditDetails = userRole === "admin" || userRole === "신청자" || userRole === "결재자";
  const canApprove = userRole === "admin" || userRole === "결재자";

  // Calculate sums
  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const approvalRate = items.length > 0
    ? Math.round((items.filter(item => item.status === "결재").length / items.length) * 100)
    : 0;

  // Build a temporary requests state to calculate the correct global indices for all items in the form
  const tempRequests = requestToEdit
    ? requests.map(r => r.id === requestToEdit.id ? { ...r, date, items } : r)
    : [...requests, { id: "temp-new", date, items, index: 999999 }];

  const sortedTemp = [...tempRequests].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return (a.index || 0) - (b.index || 0);
  });

  const globalIndicesMap = new Map<string, number>();
  let counter = 1;
  sortedTemp.forEach(req => {
    req.items.forEach(itm => {
      globalIndicesMap.set(itm.id, counter++);
    });
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-brand-panel p-5 border border-brand-dark flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-1.5 border border-brand-dark hover:bg-brand-dark hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[9px] bg-brand-dark text-white px-2 py-0.5 font-mono uppercase tracking-wider font-bold">
              {isNew ? "SYS_REQ_NEW" : `${date.split('-')[0]}/${parseInt(date.split('-')[1])} #${requestToEdit?.index}`}
            </span>
            <h2 className="text-base font-bold text-brand-dark mt-1 uppercase tracking-tight">
              {isNew ? "자재 구매 신청서 작성" : `${date.split('-')[0]}/${parseInt(date.split('-')[1])} #${requestToEdit?.index}`}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
          {!isNew && (
            <div className="flex items-center gap-1.5 bg-white border border-brand-dark text-brand-dark px-3 py-1.5 font-mono text-[10px] font-bold mr-2">
              <span>결재율: {approvalRate}%</span>
            </div>
          )}

          {canApprove && !isNew && (
            <div className="flex gap-2 mr-2">
              <button
                type="button"
                id="btn-global-approve"
                onClick={() => handleGlobalApproval("결재")}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-950 text-xs font-bold transition-colors"
              >
                전체 결재 승인
              </button>
              <button
                type="button"
                id="btn-global-reject"
                onClick={() => handleGlobalApproval("거부")}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white border border-rose-950 text-xs font-bold transition-colors"
              >
                전체 결재 거부
              </button>
            </div>
          )}

          {!isNew && (
            <button
              type="button"
              id="btn-single-request-excel-download"
              onClick={() => {
                const monthlyIdx = requestToEdit ? getRequestMonthlyIndex(requestToEdit, requests) : 1;
                const docNumFormatted = formatDocNumber(date, monthlyIdx).replace(/\s/g, "_").replace(/\//g, "-");
                const itemsWithIndex = items.map(itm => ({
                  ...itm,
                  index: globalIndicesMap.get(itm.id) || 1
                }));
                exportToExcel(itemsWithIndex, `${docNumFormatted}.xlsx`);
              }}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-900 text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              데이터 엑셀 다운로드
            </button>
          )}

          <button
            onClick={onCancel}
            className="px-4 py-1.5 border border-brand-dark text-brand-dark bg-white hover:bg-brand-dark/10 text-xs font-bold transition-colors"
          >
            취소
          </button>
          {canEditDetails && (
            <button
              onClick={handleSubmit}
              id="btn-save-request"
              className="px-5 py-1.5 bg-brand-dark hover:bg-white hover:text-brand-dark text-white border border-brand-dark text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              신청서 저장
            </button>
          )}
        </div>
      </div>

      {/* Main Excel-like Sheet Form */}
      <form onSubmit={handleSubmit} className="bg-brand-panel border border-brand-dark overflow-hidden">
        {/* Document Metadata block */}
        <div className="p-4 bg-[#E4E3E0] border-b border-brand-dark grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-dark/60 uppercase">DATE:</span>
            <input
              type="text"
              disabled={!canEditDetails}
              value={date.split('-').map(p => parseInt(p)).join('/')}
              onChange={(e) => {
                const parts = e.target.value.split('/');
                if (parts.length === 3) {
                   const iso = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                   setDate(iso);
                } else {
                   setDate(e.target.value);
                }
              }}
              className="px-2 py-1 bg-white border border-brand-dark font-medium text-brand-dark text-xs focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-dark/60 uppercase">REQUESTER:</span>
            <span className="font-bold text-brand-dark bg-white px-2 py-0.5 border border-brand-dark/20">
              {isNew ? username : requestToEdit?.requester}
            </span>
          </div>
          <div className="flex items-center gap-2 md:justify-end">
            <span className="font-bold text-brand-dark/60 uppercase">TOTAL_SUM:</span>
            <span className="font-black text-brand-dark text-sm">
              ₩{totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Excel-like Table container */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px] text-brand-dark">
            <thead>
              <tr className="bg-[#F2F1EE] border-b border-brand-dark text-brand-dark/70 text-[10px] font-bold select-none text-left font-mono">
                <th className="border-r border-brand-dark/30 p-2 text-center w-10">index</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-24 whitespace-pre-line">
                  bom code
                </th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-20">일자</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-16">구분</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-16">종목</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-16">품목</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-32">품목명</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-16">요청수량</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-12">단위</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-20">단가</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-20">비고</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-20">금액</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-16">사진</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-24">구매사이트</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-16">재고</th>
                <th className="border-r border-brand-dark/30 p-2 text-center w-32">기타(견적서)</th>
                {!isNew && <th className="border-r border-brand-dark/30 p-2 text-center w-16">입고</th>}
                <th className="border-r border-brand-dark/30 p-2 text-center w-16">결재</th>
                {canEditDetails && <th className="p-2 text-center w-12">삭제</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-dark/10 bg-white/30">
              {items.map((item, idx) => {
                // Get filtered sector options based on current item's division
                const sectorOptions = Array.from(new Set(categories.filter(c => c.division === item.division).map(c => c.sector)));
                // Get filtered item options based on current item's division & sector
                const itemOptions = categories.filter(c => c.division === item.division && c.sector === item.sector).map(c => c.item);

                const itemSum = item.quantity * item.price;

                return (
                  <tr key={item.id} className="hover:bg-brand-dark/5 transition-colors">
                    {/* Index */}
                    <td className="border-r border-brand-dark/20 p-2 text-center bg-[#F2F1EE]/60 font-mono font-bold text-brand-dark/50">
                      {globalIndicesMap.get(item.id) || idx + 1}
                    </td>

                    {/* BOM Code */}
                    <td className="border-r border-brand-dark/20 p-1">
                      <input
                        type="text"
                        disabled={!canEditDetails}
                        value={item.bomCode || ""}
                        onChange={(e) => updateItemField(idx, "bomCode", e.target.value)}
                        placeholder=""
                        className="w-full px-1.5 py-1 border border-transparent hover:border-brand-dark/30 focus:border-brand-dark rounded-none bg-transparent focus:bg-white text-center focus:outline-none font-mono"
                      />
                    </td>

                    {/* 일자 */}
                    <td className="border-r border-brand-dark/20 p-1">
                      <input
                        type="text"
                        disabled={!canEditDetails}
                        value={item.date.split('-').map(p => parseInt(p)).join('/')}
                        onChange={(e) => {
                          const parts = e.target.value.split('/');
                          if (parts.length === 3) {
                             const iso = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                             updateItemField(idx, "date", iso);
                          } else {
                             updateItemField(idx, "date", e.target.value);
                          }
                        }}
                        className="w-full px-1 py-1 border border-transparent hover:border-brand-dark/30 focus:border-brand-dark rounded-none bg-transparent focus:bg-white text-center focus:outline-none font-mono"
                      />
                    </td>

                    {/* 구분 */}
                    <td className="border-r border-brand-dark/20 p-1">
                      <select
                        disabled={!canEditDetails}
                        value={item.division}
                        onChange={(e) => updateItemField(idx, "division", e.target.value)}
                        className="w-full px-1 py-1 border border-transparent hover:border-brand-dark/30 focus:border-brand-dark rounded-none bg-transparent focus:bg-white focus:outline-none"
                      >
                        {divisions.map(div => (
                          <option key={div} value={div}>{div}</option>
                        ))}
                      </select>
                    </td>

                    {/* 종목 */}
                    <td className="border-r border-brand-dark/20 p-1">
                      <select
                        disabled={!canEditDetails}
                        value={item.sector}
                        onChange={(e) => updateItemField(idx, "sector", e.target.value)}
                        className="w-full px-1 py-1 border border-transparent hover:border-brand-dark/30 focus:border-brand-dark rounded-none bg-transparent focus:bg-white focus:outline-none"
                      >
                        {sectorOptions.length === 0 ? (
                          <option value="기타">기타</option>
                        ) : (
                          sectorOptions.map(sec => (
                            <option key={sec} value={sec}>{sec}</option>
                          ))
                        )}
                      </select>
                    </td>

                    {/* 품목 */}
                    <td className="border-r border-brand-dark/20 p-1">
                      <select
                        disabled={!canEditDetails}
                        value={item.item}
                        onChange={(e) => updateItemField(idx, "item", e.target.value)}
                        className="w-full px-1 py-1 border border-transparent hover:border-brand-dark/30 focus:border-brand-dark rounded-none bg-transparent focus:bg-white focus:outline-none"
                      >
                        {itemOptions.length === 0 ? (
                          <option value="기타">기타</option>
                        ) : (
                          itemOptions.map(itm => (
                            <option key={itm} value={itm}>{itm}</option>
                          ))
                        )}
                      </select>
                    </td>

                    {/* 품목명 */}
                    <td className="border-r border-brand-dark/20 p-1">
                      <input
                        type="text"
                        disabled={!canEditDetails}
                        value={item.itemName}
                        onChange={(e) => updateItemField(idx, "itemName", e.target.value)}
                        placeholder="품목명 작성 (필수)"
                        className="w-full px-1.5 py-1 border border-transparent hover:border-brand-dark/30 focus:border-brand-dark rounded-none bg-transparent focus:bg-white font-bold text-brand-dark focus:outline-none"
                      />
                    </td>

                    {/* 요청수량 */}
                    <td className="border-r border-brand-dark/20 p-1 text-center">
                      <input
                        type="number"
                        min="1"
                        disabled={!canEditDetails}
                        value={item.quantity}
                        onChange={(e) => updateItemField(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-1 py-1 border border-transparent hover:border-brand-dark/30 focus:border-brand-dark rounded-none bg-transparent focus:bg-white text-center focus:outline-none font-bold font-mono"
                      />
                    </td>

                    {/* 단위 */}
                    <td className="border-r border-brand-dark/20 p-1 text-center">
                      <input
                        type="text"
                        disabled={!canEditDetails}
                        value={item.unit}
                        onChange={(e) => updateItemField(idx, "unit", e.target.value)}
                        placeholder="EA"
                        className="w-full px-1 py-1 border border-transparent hover:border-brand-dark/30 focus:border-brand-dark rounded-none bg-transparent focus:bg-white text-center focus:outline-none"
                      />
                    </td>

                    {/* 단가 */}
                    <td className="border-r border-brand-dark/20 p-1 text-right">
                      <div className="flex items-center gap-1">
                        <span className="text-brand-dark/40 font-mono">₩</span>
                        <input
                          type="number"
                          min="0"
                          disabled={!canEditDetails}
                          value={item.price}
                          onChange={(e) => updateItemField(idx, "price", Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-1 py-1 border border-transparent hover:border-brand-dark/30 focus:border-brand-dark rounded-none bg-transparent focus:bg-white text-right focus:outline-none font-semibold text-brand-dark font-mono"
                        />
                      </div>
                      <span className="text-[9px] text-brand-dark/40 block pr-2 font-mono">
                        {item.price.toLocaleString()}원
                      </span>
                    </td>

                    {/* 비고 */}
                    <td className="border-r border-brand-dark/20 p-1">
                      <input
                        type="text"
                        disabled={!canEditDetails}
                        value={item.remark}
                        onChange={(e) => updateItemField(idx, "remark", e.target.value)}
                        placeholder="비고 기재"
                        className="w-full px-1.5 py-1 border border-transparent hover:border-brand-dark/30 focus:border-brand-dark rounded-none bg-transparent focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* 금액 (Calculated, read-only formatted) */}
                    <td className="border-r border-brand-dark/20 p-2 text-right font-black text-brand-dark bg-[#F2F1EE]/30 font-mono">
                      ₩{itemSum.toLocaleString()}
                    </td>

                    {/* 사진 (Direct file upload) */}
                    <td className="border-r border-brand-dark/20 p-1 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.photo ? (
                          <div className="relative group/thumb flex items-center gap-1 border border-brand-dark bg-white px-1.5 py-0.5 rounded-none">
                            <button
                              type="button"
                              onClick={() => setActivePhoto(item.photo)}
                              className="text-brand-dark hover:underline flex items-center gap-0.5 font-mono text-[9px]"
                              title="미리보기"
                            >
                              <Eye className="w-2.5 h-2.5" />
                              <span className="max-w-[50px] truncate block">
                                {item.photoName || "VIEW"}
                              </span>
                            </button>
                            {canEditDetails && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...items];
                                  updated[idx].photo = "";
                                  updated[idx].photoName = "";
                                  setItems(updated);
                                }}
                                className="text-red-600 hover:text-red-800 font-bold ml-1 text-xs"
                                title="삭제"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ) : canEditDetails ? (
                          <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 border border-brand-dark bg-white text-brand-dark text-[9px] hover:bg-brand-dark hover:text-white transition-colors">
                            <FileUp className="w-2.5 h-2.5" />
                            <span>IMAGE</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(e, idx)}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <span className="text-brand-dark/30">-</span>
                        )}
                      </div>
                    </td>

                    {/* 구매사이트 */}
                    <td className="border-r border-brand-dark/20 p-1">
                      <div className="flex flex-col gap-0.5">
                        <input
                          type="text"
                          disabled={!canEditDetails}
                          value={item.buySite}
                          onChange={(e) => updateItemField(idx, "buySite", e.target.value)}
                          placeholder="링크/사이트명"
                          className="w-full px-1.5 py-1 border border-transparent hover:border-brand-dark/30 focus:border-brand-dark rounded-none bg-transparent focus:bg-white focus:outline-none text-[10px]"
                        />
                        {item.buySite && item.buySite.startsWith('http') && (
                          <a 
                            href={item.buySite} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[9px] text-blue-600 hover:underline px-1.5 font-bold flex items-center gap-1"
                          >
                            <Download className="w-2 h-2 rotate-180" />
                            방문하기
                          </a>
                        )}
                      </div>
                    </td>

                    {/* 재고 */}
                    <td className="border-r border-brand-dark/20 p-1 text-center">
                      <input
                        type="text"
                        disabled={!canEditDetails}
                        value={item.stock}
                        onChange={(e) => updateItemField(idx, "stock", e.target.value)}
                        placeholder="수량"
                        className="w-full px-1 py-1 border border-transparent hover:border-brand-dark/30 focus:border-brand-dark rounded-none bg-transparent focus:bg-white text-center focus:outline-none font-mono"
                      />
                    </td>

                    {/* 기타(견적서) */}
                    <td className="border-r border-brand-dark/20 p-1">
                      <div className="flex flex-col gap-1">
                        {/* Comments input */}
                        <input
                          type="text"
                          disabled={!canEditDetails}
                          value={item.comment}
                          onChange={(e) => updateItemField(idx, "comment", e.target.value)}
                          placeholder="코멘트 작성"
                          className="w-full px-1.5 py-0.5 border border-transparent hover:border-brand-dark/20 focus:border-brand-dark rounded-none bg-transparent focus:bg-white text-[10px] focus:outline-none"
                        />
                        {/* File selector */}
                        <div className="flex items-center gap-1.5 justify-between px-1">
                          {item.attachmentName ? (
                            <div className="flex items-center gap-1 bg-white border border-brand-dark text-brand-dark px-1 py-0.5 text-[9px] max-w-[120px] truncate">
                              <span className="truncate">{item.attachmentName}</span>
                              {canEditDetails && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...items];
                                    updated[idx].attachmentName = "";
                                    updated[idx].attachmentData = "";
                                    setItems(updated);
                                  }}
                                  className="text-red-600 font-bold hover:text-red-800 ml-1 text-xs"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ) : canEditDetails ? (
                            <label className="cursor-pointer inline-flex items-center gap-1 text-[9px] text-brand-dark/70 hover:text-brand-dark font-bold font-mono">
                              <FileSpreadsheet className="w-2.5 h-2.5" />
                              <span>[ATTACH]</span>
                              <input
                                type="file"
                                onChange={(e) => handleAttachmentUpload(e, idx)}
                                className="hidden"
                              />
                            </label>
                          ) : (
                            <span className="text-brand-dark/30 text-[9px]">-</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 입고여부 */}
                    {!isNew && (
                      <td className="border-r border-brand-dark/20 p-1 text-center">
                        <select
                          disabled={!canEditDetails}
                          value={item.incomingStatus}
                          onChange={(e) => updateItemField(idx, "incomingStatus", e.target.value)}
                          className={`px-1 py-1 border border-brand-dark text-center font-bold text-[10px] focus:outline-none rounded-none bg-white ${
                            item.incomingStatus === "입고완료"
                              ? "bg-emerald-700 text-white border-emerald-950 font-bold"
                              : "bg-[#F2F1EE] text-brand-dark/80"
                          }`}
                        >
                          <option value="미입고">미입고</option>
                          <option value="입고완료">입고완료</option>
                        </select>
                      </td>
                    )}


                    {/* 결재상태 */}
                    <td className="border-r border-brand-dark/20 p-1 text-center bg-[#F2F1EE]/20">
                      {canApprove ? (
                        <div className="flex items-center justify-center gap-0.5">
                          {(["대기", "결재", "거부"] as const).map((st) => {
                            const isSel = item.status === st;
                            const colors = {
                              대기: isSel ? "bg-brand-dark text-white border-brand-dark" : "bg-white text-brand-dark/50 border-brand-dark/20 hover:bg-brand-dark/10",
                              결재: isSel ? "bg-emerald-700 text-white border-emerald-800" : "bg-white text-emerald-800 border-brand-dark/20 hover:bg-emerald-50",
                              거부: isSel ? "bg-rose-700 text-white border-rose-800" : "bg-white text-rose-800 border-brand-dark/20 hover:bg-rose-50"
                            };

                            return (
                              <button
                                key={st}
                                type="button"
                                id={`btn-item-status-${idx}-${st}`}
                                onClick={() => updateItemField(idx, "status", st)}
                                className={`px-1 py-0.5 rounded-none text-[8px] font-bold border transition-colors ${colors[st]}`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={`text-[10px] font-bold ${item.status === '결재' ? 'text-emerald-700' : item.status === '거부' ? 'text-rose-700' : 'text-brand-dark/50'}`}>
                          {item.status}
                        </div>
                      )}
                    </td>

                    {/* Delete button */}
                    {canEditDetails && (
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1 text-rose-700 hover:bg-rose-900 hover:text-white border border-transparent hover:border-rose-950 transition-colors"
                          title="품목 행 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom add/control panel */}
        {canEditDetails && (
          <div className="p-4 bg-[#F2F1EE] border-t border-brand-dark flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <button
              type="button"
              onClick={handleAddItemRow}
              id="btn-add-item-row"
              className="px-4 py-2 bg-brand-dark text-white border border-brand-dark hover:bg-white hover:text-brand-dark text-xs font-bold transition-colors"
            >
              + 신규 품목 행 추가
            </button>
          </div>
        )}
      </form>

      {/* Photo Viewer Modal */}
      {activePhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-brand-panel border-2 border-brand-dark max-w-xl w-full p-6 relative">
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-4 right-4 p-1.5 border border-brand-dark hover:bg-brand-dark hover:text-white text-xs font-bold font-mono transition-colors"
            >
              CLOSE
            </button>
            <h3 className="text-xs font-bold text-brand-dark uppercase font-mono mb-4">
              IMAGE_ATTACHMENT_PREVIEW
            </h3>
            <div className="bg-[#E4E3E0] overflow-hidden flex items-center justify-center p-2 border border-brand-dark">
              <img src={activePhoto} alt="BOM Attachment" referrerPolicy="no-referrer" className="max-h-[450px] object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
