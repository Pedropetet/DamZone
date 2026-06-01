import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";

type Section = "username" | "email" | "password";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "username", label: "Gebruikersnaam" },
  { key: "email", label: "E-mail" },
  { key: "password", label: "Wachtwoord" },
];

export function AccountSettings() {
  const { token, updateUser } = useAuth();
  const [section, setSection] = useState<Section>("username");

  const [usernameForm, setUsernameForm] = useState({ value: "", password: "", error: "", success: "", loading: false });
  const [emailForm, setEmailForm] = useState({ value: "", password: "", error: "", success: "", loading: false });
  const [passwordForm, setPasswordForm] = useState({ current: "", newPw: "", confirm: "", error: "", success: "", loading: false });

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUsernameForm((f) => ({ ...f, error: "", success: "", loading: true }));
    try {
      const res = await authService.updateProfile({ username: usernameForm.value, currentPassword: usernameForm.password }, token!);
      updateUser({ username: res.user.username });
      setUsernameForm({ value: "", password: "", error: "", success: "Gebruikersnaam gewijzigd.", loading: false });
    } catch (err) {
      setUsernameForm((f) => ({ ...f, error: err instanceof Error ? err.message : "Fout bij wijzigen", loading: false }));
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailForm((f) => ({ ...f, error: "", success: "", loading: true }));
    try {
      await authService.updateProfile({ email: emailForm.value, currentPassword: emailForm.password }, token!);
      setEmailForm({ value: "", password: "", error: "", success: "E-mailadres gewijzigd.", loading: false });
    } catch (err) {
      setEmailForm((f) => ({ ...f, error: err instanceof Error ? err.message : "Fout bij wijzigen", loading: false }));
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.newPw !== passwordForm.confirm) {
      setPasswordForm((f) => ({ ...f, error: "Wachtwoorden komen niet overeen" }));
      return;
    }
    setPasswordForm((f) => ({ ...f, error: "", success: "", loading: true }));
    try {
      await authService.updateProfile({ newPassword: passwordForm.newPw, currentPassword: passwordForm.current }, token!);
      setPasswordForm({ current: "", newPw: "", confirm: "", error: "", success: "Wachtwoord gewijzigd.", loading: false });
    } catch (err) {
      setPasswordForm((f) => ({ ...f, error: err instanceof Error ? err.message : "Fout bij wijzigen", loading: false }));
    }
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4">Account</h2>

        <div className="flex gap-2 mb-6">
          {SECTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                section === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {section === "username" && (
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            {usernameForm.success && <p className="text-green-600 text-sm">{usernameForm.success}</p>}
            {usernameForm.error && <p className="text-red-500 text-sm">{usernameForm.error}</p>}
            <div>
              <Label htmlFor="new-username" className="block text-sm mb-1">Nieuwe gebruikersnaam</Label>
              <Input
                id="new-username"
                type="text"
                required
                value={usernameForm.value}
                onChange={(e) => setUsernameForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="username-pw" className="block text-sm mb-1">Huidig wachtwoord</Label>
              <Input
                id="username-pw"
                type="password"
                required
                value={usernameForm.password}
                onChange={(e) => setUsernameForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={usernameForm.loading}>
              {usernameForm.loading ? "Bezig..." : "Opslaan"}
            </Button>
          </form>
        )}

        {section === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {emailForm.success && <p className="text-green-600 text-sm">{emailForm.success}</p>}
            {emailForm.error && <p className="text-red-500 text-sm">{emailForm.error}</p>}
            <div>
              <Label htmlFor="new-email" className="block text-sm mb-1">Nieuw e-mailadres</Label>
              <Input
                id="new-email"
                type="email"
                required
                value={emailForm.value}
                onChange={(e) => setEmailForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email-pw" className="block text-sm mb-1">Huidig wachtwoord</Label>
              <Input
                id="email-pw"
                type="password"
                required
                value={emailForm.password}
                onChange={(e) => setEmailForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={emailForm.loading}>
              {emailForm.loading ? "Bezig..." : "Opslaan"}
            </Button>
          </form>
        )}

        {section === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordForm.success && <p className="text-green-600 text-sm">{passwordForm.success}</p>}
            {passwordForm.error && <p className="text-red-500 text-sm">{passwordForm.error}</p>}
            <div>
              <Label htmlFor="current-pw" className="block text-sm mb-1">Huidig wachtwoord</Label>
              <Input
                id="current-pw"
                type="password"
                required
                value={passwordForm.current}
                onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="new-pw" className="block text-sm mb-1">Nieuw wachtwoord</Label>
              <Input
                id="new-pw"
                type="password"
                required
                minLength={8}
                value={passwordForm.newPw}
                onChange={(e) => setPasswordForm((f) => ({ ...f, newPw: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="confirm-pw" className="block text-sm mb-1">Bevestig nieuw wachtwoord</Label>
              <Input
                id="confirm-pw"
                type="password"
                required
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={passwordForm.loading}>
              {passwordForm.loading ? "Bezig..." : "Opslaan"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
