/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserRole, PurchaseRequest } from "../types";
import { Lock, Save, RefreshCw, KeyRound, CheckCircle, Database, HelpCircle, ExternalLink, FileJson, ArrowDown, ArrowUp } from "lucide-react";

interface AdminPasswordChangeProps {
  passwords: Record<UserRole, string>;
  onSavePasswords: (newPasswords: Record<UserRole, string>) => void;
  gasUrl: string;
  onSaveGasUrl: (url: string) => void;
  requests: PurchaseRequest[];
  onSyncPull: () => Promise<number>;
  onSyncPush: () => Promise<number>;
}

export default function AdminPasswordChange({
  passwords,
  onSavePasswords,
  gasUrl,
  onSaveGasUrl,
  requests,
  onSyncPull,
  onSyncPush
}: AdminPasswordChangeProps) {
  // Passwords state
  const [reqPassword, setReqPassword] = useState(passwords["신청자"]);
  const [apprPassword, setApprPassword] = useState(passwords["결재자"]);
  const [adminPassword, setAdminPassword] = useState(passwords["admin"]);
  const [successMsg, setSuccessMsg] = useState("");

  // GAS Web App URL state
  const [localGasUrl, setLocalGasUrl] = useState(gasUrl);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncSuccess, setSyncSuccess] = useState("");
  const [showCode, setShowCode] = useState(false);

  const handleSubmitPasswords = (e: React.FormEvent) => {
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

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGasUrl(localGasUrl);
    setSyncSuccess("Google Apps Script URL이 성공적으로 저장되었습니다.");
    setSyncError("");
    setTimeout(() => setSyncSuccess(""), 4000);
  };

  const handleManualPull = async () => {
    if (!localGasUrl.trim()) {
      alert("Google Apps Script Web App URL을 먼저 입력하고 저장해 주세요.");
      return;
    }
    if (confirm("구글 시트로부터 전체 데이터를 가져옵니다. 로컬의 데이터가 구글 시트의 데이터로 덮어쓰기됩니다. 계속하시겠습니까?")) {
      setSyncLoading(true);
      setSyncError("");
      setSyncSuccess("");
      try {
        const count = await onSyncPull();
        setSyncSuccess(`구글 시트로부터 성공적으로 데이터를 가져왔습니다! 총 ${count}개의 신청서를 로드했습니다.`);
      } catch (err: any) {
        setSyncError(err.message || "데이터 불러오기 중 에러가 발생했습니다.");
      } finally {
        setSyncLoading(false);
      }
    }
  };

  const handleManualPush = async () => {
    if (!localGasUrl.trim()) {
      alert("Google Apps Script Web App URL을 먼저 입력하고 저장해 주세요.");
      return;
    }
    if (confirm("현재 로컬 데이터를 구글 스프레드시트에 전송하여 저장합니다. 계속하시겠습니까?")) {
      setSyncLoading(true);
      setSyncError("");
      setSyncSuccess("");
      try {
        const count = await onSyncPush();
        setSyncSuccess(`로컬 데이터 총 ${count}개의 신청서 내역을 구글 스프레드시트에 성공적으로 저장했습니다!`);
      } catch (err: any) {
        setSyncError(err.message || "데이터 내보내기 중 에러가 발생했습니다.");
      } finally {
        setSyncLoading(false);
      }
    }
  };

  // Apps Script template to copy
  const appsScriptCode = `// 1. Google Sheets Extensions > Apps Script 에 아래 코드를 붙여넣으세요.
// 2. 상단 '배포' > '새 배포'를 클릭하고, '웹 앱'으로 배포하세요.
// 3. '액세스할 수 있는 사용자'를 '모든 사용자(Anyone)'로 지정하세요.
// 4. 배포 후 생성된 웹 앱 URL 주소를 복사하여 본 설정 화면에 붙여넣으세요.

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dbSheet = ss.getSheetByName("_system_db_");
  var jsonStr = "";
  if (dbSheet) {
    jsonStr = dbSheet.getRange(1, 1).getValue();
  }
  
  if (!jsonStr) {
    jsonStr = "[]";
  }
  
  return ContentService.createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var postData = e.postData.contents;
    var requests = JSON.parse(postData);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. 로컬 데이터 원본 저장용 숨김 시트 생성 및 JSON 저장
    var dbSheet = ss.getSheetByName("_system_db_");
    if (!dbSheet) {
      dbSheet = ss.insertSheet("_system_db_");
      dbSheet.hideSheet();
    }
    dbSheet.getRange(1, 1).setValue(postData);
    
    // 2. 사람이 볼 수 있는 시각화용 "자재구매목록" 시트 업데이트
    var viewSheet = ss.getSheetByName("자재구매목록");
    if (!viewSheet) {
      viewSheet = ss.insertSheet("자재구매목록");
    }
    viewSheet.clear();
    
    var headers = [
      "No", "문서번호", "신청자", "BOM Code", "신청일자", 
      "구분", "부문", "품목", "품목명", "수량", 
      "단위", "단가", "합계금액", "입고상태", "결재상태", 
      "구매사이트", "재고", "비고", "조치사항", "사진유무"
    ];
    viewSheet.appendRow(headers);
    viewSheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#e2e8f0")
      .setHorizontalAlignment("center");
      
    var rowData = [];
    var count = 1;
    requests.forEach(function(req) {
      req.items.forEach(function(item) {
        var docNum = req.date.replace(/-/g, "") + "-" + String(req.index).padStart(3, "0");
        rowData.push([
          count++,
          docNum,
          req.requester,
          item.bomCode || "",
          item.date || req.date,
          item.division || "",
          item.sector || "",
          item.item || "",
          item.itemName || "",
          item.quantity || 0,
          item.unit || "EA",
          item.price || 0,
          (item.price || 0) * (item.quantity || 0),
          item.incomingStatus || "미입고",
          item.status || "대기",
          item.buySite || "",
          item.stock || "",
          item.remark || "",
          item.comment || "",
          item.photo ? "유" : "무"
        ]);
      });
    });
    
    if (rowData.length > 0) {
      viewSheet.getRange(2, 1, rowData.length, headers.length).setValues(rowData);
    }
    
    // 열 너비 자동 조정
    for (var i = 1; i <= headers.length; i++) {
      viewSheet.autoResizeColumn(i);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: rowData.length }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      });
  }
}`;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* 1. PASSWORD SETTINGS CARD */}
      <div className="bg-brand-panel p-6 border border-brand-dark shadow-md">
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

        <form onSubmit={handleSubmitPasswords} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 신청자 */}
            <div className="bg-[#F2F1EE] p-4 border border-brand-dark">
              <label className="block text-xs font-bold text-brand-dark uppercase font-serif mb-2">
                신청자 계정 비밀번호 (OPERATOR_PW)
              </label>
              <input
                type="text"
                value={reqPassword}
                onChange={(e) => setReqPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="block w-full px-3 py-2 border border-brand-dark bg-white text-xs text-brand-dark font-mono font-bold focus:outline-none"
              />
              <p className="text-[10px] font-mono text-brand-dark/50 mt-1.5">ID: 신청자 / ROLE_PERM: PROCUREMENT_ONLY</p>
            </div>

            {/* 결재자 */}
            <div className="bg-[#F2F1EE] p-4 border border-brand-dark">
              <label className="block text-xs font-bold text-brand-dark uppercase font-serif mb-2">
                결재자 계정 비밀번호 (DECIDER_PW)
              </label>
              <input
                type="text"
                value={apprPassword}
                onChange={(e) => setApprPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="block w-full px-3 py-2 border border-brand-dark bg-white text-xs text-brand-dark font-mono font-bold focus:outline-none"
              />
              <p className="text-[10px] font-mono text-brand-dark/50 mt-1.5">ID: 결재자 / ROLE_PERM: DECISION_ONLY</p>
            </div>

            {/* admin */}
            <div className="bg-[#F2F1EE] p-4 border border-brand-dark md:col-span-2">
              <label className="block text-xs font-bold text-brand-dark uppercase font-serif mb-2">
                관리자(admin) 계정 비밀번호 (SUPERUSER_PW)
              </label>
              <input
                type="text"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="block w-full max-w-md px-3 py-2 border border-brand-dark bg-white text-xs text-brand-dark font-mono font-bold focus:outline-none"
              />
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
              비밀번호 저장
            </button>
          </div>
        </form>
      </div>

      {/* 2. GOOGLE SHEETS CLOUD INTEGRATION CARD */}
      <div className="bg-brand-panel p-6 border border-brand-dark shadow-md">
        <div className="flex items-center gap-3 border-b border-brand-dark/10 pb-4 mb-6">
          <div className="p-2 bg-emerald-700 text-white">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-brand-dark uppercase tracking-tight font-serif">구글 스프레드시트 실시간 클라우드 연동 (GOOGLE_SHEET_ENGINE)</h3>
            <p className="text-[10px] text-brand-dark/60 font-mono">CONNECT THE DATABASE SECURELY TO GOOGLE SHEETS APPS SCRIPT WEB APP</p>
          </div>
        </div>

        {syncSuccess && (
          <div className="mb-6 flex items-center gap-2 bg-emerald-50 border border-emerald-500 text-emerald-900 p-3 text-xs font-bold font-mono">
            <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{syncSuccess}</span>
          </div>
        )}

        {syncError && (
          <div className="mb-6 flex items-center gap-2 bg-rose-50 border border-rose-500 text-rose-900 p-3 text-xs font-bold font-mono">
            <span className="shrink-0 text-rose-600 font-bold">⚠️ Error:</span>
            <span>{syncError}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Web App URL Input Form */}
          <form onSubmit={handleSaveUrl} className="bg-[#F2F1EE] p-4 border border-brand-dark space-y-4">
            <div>
              <label className="block text-xs font-bold text-brand-dark uppercase font-serif mb-2">
                Google Apps Script 웹 앱 URL 주소 (GAS_WEBAPP_URL)
              </label>
              <input
                type="url"
                value={localGasUrl}
                onChange={(e) => setLocalGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="block w-full px-3 py-2 border border-brand-dark bg-white text-xs text-brand-dark font-mono focus:outline-none"
              />
              <p className="text-[10px] font-mono text-brand-dark/50 mt-1.5">
                * CORS 우회 및 보안을 위해 Content-Type: text/plain 전송 프로토콜을 사용합니다.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-950 text-xs font-bold transition-colors font-mono uppercase"
              >
                URL 주소 저장
              </button>
            </div>
          </form>

          {/* Sync Controls */}
          {gasUrl && (
            <div className="bg-white p-5 border border-brand-dark/20 space-y-4">
              <h4 className="text-xs font-bold text-brand-dark uppercase tracking-wider font-mono">
                수동 데이터 동기화 콘트롤 (SYNC_CONTROLLER)
              </h4>
              <p className="text-xs text-brand-dark/70 leading-relaxed">
                현재 로컬 브라우저에 저장된 데이터({requests.length}건)를 구글 클라우드 스프레드시트와 즉시 강제 수동 동기화할 수 있습니다.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleManualPull}
                  disabled={syncLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <ArrowDown className={`w-4 h-4 ${syncLoading ? "animate-bounce" : ""}`} />
                  구글 시트에서 데이터 가져오기 (GET_PULL)
                </button>

                <button
                  type="button"
                  onClick={handleManualPush}
                  disabled={syncLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <ArrowUp className={`w-4 h-4 ${syncLoading ? "animate-bounce" : ""}`} />
                  구글 시트로 데이터 내보내기 (POST_PUSH)
                </button>

                {syncLoading && (
                  <div className="flex items-center gap-2 text-xs font-mono text-brand-dark font-bold">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>클라우드 동기화 통신 중...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Integration Instructions */}
          <div className="bg-slate-50 p-5 border border-brand-dark/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-brand-dark/60" />
                <h4 className="text-xs font-bold text-brand-dark uppercase tracking-wider font-serif">
                  구글 스프레드시트 연동 방법 가이드 (INTEGRATION_GUIDE)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="text-[11px] text-blue-600 hover:underline font-bold"
              >
                {showCode ? "스크립트 코드 숨기기" : "구글 Apps Script 전체 소스코드 보기"}
              </button>
            </div>

            <ol className="list-decimal list-inside text-xs text-brand-dark/80 space-y-2 leading-relaxed">
              <li>사용할 구글 스프레드시트를 생성합니다.</li>
              <li>상단 메뉴에서 <strong>확장 프로그램 (Extensions) &gt; Apps Script</strong>를 실행합니다.</li>
              <li>기존 코드를 모두 지우고, 우측의 <strong>구글 Apps Script 소스코드</strong>를 복사해서 붙여넣습니다.</li>
              <li>우측 상단의 <strong>배포 (Deploy) &gt; 새 배포 (New deployment)</strong>를 클릭합니다.</li>
              <li>유형 선정을 <strong>웹 앱 (Web app)</strong>으로 선택합니다.</li>
              <li>설정: <strong>웹 앱을 실행할 사용자: 나(Me)</strong> / <strong>액세스 권한이 있는 사용자: 모든 사용자(Anyone)</strong>로 설정한 후 배포합니다.</li>
              <li>승인(Authorization) 요청 시 구글 계정을 로그인하고 권한을 허용해 줍니다.</li>
              <li>생성된 <strong>웹 앱 URL (Web app URL)</strong>을 복사하여 위의 입력창에 입력하고 저장하세요!</li>
            </ol>

            {showCode && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between items-center text-[10px] text-brand-dark/50 uppercase font-mono bg-slate-200/50 p-2 border border-brand-dark/10">
                  <span>Google Apps Script Code (Code.gs)</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(appsScriptCode);
                      alert("코드가 클립보드에 복사되었습니다!");
                    }}
                    className="bg-brand-dark text-white hover:bg-brand-dark/80 px-2 py-0.5 font-sans font-bold"
                  >
                    코드 복사하기 (COPY)
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-sky-400 font-mono text-[10.5px] rounded-none overflow-x-auto max-h-96 border border-brand-dark">
                  {appsScriptCode}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

