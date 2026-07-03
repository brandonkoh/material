// @ts-ignore
window.GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbygg_04WmmWC2wmIk7jL21wBBDkp5CrGmHZNuMJysBaM9qNTbiA1DWfmJVtjDm5qcs-/exec";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { UserRole, PurchaseRequest, PurchaseItem } from "./types";
import { initialCategories, Category } from "./data/categories";
import { initialRequests } from "./data/initialRequests";
// Local DB functions removed to prevent QuotaExceededError
import { getGasUrl, setGasUrl as saveGasUrlToLocalStorage, pullFromGas, pushToGas } from "./utils/sync";

// Components
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import PurchaseRequestForm from "./components/PurchaseRequestForm";
import CategoryManagement from "./components/CategoryManagement";
import AdminPasswordChange from "./components/AdminPasswordChange";

import { ClipboardList, LogOut, ArrowLeft, Key, Sliders, LayoutDashboard } from "lucide-react";

export default function App() {
  // 1. Authentication State
  const [user, setUser] = useState<{ role: UserRole; username: string } | null>(null);

  // 2. User Passwords (persistent in localStorage)
  const [passwords, setPasswords] = useState<Record<UserRole, string>>(() => {
    const saved = localStorage.getItem("material_system_passwords");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let migrated = false;
        if (parsed.admin === "1234") {
          parsed.admin = "0937";
          migrated = true;
        }
        if (parsed.결재자 === "1234") {
          parsed.결재자 = "0937";
          migrated = true;
        }
        if (migrated) {
          localStorage.setItem("material_system_passwords", JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return {
      admin: "0937",
      결재자: "0937",
      신청자: "1234"
    };
  });

  // 3. Category Data (persistent in localStorage)
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem("material_system_categories");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return initialCategories;
  });

  // 4. Purchase Requests Data (persistent in LocalStorage)
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Google Apps Script Web App URL state & status
  const [gasUrl, setGasUrl] = useState<string>(() => window.GOOGLE_SCRIPT_URL || getGasUrl());
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState<string>("");

  // Load requests when app mounts or user login status changes (sync with Google Sheets)
  useEffect(() => {
    const loadRequests = async () => {
      setIsLoaded(false);
      
      const initialData: PurchaseRequest[] = [...initialRequests];
      const activeUrl = window.GOOGLE_SCRIPT_URL || gasUrl;

      // If GAS Web App URL is configured, pull the newest data from Google Sheets!
      if (activeUrl) {
        setSyncStatus("syncing");
        setSyncMessage("구글 시트 연동 데이터 불러오는 중...");
        try {
          const cloudData = await pullFromGas(activeUrl);
          if (cloudData && cloudData.length > 0) {
            setRequests(cloudData);
            setSyncStatus("success");
            setSyncMessage("구글 시트 동기화 완료");
          } else {
            // If cloud is empty, initialize it with initialRequests!
            setRequests(initialData);
            await pushToGas(activeUrl, initialData);
            setSyncStatus("success");
            setSyncMessage("구글 시트 연동 완료");
          }
        } catch (cloudErr: any) {
          console.error("Failed to pull from Google Sheets on login:", cloudErr);
          setRequests(initialData);
          setSyncStatus("error");
          setSyncMessage("구글 시트 동기화 실패 (임시 오프라인 모드)");
        }
      } else {
        // If there's no GAS URL configured, we keep initialRequests in memory only!
        setRequests(initialData);
        setSyncStatus("idle");
        setSyncMessage("로컬 임시 모드 (연동 URL 없음)");
      }
      
      setIsLoaded(true);
    };

    loadRequests();
  }, [user, gasUrl]);

  // 5. Navigation View State
  const [view, setView] = useState<"dashboard" | "form" | "passwords" | "categories">("dashboard");
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);

  // Helper: Sync passwords to localStorage
  const handleSavePasswords = (newPasswords: Record<UserRole, string>) => {
    setPasswords(newPasswords);
    localStorage.setItem("material_system_passwords", JSON.stringify(newPasswords));
  };

  // Helper: Add Category
  const handleAddCategory = (newCat: Omit<Category, "id">) => {
    const newId = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const updated = [...categories, { id: newId, ...newCat }];
    setCategories(updated);
    localStorage.setItem("material_system_categories", JSON.stringify(updated));
  };

  // Helper: Edit Category
  const handleEditCategory = (id: string, updatedFields: Omit<Category, "id">) => {
    const updated = categories.map(c => c.id === id ? { ...c, ...updatedFields } : c);
    setCategories(updated);
    localStorage.setItem("material_system_categories", JSON.stringify(updated));
  };

  // Helper: Delete Category
  const handleOnDeleteCategory = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    localStorage.setItem("material_system_categories", JSON.stringify(updated));
  };

  // Helper: Reset Categories
  const handleResetCategories = () => {
    setCategories(initialCategories);
    localStorage.setItem("material_system_categories", JSON.stringify(initialCategories));
  };

  // Helper to push updates to Google Sheets in the background
  const triggerCloudPush = async (updatedList: PurchaseRequest[]) => {
    const activeUrl = window.GOOGLE_SCRIPT_URL || gasUrl;
    if (!activeUrl) return;
    setSyncStatus("syncing");
    setSyncMessage("구글 시트에 데이터 저장 중...");
    try {
      await pushToGas(activeUrl, updatedList);
      setSyncStatus("success");
      setSyncMessage("구글 시트 동기화 완료");
    } catch (err: any) {
      console.error("Auto-sync save failed:", err);
      setSyncStatus("error");
      setSyncMessage("저장 실패 (구글 시트 동기화 오류)");
    }
  };

  // Manual Pull function passed to AdminPasswordChange component
  const handleManualSyncPull = async (): Promise<number> => {
    const activeUrl = window.GOOGLE_SCRIPT_URL || gasUrl;
    if (!activeUrl) throw new Error("Google Apps Script URL이 설정되지 않았습니다.");
    const data = await pullFromGas(activeUrl);
    setRequests(data);
    setSyncStatus("success");
    setSyncMessage("구글 시트 동기화 완료");
    return data.length;
  };

  // Manual Push function passed to AdminPasswordChange component
  const handleManualSyncPush = async (): Promise<number> => {
    const activeUrl = window.GOOGLE_SCRIPT_URL || gasUrl;
    if (!activeUrl) throw new Error("Google Apps Script URL이 설정되지 않았습니다.");
    await pushToGas(activeUrl, requests);
    setSyncStatus("success");
    setSyncMessage("구글 시트 동기화 완료");
    return requests.length;
  };

  // Save GAS Web App URL
  const handleSaveGasUrl = (url: string) => {
    saveGasUrlToLocalStorage(url);
    setGasUrl(url);
  };

  // Helper: Save Purchase Request
  const handleSavePurchaseRequest = async (updatedReq: Omit<PurchaseRequest, "id" | "index"> & { id?: string }) => {
    let updatedRequests: PurchaseRequest[];
    let targetReq: PurchaseRequest;
    
    if (updatedReq.id) {
      // Update existing
      const existing = requests.find(r => r.id === updatedReq.id);
      if (!existing) return;
      targetReq = { 
        ...existing,
        ...updatedReq, 
        items: updatedReq.items as PurchaseItem[] 
      };
      updatedRequests = requests.map(r => r.id === updatedReq.id ? targetReq : r);
    } else {
      // Create new
      const nextIndex = requests.length > 0 ? Math.max(...requests.map(r => r.index)) + 1 : 1;
      const newId = `req-${Date.now()}`;
      targetReq = {
        ...updatedReq,
        id: newId,
        index: nextIndex,
        createdAt: new Date().toISOString(),
        items: updatedReq.items as PurchaseItem[]
      };
      updatedRequests = [...requests, targetReq];
    }
    
    setRequests(updatedRequests);
    triggerCloudPush(updatedRequests);
    setView("dashboard");
    setSelectedRequest(null);
  };

  // Helper: Import Requests
  const handleImportRequests = async (importedItems: any[]) => {
    const groups: { [date: string]: any[] } = {};
    importedItems.forEach(item => {
      const d = item.date || new Date().toISOString().split("T")[0];
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    });

    let currentNextIndex = requests.length > 0 ? Math.max(...requests.map(r => r.index)) + 1 : 1;
    const sortedDates = Object.keys(groups).sort();
    const newRequests: PurchaseRequest[] = [];

    sortedDates.forEach(date => {
      const items: PurchaseItem[] = groups[date].map((item, index) => ({
        id: `imported-item-${Date.now()}-${date}-${index}-${Math.random().toString(36).substr(2, 4)}`,
        bomCode: item.bomCode || "",
        date: item.date || date,
        division: item.division || "기타",
        sector: item.sector || "기타",
        item: item.item || "기타",
        itemName: item.itemName || "",
        quantity: item.quantity || 1,
        unit: item.unit || "EA",
        price: item.price || 0,
        remark: item.remark || "",
        photo: item.photo || "",
        photoName: item.photoName || "",
        buySite: item.buySite || "",
        stock: item.stock || "",
        comment: item.comment || "",
        incomingStatus: item.incomingStatus || "미입고",
        status: "대기"
      }));

      const newId = `req-imported-${Date.now()}-${date}-${Math.random().toString(36).substr(2, 4)}`;
      newRequests.push({
        id: newId,
        index: currentNextIndex++,
        date: date,
        requester: "admin",
        items: items,
        createdAt: new Date().toISOString()
      });
    });

    const updated = [...requests, ...newRequests];
    setRequests(updated);
    triggerCloudPush(updated);
  };

  // Helper: Delete Requests
  const handleDeleteRequests = async (ids: string[]) => {
    const updated = requests.filter(r => !ids.includes(r.id));
    setRequests(updated);
    triggerCloudPush(updated);
  };

  // Helper: Delete Item
  const handleDeleteItem = async (requestId: string, itemIndex: number) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    const newItems = req.items.filter((_, idx) => idx !== itemIndex);
    const updatedReq = { ...req, items: newItems };
    
    const updated = requests.map(r => r.id === requestId ? updatedReq : r);
    setRequests(updated);
    triggerCloudPush(updated);
  };

  // Render Content based on view
  const renderContent = () => {
    if (!user) {
      return <Login onLogin={(role, username) => setUser({ role, username })} passwords={passwords} />;
    }

    if (!isLoaded) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-bold tracking-tight">데이터를 불러오는 중...</p>
        </div>
      );
    }

    switch (view) {
      case "dashboard":
        return (
          <Dashboard
            requests={requests}
            userRole={user.role}
            username={user.username}
            onSelectRequest={(req) => {
              setSelectedRequest(req);
              setView("form");
            }}
            onCreateNewRequest={() => {
              setSelectedRequest(null);
              setView("form");
            }}
            onImportRequests={handleImportRequests}
            onNavigateToPasswords={() => setView("passwords")}
            onNavigateToCategories={() => setView("categories")}
            onLogout={() => setUser(null)}
            onDeleteRequests={handleDeleteRequests}
            onDeleteItem={handleDeleteItem}
          />
        );

      case "form":
        return (
          <PurchaseRequestForm
            categories={categories}
            userRole={user.role}
            username={user.username}
            requestToEdit={selectedRequest}
            requests={requests}
            onSave={handleSavePurchaseRequest}
            onCancel={() => {
              setView("dashboard");
              setSelectedRequest(null);
            }}
          />
        );

      case "categories":
        return (
          <CategoryManagement
            categories={categories}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleOnDeleteCategory}
            onResetCategories={handleResetCategories}
          />
        );

      case "passwords":
        return (
          <AdminPasswordChange 
            passwords={passwords} 
            onSavePasswords={handleSavePasswords} 
            gasUrl={gasUrl}
            onSaveGasUrl={handleSaveGasUrl}
            requests={requests}
            onSyncPull={handleManualSyncPull}
            onSyncPush={handleManualSyncPush}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased">
      {user && (
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setView("dashboard"); setSelectedRequest(null); }}>
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800 tracking-tight leading-none">자재구매 관리 시스템</h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">Material Purchasing System</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user.role === "admin" && (
              <div className="flex space-x-1 border border-slate-200 bg-slate-50 p-1 rounded-xl">
                <button
                  onClick={() => setView("categories")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    view === "categories" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>카테고리 관리</span>
                </button>
                <button
                  onClick={() => setView("passwords")}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    view === "passwords" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>비밀번호 및 구글 연동</span>
                </button>
              </div>
            )}

            <div className="h-8 w-px bg-slate-200 mx-1" />

            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl uppercase tracking-wider">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  syncStatus === "syncing" ? "bg-amber-500 animate-pulse" :
                  syncStatus === "success" ? "bg-green-500 animate-pulse" :
                  syncStatus === "error" ? "bg-rose-500" : "bg-slate-300"
                }`}></span>
                <span>{syncMessage || (window.GOOGLE_SCRIPT_URL || gasUrl ? "구글 시트 연동 대기" : "로컬 오프라인 모드")}</span>
              </div>

              <button
                onClick={() => setUser(null)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-auto">
        <div className={user ? "w-full max-w-[1600px] mx-auto p-6" : ""}>
          {renderContent()}
        </div>
      </main>

      {user && (
        <footer className="bg-white border-t border-slate-200 py-6 text-center">
          <div className="max-w-[1600px] mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-400 font-medium tracking-tight">
            <p className="text-xs font-bold uppercase tracking-tight">© 2026 Material Purchasing Management System V1.0</p>
            <div className="flex items-center space-x-4 text-[10px] uppercase tracking-widest font-bold">
              <span className="flex items-center">
                <span className="w-1.5 h-1.5 rounded-full mr-2 bg-green-500 animate-pulse"></span>
                LocalStorage (Durable Offline Mode)
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>Local Offline Secure Connection</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

