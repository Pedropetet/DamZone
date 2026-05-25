import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { adminService } from "@/services/adminService";
import { AdminUsers } from "./AdminUsers";
import { AdminGames } from "./AdminGames";

type Tab = "overview" | "users" | "games";

interface Stats {
  totalUsers: number;
  totalGames: number;
  activeGames: number;
}

export default function AdminDashboard() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      adminService.getUsers(token),
      adminService.getGames(token),
      fetch("/api/games/active-count", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json() as Promise<{ count: number }>),
    ])
      .then(([users, games, activeData]) => {
        setStats({
          totalUsers: users.length,
          totalGames: games.length,
          activeGames: activeData.count,
        });
      })
      .catch(() => {});
  }, [token]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-muted/10">
      {/* Topbalk */}
      <header className="border-b bg-background px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/damzone logo.png" alt="DamZone" className="w-8 h-8" />
          <span className="font-bold text-lg">DamZone Admin</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Ingelogd als <strong>{user?.username}</strong>
          </span>
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
        {/* Tabbladbalk */}
        <div className="flex gap-1 mb-8 border-b">
          {(["overview", "users", "games"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "overview" && "Overzicht"}
              {tab === "users" && "Gebruikers"}
              {tab === "games" && "Spellen"}
            </button>
          ))}
        </div>

        {/* Overzicht-tab */}
        {activeTab === "overview" && (
          <div>
            <h1 className="text-2xl font-bold mb-6">Overzicht</h1>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard
                label="Totaal gebruikers"
                value={stats?.totalUsers ?? "—"}
              />
              <StatCard
                label="Totaal spellen"
                value={stats?.totalGames ?? "—"}
              />
              <StatCard
                label="Actieve spellen"
                value={stats?.activeGames ?? "—"}
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab("users")}
                className="text-sm text-blue-500 hover:underline"
              >
                Gebruikers beheren →
              </button>
              <button
                onClick={() => setActiveTab("games")}
                className="text-sm text-blue-500 hover:underline"
              >
                Spellen bekijken →
              </button>
            </div>
          </div>
        )}

        {/* Gebruikers-tab */}
        {activeTab === "users" && <AdminUsers />}

        {/* Spellen-tab */}
        {activeTab === "games" && <AdminGames />}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border bg-background p-5">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
