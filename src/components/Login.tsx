/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserRole } from "../types";
import { KeyRound, ShieldAlert, UserCheck, Chrome } from "lucide-react";

interface LoginProps {
  onLogin: (role: UserRole, username: string) => void;
  passwords: Record<UserRole, string>;
}

export default function Login({ onLogin, passwords }: LoginProps) {
  const [role, setRole] = useState<UserRole>("신청자");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = passwords[role];
    const usernameMap: Record<UserRole, string> = {
      admin: "admin",
      결재자: "결재자",
      신청자: "신청자"
    };

    if (password === correctPassword) {
      onLogin(role, usernameMap[role]);
      setError("");
    } else {
      setError("비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-brand-panel p-8 border border-brand-dark shadow-sm">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-dark text-white mb-4">
            <div className="w-5 h-5 border-2 border-white rotate-45"></div>
          </div>
          <h2 className="text-xl font-bold text-brand-dark uppercase tracking-tight leading-none">
            자재구매 신청/결재/관리 시스템 V1.0
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 p-4 border border-red-500 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-800 leading-relaxed">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <div className="grid grid-cols-3 gap-2">
                {(["신청자", "결재자", "admin"] as UserRole[]).map((r) => {
                  const isSelected = role === r;
                  return (
                    <button
                      key={r}
                      id={`btn-login-role-${r}`}
                      type="button"
                      onClick={() => {
                        setRole(r);
                        setError("");
                      }}
                      className={`py-3 px-2 text-xs font-bold border text-center transition-colors uppercase ${
                        isSelected
                          ? "bg-brand-dark text-white border-brand-dark"
                          : "bg-white text-brand-dark/70 border-brand-dark/20 hover:bg-brand-dark/5 hover:text-brand-dark"
                      }`}
                    >
                      <div className="font-mono text-xs">
                        {r === "admin" ? "admin" : r}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-brand-dark uppercase tracking-wide mb-1.5 font-['Malgun_Gothic']">
                아이디
              </label>
              <div className="relative">
                <input
                  id="login-username-input"
                  type="text"
                  disabled
                  value={role === "admin" ? "admin" : role}
                  className="block w-full pl-3 pr-3 py-2 border border-brand-dark/40 bg-brand-bg text-brand-dark font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password-input" className="block text-[11px] text-brand-dark uppercase tracking-wide mb-1.5 font-['Malgun_Gothic']">
                비밀번호
              </label>
              <input
                id="password-input"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="block w-full px-3 py-2 border border-brand-dark text-brand-dark font-mono text-xs focus:outline-none placeholder-brand-dark/30"
              />
              {role === "신청자" && (
                <p className="mt-2 text-xs text-red-600 font-bold font-mono">
                  신청자 비밀번호: <span className="bg-white border border-red-300 px-1.5 py-0.5 rounded text-red-600">{passwords["신청자"]}</span>
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              id="btn-submit-login"
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-brand-dark text-xs font-bold uppercase text-white bg-brand-dark hover:bg-white hover:text-brand-dark transition-colors"
            >
              로그인
            </button>
          </div>

          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id="chrome-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EA4335" />
                <stop offset="33%" stopColor="#FBBC05" />
                <stop offset="66%" stopColor="#34A853" />
                <stop offset="100%" stopColor="#4285F4" />
              </linearGradient>
            </defs>
          </svg>

          <div className="pt-4 border-t border-brand-dark/15 flex items-center justify-center gap-2 text-xs font-bold text-red-600">
            <Chrome className="w-4 h-4 shrink-0" style={{ stroke: 'url(#chrome-gradient)' }} strokeWidth={2.5} />
            <span>Google Chrome에서 실행하세요</span>
          </div>
        </form>

      </div>
    </div>
  );
}
