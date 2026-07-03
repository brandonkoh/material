/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Category } from "../data/categories";
import { Plus, Trash2, Search, Sliders, Edit2, Check, X, Undo } from "lucide-react";

interface CategoryManagementProps {
  categories: Category[];
  onAddCategory: (category: Omit<Category, "id">) => void;
  onEditCategory: (id: string, updated: Omit<Category, "id">) => void;
  onDeleteCategory: (id: string) => void;
  onResetCategories: () => void;
}

export default function CategoryManagement({
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onResetCategories
}: CategoryManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [newDivision, setNewDivision] = useState("");
  const [newSector, setNewSector] = useState("");
  const [newItem, setNewItem] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDivision, setEditDivision] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editItem, setEditItem] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivision.trim() || !newSector.trim() || !newItem.trim()) {
      setErrorMsg("구분, 종목, 품목 명칭을 모두 기입하십시오.");
      return;
    }
    onAddCategory({
      division: newDivision.trim(),
      sector: newSector.trim(),
      item: newItem.trim()
    });
    setNewDivision("");
    setNewSector("");
    setNewItem("");
    setErrorMsg("");
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditDivision(cat.division);
    setEditSector(cat.sector);
    setEditItem(cat.item);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = (id: string) => {
    if (!editDivision.trim() || !editSector.trim() || !editItem.trim()) {
      alert("모든 필드를 입력해 주세요.");
      return;
    }
    onEditCategory(id, {
      division: editDivision.trim(),
      sector: editSector.trim(),
      item: editItem.trim()
    });
    setEditingId(null);
  };

  const filtered = categories.filter((cat) => {
    const s = searchTerm.toLowerCase();
    return (
      cat.division.toLowerCase().includes(s) ||
      cat.sector.toLowerCase().includes(s) ||
      cat.item.toLowerCase().includes(s)
    );
  });

  return (
    <div className="bg-brand-panel p-6 border border-brand-dark max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-brand-dark/10 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-dark text-white">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-brand-dark uppercase tracking-tight font-serif">카테고리 수정 및 관리 (CATEGORY_SETUP)</h3>
            <p className="text-[10px] text-brand-dark/60 font-mono">EDIT SELECTION DATABASE: DIVISIONS, SECTORS, AND ITEMS</p>
          </div>
        </div>

        <button
          onClick={() => {
            if (confirm("카테고리를 초기 제공된 목록으로 되돌리시겠습니까? 추가하신 카테고리는 유실됩니다.")) {
              onResetCategories();
            }
          }}
          className="px-3 py-1.5 border border-brand-dark text-brand-dark bg-white hover:bg-brand-dark hover:text-white text-xs font-bold transition-colors font-mono uppercase"
        >
          기본 목록으로 초기화
        </button>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-[#F2F1EE] p-4 border border-brand-dark space-y-4">
        <h4 className="text-xs font-bold text-brand-dark uppercase font-serif">새 카테고리 추가 (INSERT_NEW)</h4>
        {errorMsg && <p className="text-xs font-bold text-red-700 font-mono">⚠ {errorMsg}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-brand-dark/60 uppercase font-mono mb-1">구분 (DIVISION)</label>
            <input
              type="text"
              value={newDivision}
              onChange={(e) => setNewDivision(e.target.value)}
              placeholder="예: 기계"
              className="block w-full px-3 py-1.5 border border-brand-dark text-xs bg-white focus:outline-none rounded-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-brand-dark/60 uppercase font-mono mb-1">종목 (SECTOR)</label>
            <input
              type="text"
              value={newSector}
              onChange={(e) => setNewSector(e.target.value)}
              placeholder="예: FCU"
              className="block w-full px-3 py-1.5 border border-brand-dark text-xs bg-white focus:outline-none rounded-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-brand-dark/60 uppercase font-mono mb-1">품목 (ITEM)</label>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="예: 필터"
              className="block w-full px-3 py-1.5 border border-brand-dark text-xs bg-white focus:outline-none rounded-none"
            />
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-4 py-1.5 bg-brand-dark hover:bg-white hover:text-brand-dark text-white border border-brand-dark text-xs font-bold transition-colors uppercase font-mono"
          >
            + 카테고리 행 추가 (ADD_RECORD)
          </button>
        </div>
      </form>

      {/* Categories table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="구분, 종목, 품목 통합 검색..."
              className="block w-full px-3 py-1.5 border border-brand-dark text-xs bg-white focus:outline-none rounded-none"
            />
          </div>
          <span className="text-[10px] font-mono text-brand-dark/60">TOTAL_RECORDS: {filtered.length}</span>
        </div>

        <div className="overflow-x-auto border border-brand-dark">
          <table className="min-w-full divide-y divide-brand-dark/20 text-xs table-fixed">
            <thead className="bg-[#E4E3E0] text-brand-dark/70 text-[10px] font-bold select-none text-left border-b border-brand-dark font-serif">
              <tr>
                <th className="px-4 py-2.5 text-center w-16">번호</th>
                <th className="px-4 py-2.5 w-1/4">구분</th>
                <th className="px-4 py-2.5 w-1/4">종목</th>
                <th className="px-4 py-2.5 w-1/4">품목</th>
                <th className="px-4 py-2.5 text-center w-28">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-dark/10 text-brand-dark bg-white/30">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-brand-dark/40 font-mono">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((cat, index) => {
                  const isEditing = editingId === cat.id;

                  return (
                    <tr key={cat.id} className="hover:bg-brand-dark hover:text-white transition-colors group">
                      <td className="px-4 py-2 text-center text-brand-dark/50 font-mono font-bold group-hover:text-white/70">{String(index + 1).padStart(3, "0")}</td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDivision}
                            onChange={(e) => setEditDivision(e.target.value)}
                            className="px-2 py-0.5 border border-brand-dark rounded-none text-xs w-full bg-white text-brand-dark focus:outline-none"
                          />
                        ) : (
                          <span className="font-bold group-hover:text-white">{cat.division}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editSector}
                            onChange={(e) => setEditSector(e.target.value)}
                            className="px-2 py-0.5 border border-brand-dark rounded-none text-xs w-full bg-white text-brand-dark focus:outline-none"
                          />
                        ) : (
                          <span className="group-hover:text-white/95">{cat.sector}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editItem}
                            onChange={(e) => setEditItem(e.target.value)}
                            className="px-2 py-0.5 border border-brand-dark rounded-none text-xs w-full bg-white text-brand-dark focus:outline-none"
                          />
                        ) : (
                          <span className="group-hover:text-white/80">{cat.item}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(cat.id)}
                                className="px-1.5 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-[9px] border border-emerald-950 font-bold"
                                title="저장"
                              >
                                SAVE
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-1.5 py-0.5 bg-brand-dark text-white font-mono text-[9px] border border-brand-dark font-bold hover:bg-white hover:text-brand-dark"
                                title="취소"
                              >
                                ESC
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(cat)}
                                className="px-1.5 py-0.5 bg-brand-dark text-white border border-brand-dark hover:bg-white hover:text-brand-dark text-[10px] font-bold"
                                title="수정"
                              >
                                EDIT
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`'${cat.division} - ${cat.sector} - ${cat.item}' 카테고리를 삭제하시겠습니까?`)) {
                                    onDeleteCategory(cat.id);
                                  }
                                }}
                                className="px-1.5 py-0.5 bg-rose-700 hover:bg-rose-800 text-white border border-rose-950 text-[10px] font-bold"
                                title="삭제"
                              >
                                DEL
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
