/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { UserRole, PurchaseRequest, PurchaseItem } from "./types";
import { initialCategories, Category } from "./data/categories";
import { initialRequests } from "./data/initialRequests";
import { getAllRequests, saveRequests, saveRequest as dbSaveRequest, deleteRequests as dbDeleteRequests } from "./utils/db";

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

  // 4. Purchase Requests Data (persistent in Firestore)
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load requests once user logs in with password
  useEffect(() => {
    if (!user) return;

    const loadRequests = async () => {
      setIsLoaded(false);
      try {
        const savedRequests = await getAllRequests();
        if (savedRequests && savedRequests.length > 0) {
          setRequests(savedRequests);
        } else {
          // If the Firestore is empty, populate it with initialRequests!
          setRequests(initialRequests);
          await saveRequests(initialRequests);
        }
      } catch (err) {
        console.error("Failed to load requests from Firestore:", err);
        setRequests(initialRequests);
      } finally {
        setIsLoaded(true);
      }
    };

    loadRequests();
  }, [user]);

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
    
    try {
      await dbSaveRequest(targetReq);
      setRequests(updatedRequests);
    } catch (e) {
      console.error("Storage error:", e);
      alert("⚠️ 데이터 저장 중 오류가 발생했습니다. 브라우저 저장 공간을 확인해 주세요.");
    }
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
    try {
      await saveRequests(updated);
      setRequests(updated);
    } catch (e) {
      console.error("Storage error during import:", e);
      alert("⚠️ 용량 초과 또는 저장 오류로 인해 엑셀 데이터를 불러올 수 없습니다.");
    }
  };

  // Helper: Delete Requests
  const handleDeleteRequests = async (ids: string[]) => {
    try {
      await dbDeleteRequests(ids);
      const updated = requests.filter(r => !ids.includes(r.id));
      setRequests(updated);
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  // Helper: Delete Item
  const handleDeleteItem = async (requestId: string, itemIndex: number) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    const newItems = req.items.filter((_, idx) => idx !== itemIndex);
    const updatedReq = { ...req, items: newItems };
    
    try {
      await dbSaveRequest(updatedReq);
      const updated = requests.map(r => r.id === requestId ? updatedReq : r);
      setRequests(updated);
    } catch (e) {
      console.error("Update item error:", e);
    }
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
            <div className="flex space-x-1 border border-slate-200 bg-slate-50 p-1 rounded-xl">
              <button
                onClick={() => { setView("dashboard"); setSelectedRequest(null); }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  view === "dashboard" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>대시보드</span>
              </button>

              {user.role === "admin" && (
                <>
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
                    <span>비밀번호 관리</span>
                  </button>
                </>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200 mx-1" />

            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span>클라우드 동기화 완료</span>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  user.role === "admin" ? "bg-red-50 text-red-700 border border-red-100" :
                  user.role === "결재자" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                  "bg-blue-50 text-blue-700 border border-blue-100"
                }`}>
                  {user.role}
                </span>
                {user.username && user.username !== user.role && (
                  <p className="text-xs font-bold text-slate-700 mt-0.5">{user.username}</p>
                )}
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
                Firebase Cloud Database (Durable Mode)
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>Real-time Secure Connection</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

