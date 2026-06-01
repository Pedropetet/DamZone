import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { adminService, type AdminUser } from "@/services/adminService";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface PendingRoleChange {
  userId: string;
  username: string;
  currentRole: "player" | "admin";
  newRole: "player" | "admin";
}

interface PendingDelete {
  id: string;
  username: string;
}

export function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<PendingRoleChange | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  useEffect(() => {
    if (!token) return;
    adminService
      .getUsers(token)
      .then(setUsers)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function confirmRoleChange() {
    if (!pendingRole) return;
    const { userId, newRole } = pendingRole;
    setPendingRole(null);
    setUpdating(userId);
    try {
      const result = await adminService.updateUserRole(userId, newRole, token!);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: result.user.role } : u))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout bij rolwijziging");
    } finally {
      setUpdating(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    setUpdating(id);
    try {
      await adminService.deleteUser(id, token!);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout bij verwijderen");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Laden...</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Gebruikers ({users.length})</h2>
      <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground sticky top-0 bg-background z-10">
              <th className="py-2 pr-6 font-medium text-center">Gebruikersnaam</th>
              <th className="py-2 pr-6 font-medium text-center">E-mail</th>
              <th className="py-2 pr-6 font-medium text-center">Rol</th>
              <th className="py-2 pr-6 font-medium text-center">2FA</th>
              <th className="py-2 pr-6 font-medium text-center">Aangemaakt</th>
              <th className="py-2 font-medium text-center">Acties</th>
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
                    onChange={(e) => {
                      const newRole = e.target.value as "player" | "admin";
                      if (newRole === user.role) return;
                      setPendingRole({ userId: user.id, username: user.username, currentRole: user.role, newRole });
                    }}
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
                    onClick={() => setPendingDelete({ id: user.id, username: user.username })}
                  >
                    Verwijderen
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rolwijziging bevestiging */}
      <Dialog open={!!pendingRole} onOpenChange={(open) => { if (!open) setPendingRole(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Rol wijzigen</DialogTitle>
            <DialogDescription>
              Wil je de rol van <strong>{pendingRole?.username}</strong> wijzigen van{" "}
              <strong>{pendingRole?.currentRole === "player" ? "Speler" : "Admin"}</strong> naar{" "}
              <strong>{pendingRole?.newRole === "player" ? "Speler" : "Admin"}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRole(null)}>Annuleren</Button>
            <Button onClick={confirmRoleChange}>Bevestigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verwijder bevestiging */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Gebruiker verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je <strong>{pendingDelete?.username}</strong> definitief wilt verwijderen?
              Deze actie kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Annuleren</Button>
            <Button variant="destructive" onClick={confirmDelete}>Verwijderen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
