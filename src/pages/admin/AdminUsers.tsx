import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { adminService, type AdminUser } from "@/services/adminService";
import { Button } from "@/components/ui/button";

export function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    adminService
      .getUsers(token)
      .then(setUsers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleRoleChange(userId: string, newRole: "player" | "admin") {
    setUpdating(userId);
    try {
      const result = await adminService.updateUserRole(userId, newRole, token!);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: result.user.role } : u))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Fout bij rolwijziging");
    } finally {
      setUpdating(null);
    }
  }

  async function handleDelete(userId: string, username: string) {
    if (!confirm(`Gebruiker "${username}" definitief verwijderen?`)) return;
    try {
      await adminService.deleteUser(userId, token!);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Fout bij verwijderen");
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Laden...</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Gebruikers ({users.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-6 font-medium">Gebruikersnaam</th>
              <th className="pb-2 pr-6 font-medium">E-mail</th>
              <th className="pb-2 pr-6 font-medium">Rol</th>
              <th className="pb-2 pr-6 font-medium">2FA</th>
              <th className="pb-2 pr-6 font-medium">Aangemaakt</th>
              <th className="pb-2 font-medium">Acties</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-muted/20">
                <td className="py-3 pr-6 font-medium">{user.username}</td>
                <td className="py-3 pr-6 text-muted-foreground">{user.email}</td>
                <td className="py-3 pr-6">
                  <select
                    value={user.role}
                    disabled={updating === user.id}
                    onChange={(e) =>
                      handleRoleChange(user.id, e.target.value as "player" | "admin")
                    }
                    className="border rounded px-2 py-1 text-sm bg-background disabled:opacity-50"
                  >
                    <option value="player">Speler</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="py-3 pr-6">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.isTwoFactorEnabled
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {user.isTwoFactorEnabled ? "Aan" : "Uit"}
                  </span>
                </td>
                <td className="py-3 pr-6 text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString("nl-NL")}
                </td>
                <td className="py-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={updating === user.id}
                    onClick={() => handleDelete(user.id, user.username)}
                  >
                    Verwijderen
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
