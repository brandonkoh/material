/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserRole } from "../types";
import { Lock, Save, RefreshCw, KeyRound, CheckCircle } from "lucide-react";

interface AdminPasswordChangeProps {
  passwords: Record<UserRole, string>;
  onSavePasswords: (newPasswords: Record<UserRole, string>) => void;
}

export default function AdminPasswordChange({ passwords, onSavePasswords }: AdminPasswordChangeProps) {
  const [reqPassword, setReqPassword] = useState(passwords["신청자"]);
  const [apprPassword, setApprPassword] = useState(passwords["결재자"]);
  const [adminPassword, setAdminPassword] = useState(passwords["admin"]);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqPassword || !apprPassword || !adminPassword) {
      alert("모든 비밀번호 필드를 입력해야 합니다.");
      return;
    }
    onSavePasswords({
      "신청자": reqPassword,
      "결재자": apprPassword,
      "admin": adminPassword,
    });
    setSuccessMsg("비밀번호가 성공적으로 변경되었습니다.");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  const handleResetToDefault = () => {
    if (confirm("모든 비밀번호를 초기 비밀번호(신청자: '1234', 결재자/admin: '0937')로 리셋하시겠습니까?")) {
      setReqPassword("1234");
      setApprPassword("0937");
      setAdminPassword("0937");
      onSavePasswords({
        "신청자": "1234",
        "결재자": "0937",
        "admin": "0937",
      });
      setSuccessMsg("모든 비밀번호가 초기 기본값으로 리셋되었습니다.");
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  return (
    <div className="bg-brand-panel p-6 border border-brand-dark max-w-2xl mx-auto">
      <div className="flex items-center gap-3 border-b border-brand-dark/10 pb-4 mb-6">
        <div className="p-2 bg-brand-dark text-white">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-black text-brand-dark uppercase tracking-tight font-serif">사용자 비밀번호 관리 (PASSWORD_ENGINE)</h3>
          <p className="text-[10px] text-brand-dark/60 font-mono">MODIFY OR RESET LOGIN CREDENTIALS FOR SYSTEM OPERATORS</p>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 flex items-center gap-2 bg-emerald-50 border border-emerald-500 text-emerald-900 p-3 text-xs font-bold font-mono">
          <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 신청자 */}
          <div className="bg-[#F2F1EE] p-4 border border-brand-dark">
            <label className="block text-xs font-bold text-brand-dark uppercase font-serif mb-2">
              신청자 계정 비밀번호 (OPERATOR_PW)
            </label>
            <div className="relative">
              <input
                type="text"
                value={reqPassword}
                onChange={(e) => setReqPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="block w-full px-3 py-2 border border-brand-dark bg-white text-xs text-brand-dark font-mono font-bold focus:outline-none"
              />
            </div>
            <p className="text-[10px] font-mono text-brand-dark/50 mt-1.5">ID: 신청자 / ROLE_PERM: PROCUREMENT_ONLY</p>
          </div>

          {/* 결재자 */}
          <div className="bg-[#F2F1EE] p-4 border border-brand-dark">
            <label className="block text-xs font-bold text-brand-dark uppercase font-serif mb-2">
              결재자 계정 비밀번호 (DECIDER_PW)
            </label>
            <div className="relative">
              <input
                type="text"
                value={apprPassword}
                onChange={(e) => setApprPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="block w-full px-3 py-2 border border-brand-dark bg-white text-xs text-brand-dark font-mono font-bold focus:outline-none"
              />
            </div>
            <p className="text-[10px] font-mono text-brand-dark/50 mt-1.5">ID: 결재자 / ROLE_PERM: DECISION_ONLY</p>
          </div>

          {/* admin */}
          <div className="bg-[#F2F1EE] p-4 border border-brand-dark md:col-span-2">
            <label className="block text-xs font-bold text-brand-dark uppercase font-serif mb-2">
              관리자(admin) 계정 비밀번호 (SUPERUSER_PW)
            </label>
            <div className="relative max-w-md">
              <input
                type="text"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="block w-full px-3 py-2 border border-brand-dark bg-white text-xs text-brand-dark font-mono font-bold focus:outline-none"
              />
            </div>
            <p className="text-[10px] font-mono text-brand-dark/50 mt-1.5">ID: admin / ROLE_PERM: ALL_PRIVILEGES_ENABLED</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-brand-dark/10">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-4 py-1.5 border border-brand-dark text-brand-dark bg-white hover:bg-brand-dark/10 text-xs font-bold transition-colors font-mono uppercase"
          >
            초기 기본값 리셋
          </button>
          <button
            type="submit"
            className="px-5 py-1.5 bg-brand-dark hover:bg-white hover:text-brand-dark text-white border border-brand-dark text-xs font-bold transition-colors font-mono uppercase"
          >
            변경사항 저장
          </button>
        </div>
      </form>
    </div>
  );
}
