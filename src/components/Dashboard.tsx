/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { PurchaseRequest, UserRole } from "../types";
import { exportToExcel, importFromExcel } from "../utils/excel";
import { getRequestMonthlyIndex, formatDocNumber, getGlobalItemIndex } from "../utils/numbering";
import {
  Search,
  Calendar,
  FileDown,
  UploadCloud,
  FileText,
  Plus,
  Key,
  Sliders,
  LogOut,
  ChevronRight,
  Filter,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Download,
  Upload
} from "lucide-react";

interface DashboardProps {
  requests: PurchaseRequest[];
  userRole: UserRole;
  username: string;
  onSelectRequest: (req: PurchaseRequest) => void;
  onCreateNewRequest: () => void;
  onImportRequests: (importedItems: any[]) => void;
  onNavigateToPasswords: () => void;
  onNavigateToCategories: () => void;
  onLogout: () => void;
  onDeleteRequests: (ids: string[]) => void;
  onDeleteItem: (requestId: string, itemIndex: number) => void;
}

export default function Dashboard({
  requests,
  userRole,
  username,
  onSelectRequest,
  onCreateNewRequest,
  onImportRequests,
  onNavigateToPasswords,
  onNavigateToCategories,
  onLogout,
  onDeleteRequests,
  onDeleteItem
}: DashboardProps) {
  // Period filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Excel Upload state
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  // Role details mapping
  const roleLabels: Record<UserRole, string> = {
    admin: "관리자 (admin)",
    결재자: "결재자",
    신청자: "신청자"
  };

  // Expanded request state
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Selected request IDs for deletion
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedFilteredRequests.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      alert("삭제할 신청 내역을 선택해 주세요.");
      return;
    }
    if (confirm(`선택한 ${selectedIds.length}개의 구매 신청 내역을 정말로 삭제하시겠습니까?`)) {
      onDeleteRequests(selectedIds);
      setSelectedIds([]);
    }
  };

  // Filter requests based on period and search query
  const filteredRequests = requests.filter((req) => {
    // Period check
    if (startDate && req.date < startDate) return false;
    if (endDate && req.date > endDate) return false;

    return true;
  });

  // Sort filtered requests so that the most recent document numbers are at the top (Date desc, index desc)
  const sortedFilteredRequests = [...filteredRequests].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return (b.index || 0) - (a.index || 0);
  });

  // Calculate approval rate for a single request
  // Calculate request overall status
  const getRequestStatus = (req: PurchaseRequest) => {
    const statuses = req.items.map(item => item.status);
    if (statuses.every(s => s === "결재")) return "완료";
    if (statuses.some(s => s === "거부")) return "거부 포함";
    if (statuses.some(s => s === "결재")) return "일부결재";
    return "대기";
  };

  const calculateApprovalRate = (req: PurchaseRequest): number => {
    if (!req.items || req.items.length === 0) return 0;
    const approvedCount = req.items.filter((item) => item.status === "결재").length;
    return Math.round((approvedCount / req.items.length) * 100);
  };

  // Handle Export for Selected Period
  const handleExportByPeriod = () => {
    if (filteredRequests.length === 0) {
      alert("해당 기간 또는 검색 조건에 맞는 구매 신청 데이터가 없습니다.");
      return;
    }

    // Sort all requests from oldest to newest to compute the exact global index
    const sortedAllRequests = [...requests].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.index || 0) - (b.index || 0);
    });

    const globalIndices = new Map<string, number>();
    let counter = 1;
    sortedAllRequests.forEach(req => {
      req.items.forEach(itm => {
        globalIndices.set(itm.id, counter++);
      });
    });

    // Flatten all items from filtered requests to export together and assign their global index
    const allItems = filteredRequests.flatMap((req) => 
      req.items.map(item => ({
        ...item,
        index: globalIndices.get(item.id) || 1
      }))
    );
    const dateRangeStr = startDate && endDate ? `_${startDate}_to_${endDate}` : "_전체기간";
    exportToExcel(allItems, `자재구매신청내역_집계${dateRangeStr}.xlsx`);
  };

  // Handle Excel Upload (Admin only)
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadError("");
      setUploadSuccess("");
      const imported = await importFromExcel(file);

      if (imported.length === 0) {
        throw new Error("가져올 유효한 자재구매 행이 없습니다.");
      }

      await onImportRequests(imported);
      setUploadSuccess(`엑셀 파일에서 ${imported.length}개의 자재 항목을 성공적으로 업로드하여 새 신청서로 보존하였습니다!`);
      e.target.value = ""; // reset file input
    } catch (err: any) {
      console.error("Upload error:", err);
      setUploadError(err.message || "엑셀 업로드 중 에러가 발생했습니다.");
    }
  };

  return (
    <div className="w-full space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner / User Bar */}
      <div className="bg-brand-panel p-5 border border-brand-dark flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-brand-dark uppercase tracking-tight leading-none">
            자재구매 신청/결재/관리 시스템 V1.0
          </h2>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono tracking-wider text-brand-dark/60 uppercase">
            <span>접속 계정:</span>
            <span className="font-bold text-white bg-brand-dark px-2 py-0.5">
              {roleLabels[userRole]}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action links depending on roles */}
          {userRole === "admin" && (
            <>
              <button
                onClick={onNavigateToCategories}
                id="btn-nav-categories"
                className="px-3 py-1.5 border border-brand-dark text-brand-dark bg-white hover:bg-brand-dark hover:text-white text-xs font-bold transition-colors"
              >
                카테고리 수정
              </button>
              <button
                onClick={onNavigateToPasswords}
                id="btn-nav-passwords"
                className="px-3 py-1.5 border border-brand-dark text-rose-700 bg-white hover:bg-rose-900 hover:text-white text-xs font-bold transition-colors"
              >
                비밀번호 변경
              </button>
            </>
          )}

          {/* New Request - Requester and Admin can request */}
          {(userRole === "admin" || userRole === "신청자") && (
            <button
              onClick={onCreateNewRequest}
              id="btn-create-request"
              className="px-4 py-1.5 bg-brand-dark hover:bg-white hover:text-brand-dark text-white border border-brand-dark text-xs font-bold transition-colors"
            >
              + 신규 구매신청 작성
            </button>
          )}
        </div>
      </div>

      {/* Filter and Period Settings Bar */}
      <div className="bg-brand-panel p-5 border border-brand-dark space-y-4">
        <h3 className="text-xs font-bold text-brand-dark uppercase tracking-wide flex items-center gap-1.5 font-serif">
          구매신청서 다운로드
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs">
          <div>
            <label className="block text-[10px] text-brand-dark/60 font-bold uppercase mb-1 font-mono">시작 일자 (START_DATE)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-brand-dark text-xs text-brand-dark focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[10px] text-brand-dark/60 font-bold uppercase mb-1 font-mono">종료 일자 (END_DATE)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-brand-dark text-xs text-brand-dark focus:outline-none"
            />
          </div>

          {/* Excel Export Button */}
          <div>
            <button
              onClick={handleExportByPeriod}
              id="btn-export-period-excel"
              className="w-full py-1.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-950 text-xs font-bold transition-colors"
            >
              설정 기간 데이터 엑셀 다운로드
            </button>
          </div>
        </div>

        {/* Excel Import Block */}
        {userRole !== "결재자" && (
          <div className="border-t border-brand-dark/10 pt-4 mt-2">
              <div className="bg-[#FFFFFF]/40 p-4 border border-brand-dark/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-brand-dark uppercase tracking-tight flex items-center gap-1.5 font-serif">
                    엑셀로 업로드 하기
                  </h4>
                  <p className="text-[10px] text-black leading-relaxed font-mono">
                    엑셀 파일을 업로드하여 신청하기
                  </p>
                </div>

                <div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-brand-dark hover:bg-white hover:text-brand-dark text-white border border-brand-dark text-xs font-bold transition-colors">
                    엑셀 업로드 하기
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {uploadError && (
                <p className="text-xs font-bold text-red-700 mt-2 pl-1 font-mono">⚠ {uploadError}</p>
              )}
              {uploadSuccess && (
                <p className="text-xs font-bold text-emerald-700 mt-2 pl-1 font-mono">✔ {uploadSuccess}</p>
              )}
            </div>
        )}
      </div>

      {/* Boards / Purchase Requests List */}
      <div className="bg-transparent border-t-2 border-brand-dark pt-6 mt-4">
        <div className="pb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-black text-brand-dark uppercase tracking-tight font-serif">구매신청 내역 게시판</h3>
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white text-[10px] font-bold transition-colors flex items-center gap-1 border border-red-950"
              >
                <Trash2 size={10} />
                선택 삭제 ({selectedIds.length})
              </button>
            )}
          </div>
          <span className="text-[10px] font-mono text-brand-dark/60">TOTAL_RECORDS: {filteredRequests.length}</span>
        </div>

        <div className="hidden lg:block w-full overflow-x-auto border border-brand-dark shadow-md bg-white rounded-none relative">
          <table className="w-full text-[11px] border-collapse table-fixed">
            <thead>
              <tr className="bg-brand-dark text-white font-serif uppercase tracking-wider text-[10px] border-b border-brand-dark shadow-sm">
                <th className="py-3 px-2 text-center border-r border-white/10 w-[2.5%] bg-brand-dark">
                  <input
                    type="checkbox"
                    checked={sortedFilteredRequests.length > 0 && selectedIds.length === sortedFilteredRequests.length}
                    onChange={handleSelectAll}
                    className="cursor-pointer accent-brand-dark rounded bg-white border border-brand-dark/30 w-3.5 h-3.5"
                  />
                </th>
                <th className="py-3 px-3 text-left border-r border-white/10 whitespace-nowrap w-[8.5%] bg-brand-dark">문서번호</th>
                <th className="py-3 px-2 text-left border-r border-white/10 w-[7.5%] bg-brand-dark font-sans uppercase tracking-wider">bom code</th>
                <th className="py-3 px-2 text-left border-r border-white/10 whitespace-nowrap w-[7.5%] bg-brand-dark">일자</th>
                <th className="py-3 px-1 text-left border-r border-white/10 w-[4%] bg-brand-dark">구분</th>
                <th className="py-3 px-1 text-left border-r border-white/10 w-[4%] bg-brand-dark">종목</th>
                <th className="py-3 px-2 text-left border-r border-white/10 w-[4%] bg-brand-dark">품목</th>
                <th className="py-3 px-3 text-left border-r border-white/10 w-[13%] bg-brand-dark">품목명</th>
                <th className="py-3 px-1 text-right border-r border-white/10 w-[3%] bg-brand-dark">수량</th>
                <th className="py-3 px-1 text-center border-r border-white/10 w-[3%] bg-brand-dark">단위</th>
                <th className="py-3 px-2 text-right border-r border-white/10 whitespace-nowrap w-[5.5%] bg-brand-dark">단가</th>
                <th className="py-3 px-3 text-left border-r border-white/10 w-[7%] bg-brand-dark">비고</th>
                <th className="py-3 px-2 text-right border-r border-white/10 whitespace-nowrap w-[6.5%] bg-brand-dark">금액</th>
                <th className="py-3 px-1 text-center border-r border-white/10 w-[3%] bg-brand-dark">사진</th>
                <th className="py-3 px-3 text-left border-r border-white/10 w-[13%] bg-brand-dark">구매사이트</th>
                <th className="py-3 px-1 text-center border-r border-white/10 w-[3.5%] bg-brand-dark">재고</th>
                <th className="py-3 px-3 text-left border-r border-white/10 w-[7.5%] bg-brand-dark">기타(견적서)</th>
                <th className="py-3 px-2 text-center border-r border-white/10 w-[3.5%] bg-brand-dark">입고</th>
                <th className="py-3 px-2 text-center border-r border-white/10 w-[4.5%] bg-brand-dark">결재</th>
                <th className="py-3 px-1 text-center w-[3%] bg-brand-dark">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-dark/10 bg-white">
              {sortedFilteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-12 text-center text-brand-dark/40 font-mono uppercase tracking-widest bg-white">
                    작성된 구매 신청 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedFilteredRequests.map((req) => {
                  const rate = calculateApprovalRate(req);
                  const firstItem = req.items[0];
                  const monthlySeq = getRequestMonthlyIndex(req, requests);
                  const docNumber = formatDocNumber(req.date, monthlySeq);
                  const isExpanded = expandedRequestId === req.id;
                  const reqStatus = getRequestStatus(req);

                  // Calculate incoming status rate
                  const incomingCount = req.items.filter((item) => item.incomingStatus === "입고완료").length;
                  const incomingRate = req.items.length > 0 ? Math.round((incomingCount / req.items.length) * 100) : 0;
 
                  // Aggregates for summary row
                  const totalQty = req.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                  const totalAmount = req.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  const hasPhotos = req.items.some(item => !!item.photo);
                  const summaryItemName = req.items.length > 1 
                    ? `${req.items[0]?.itemName || "N/A"} 외 ${req.items.length - 1}건`
                    : req.items[0]?.itemName || "신청 품목 없음";
 
                  return (
                    <React.Fragment key={req.id}>
                      {/* Summary Row */}
                      <tr
                        onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                        className={`transition-colors cursor-pointer group ${isExpanded ? 'bg-amber-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]' : 'bg-white hover:bg-emerald-50/50'}`}
                      >
                        <td className="py-3 px-2 text-center border-r border-brand-dark/5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(req.id)}
                            onChange={(e) => handleSelectOne(e, req.id)}
                            className="cursor-pointer accent-brand-dark rounded bg-white border border-brand-dark/30 w-3.5 h-3.5"
                          />
                        </td>
                        <td className="py-3 px-2 font-mono font-bold text-brand-dark border-r border-brand-dark/5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-brand-dark/40">{isExpanded ? '▼' : '▶'}</span>
                            {docNumber}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-gray-400 font-mono border-r border-brand-dark/5">-</td>
                        <td className="py-3 px-2 border-r border-brand-dark/5">{req.date}</td>
                        <td className="py-3 px-2 text-gray-400 border-r border-brand-dark/5">-</td>
                        <td className="py-3 px-2 text-gray-400 border-r border-brand-dark/5">-</td>
                        <td className="py-3 px-2 text-gray-400 border-r border-brand-dark/5">-</td>
                        <td className="py-3 px-2 font-bold border-r border-brand-dark/5" title={summaryItemName}>
                          <div className="truncate">{summaryItemName}</div>
                        </td>
                        <td className="py-3 px-2 text-center text-gray-400 font-mono border-r border-brand-dark/5">-</td>
                        <td className="py-3 px-2 text-center text-gray-400 border-r border-brand-dark/5">-</td>
                        <td className="py-3 px-2 text-right text-gray-400 border-r border-brand-dark/5">-</td>
                        <td className="py-3 px-2 text-center text-gray-400 border-r border-brand-dark/5">-</td>
                        <td className="py-3 px-2 text-right font-bold text-brand-dark border-r border-brand-dark/5">{totalAmount.toLocaleString()}</td>
                        <td className="py-3 px-2 text-center text-xs font-bold border-r border-brand-dark/5">
                          {hasPhotos ? <span className="text-emerald-700">有</span> : <span className="text-gray-400">無</span>}
                        </td>
                        <td className="py-3 px-2 text-gray-400 border-r border-brand-dark/5">-</td>
                        <td className="py-3 px-2 text-center text-gray-400 border-r border-brand-dark/5">-</td>
                        <td className="py-3 px-2 text-gray-400 border-r border-brand-dark/5">-</td>
                        <td className="py-3 px-2 text-center border-r border-brand-dark/5">
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold ${incomingRate === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                            {incomingRate === 100 ? '완료' : `${incomingRate}%`}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center border-r border-brand-dark/5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <span className={`px-2 py-0.5 text-[10px] font-bold ${
                              reqStatus === '완료' ? 'bg-blue-100 text-blue-700' : 
                              reqStatus === '거부 포함' ? 'bg-red-100 text-red-700' : 
                              reqStatus === '일부결재' ? 'bg-emerald-50 text-emerald-600' : 
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {reqStatus}
                            </span>
                            <button 
                              onClick={() => onSelectRequest(req)}
                              className="p-1 hover:bg-brand-dark/10 rounded-none text-brand-dark/60 hover:text-brand-dark transition-colors"
                              title="전체 내용 보기/수정"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => onDeleteRequests([req.id])}
                            className="p-1 hover:bg-red-50 rounded-none text-red-400 hover:text-red-600 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
 
                      {/* Detail Rows */}
                      {isExpanded && req.items.map((item, itemIdx) => {
                        const globalIdx = getGlobalItemIndex(item.id, requests);
                        return (
                          <tr key={`${req.id}-item-${itemIdx}`} className="bg-sky-50/50 border-b border-brand-dark/10 text-[10.5px] hover:bg-sky-100/50 transition-colors">
                            <td className="py-2 px-2 border-r border-brand-dark/10 bg-amber-50/10 text-center"></td>
                            <td className="py-2 px-2 border-r border-brand-dark/10 bg-amber-50/30 text-center font-bold text-brand-dark/70 font-mono">{globalIdx}</td>
                          <td className="py-2 px-2 border-r border-brand-dark/10 font-mono text-[10px] text-brand-dark/70">{item.bomCode}</td>
                          <td className="py-2 px-2 border-r border-brand-dark/10">{item.date}</td>
                          <td className="py-2 px-2 border-r border-brand-dark/10">{item.division}</td>
                          <td className="py-2 px-2 border-r border-brand-dark/10">{item.sector}</td>
                          <td className="py-2 px-2 border-r border-brand-dark/10">{item.item}</td>
                          <td className="py-2 px-2 border-r border-brand-dark/10 font-medium text-brand-dark" title={item.itemName}>
                            <div className="truncate">{item.itemName}</div>
                          </td>
                          <td className="py-2 px-2 border-r border-brand-dark/10 text-right font-mono font-bold text-emerald-800">{item.quantity}</td>
                          <td className="py-2 px-2 border-r border-brand-dark/10 text-center">{item.unit}</td>
                          <td className="py-2 px-2 border-r border-brand-dark/10 text-right font-mono">{item.price.toLocaleString()}</td>
                          <td className="py-2 px-2 border-r border-brand-dark/10 text-gray-600" title={item.remark}>
                            <div className="truncate">{item.remark}</div>
                          </td>
                          <td className="py-2 px-2 border-r border-brand-dark/10 text-right font-mono font-bold text-brand-dark">{(item.price * item.quantity).toLocaleString()}</td>
                          <td className="py-2 px-2 border-r border-brand-dark/10 text-center text-xs font-bold">
                            {item.photo ? <span className="text-emerald-700">有</span> : <span className="text-gray-400">無</span>}
                          </td>
                          <td className="py-2 px-2 border-r border-brand-dark/10">
                            <div className="truncate" title={item.buySite}>
                            {item.buySite && item.buySite.startsWith('http') ? (
                              <a 
                                href={item.buySite} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-700 hover:underline font-bold cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item.buySite}
                              </a>
                            ) : (
                              <span className="text-gray-600">{item.buySite}</span>
                            )}
                            </div>
                          </td>
                          <td className="py-2 px-2 border-r border-brand-dark/10 text-center font-mono text-emerald-700">{item.stock}</td>
                          <td className="py-2 px-2 border-r border-brand-dark/10">
                            <div className="truncate" title={item.comment || item.attachmentName}>
                            {item.attachmentName ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-bold text-brand-dark/80 bg-white/50 px-1 rounded border border-brand-dark/10 inline-block w-fit">📎 {item.attachmentName}</span>
                                {item.comment && <span className="text-gray-500 italic text-[9px]">{item.comment}</span>}
                              </div>
                            ) : <span className="text-gray-500">{item.comment}</span>}
                            </div>
                          </td>
                          <td className="py-2 px-2 border-r border-brand-dark/10 text-center">
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${item.incomingStatus === '입고완료' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-white text-gray-400 border border-gray-200'}`}>
                              {item.incomingStatus === '입고완료' ? '완료' : '미'}
                            </span>
                          </td>
                          <td className="py-2 px-2 border-r border-brand-dark/10 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm ${
                              item.status === '결재' ? 'bg-emerald-600 text-white' : 
                              item.status === '거부' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => onDeleteItem(req.id, itemIdx)}
                              className="text-rose-400 hover:text-rose-600 transition-colors p-1"
                              title="품목 삭제"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                          </tr>
                        );
                      })}
                      {isExpanded && (
                        <tr className="bg-amber-50/50 border-b border-brand-dark/20">
                          <td colSpan={15} className="border-r border-brand-dark/5"></td>
                          <td colSpan={4} className="py-2 px-2 text-center">
                            <button
                              onClick={() => onSelectRequest(req)}
                              className="w-full py-1.5 bg-brand-dark text-white text-[10px] font-bold hover:bg-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 whitespace-nowrap"
                            >
                              <ExternalLink size={10} />
                              전체 내용 상세 보기/수정
                            </button>
                          </td>
                          <td className="py-2 px-2"></td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Narrow Screen / iFrame Card View */}
        <div className="block lg:hidden space-y-4">
          {sortedFilteredRequests.length === 0 ? (
            <div className="py-12 text-center text-brand-dark/40 font-mono uppercase tracking-widest bg-white border border-brand-dark">
              작성된 구매 신청 내역이 없습니다.
            </div>
          ) : (
            sortedFilteredRequests.map((req) => {
              const rate = calculateApprovalRate(req);
              const incomingCount = req.items.filter((item) => item.incomingStatus === "입고완료").length;
              const incomingRate = req.items.length > 0 ? Math.round((incomingCount / req.items.length) * 100) : 0;
              const monthlySeq = getRequestMonthlyIndex(req, requests);
              const docNumber = formatDocNumber(req.date, monthlySeq);
              const reqStatus = getRequestStatus(req);
              const totalAmount = req.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

              return (
                <div key={req.id} className="bg-white border border-brand-dark shadow-md rounded-none">
                  {/* Card Header */}
                  <div className="bg-brand-dark text-white p-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(req.id)}
                        onChange={(e) => handleSelectOne(e, req.id)}
                        className="cursor-pointer accent-brand-dark rounded bg-white border border-white/20 w-4 h-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <span className="font-mono text-xs font-bold block">{docNumber}</span>
                        <span className="text-[10px] text-white/70 font-mono">{req.date} | 작성자: {req.requester}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold ${
                        reqStatus === '완료' ? 'bg-blue-600 text-white' : 
                        reqStatus === '거부 포함' ? 'bg-rose-600 text-white' : 
                        reqStatus === '일부결재' ? 'bg-emerald-600 text-white' : 
                        'bg-amber-600 text-white'
                      }`}>
                        {reqStatus}
                      </span>
                      <button 
                        onClick={() => onSelectRequest(req)}
                        className="p-1 hover:bg-white/10 text-white transition-colors"
                        title="상세 보기/수정"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onDeleteRequests([req.id])}
                        className="p-1 hover:bg-red-950 text-red-200 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Body (List of items in this request) */}
                  <div className="p-3 divide-y divide-brand-dark/10">
                    {req.items.map((item, itemIdx) => (
                      <div key={item.id || itemIdx} className="py-3 first:pt-0 last:pb-0 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-xs text-brand-dark">{item.itemName || "품목명 없음"}</h4>
                            <p className="text-[10px] text-brand-dark/60 font-mono">
                              bom code: {item.bomCode || '-'} | {item.division} &gt; {item.sector} &gt; {item.item}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              item.status === '결재' ? 'bg-emerald-600 text-white' : 
                              item.status === '거부' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {item.status}
                            </span>
                            <button 
                              onClick={() => onDeleteItem(req.id, itemIdx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="품목 삭제"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10.5px] bg-brand-bg/30 p-2.5 border border-brand-dark/5">
                          <div><span className="text-brand-dark/50">수량:</span> <span className="font-bold">{item.quantity} {item.unit}</span></div>
                          <div><span className="text-brand-dark/50">단가:</span> <span className="font-mono">{item.price.toLocaleString()}원</span></div>
                          <div><span className="text-brand-dark/50">합계:</span> <span className="font-mono font-bold">{(item.price * item.quantity).toLocaleString()}원</span></div>
                          <div><span className="text-brand-dark/50">재고상황:</span> <span className="text-emerald-700 font-bold">{item.stock || '-'}</span></div>
                          <div className="col-span-2">
                            <span className="text-brand-dark/50">구매사이트:</span>{' '}
                            {item.buySite && item.buySite.startsWith('http') ? (
                              <a href={item.buySite} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline font-bold break-all">
                                {item.buySite}
                              </a>
                            ) : <span className="text-gray-600 break-all">{item.buySite || '-'}</span>}
                          </div>
                          {item.remark && <div className="col-span-2"><span className="text-brand-dark/50">비고:</span> <span className="italic">{item.remark}</span></div>}
                          {item.comment && <div className="col-span-2"><span className="text-brand-dark/50">견적서/메모:</span> <span>{item.comment}</span></div>}
                          {item.attachmentName && (
                            <div className="col-span-2">
                              <span className="text-brand-dark/50">첨부파일:</span>{' '}
                              <span className="text-[9px] font-bold text-brand-dark/80 bg-white/50 px-1.5 py-0.5 rounded border border-brand-dark/10 inline-block">📎 {item.attachmentName}</span>
                            </div>
                          )}
                          {item.photo && (
                            <div className="col-span-2 flex items-center gap-2 pt-1">
                              <span className="text-brand-dark/50">사진:</span>
                              <img src={item.photo} alt={item.itemName} className="w-10 h-10 object-cover border border-brand-dark/20" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          <div>
                            <span className="text-brand-dark/50">입고 상태:</span>{' '}
                            <span className={`px-1 text-[9px] font-bold ${item.incomingStatus === '입고완료' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                              {item.incomingStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer Summary */}
                  <div className="bg-brand-panel px-3 py-2 border-t border-brand-dark/10 flex justify-between items-center text-[10px] font-mono text-brand-dark/70">
                    <span>결재율: {Math.round(rate)}% | 입고율: {incomingRate}%</span>
                    <span className="font-bold text-brand-dark">총 금액: {totalAmount.toLocaleString()}원</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
