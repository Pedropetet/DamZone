import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AccountSettings } from "./AccountSettings";
import { TwoFactorSettings } from "./TwoFactorSettings";

type Tab = "account" | "2fa";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("account");

  useEffect(() => { window.scrollTo(0, 0); }, []);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <header className="sticky top-0 z-10 border-b bg-background px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/damzone logo.png" alt="DamZone" className="w-8 h-8" />
          <span className="font-bold text-lg">DamZone</span>
          <span className="text-muted-foreground text-sm">Instellingen</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Ingelogd als <strong>{user?.username}</strong>
          </span>
          {user?.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="text-amber-600 hover:underline font-medium"
            >
              Admin
            </button>
          )}
          <button
            onClick={() => navigate("/home")}
            className="text-blue-500 hover:underline"
          >
            Naar lobby
          </button>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:underline"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-1 mb-8 border-b">
          {(["account", "2fa"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "account" ? "Account" : "2FA"}
            </button>
          ))}
        </div>

        {activeTab === "account" && <AccountSettings />}
        {activeTab === "2fa" && <TwoFactorSettings />}
      </div>
    </div>
  );
}
