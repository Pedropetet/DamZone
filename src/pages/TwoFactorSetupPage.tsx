import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { twoFactorService } from "@/services/twoFactorService";

type Step = "idle" | "scanning" | "done";

export default function TwoFactorSetupPage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    authService.me(token).then((profile) => {
      setIsTwoFactorEnabled(profile.isTwoFactorEnabled);
    }).catch(() => {
      logout();
      navigate("/");
    });
  }, [token, logout, navigate]);

  async function handleSetup() {
    setError("");
    setLoading(true);
    try {
      const result = await twoFactorService.setup(token!);
      setQrCode(result.qrCode);
      setStep("scanning");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fout bij setup");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await twoFactorService.enable(code, token!);
      setIsTwoFactorEnabled(true);
      setStep("done");
      setSuccess("2FA is succesvol ingeschakeld.");
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activering mislukt");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await twoFactorService.disable(code, token!);
      setIsTwoFactorEnabled(false);
      setStep("idle");
      setSuccess("2FA is uitgeschakeld.");
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Uitschakelen mislukt");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="sticky top-0 z-10 border-b bg-background px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/damzone logo.png" alt="DamZone" className="w-8 h-8" />
          <span className="font-bold text-lg">DamZone</span>
          <span className="text-muted-foreground text-sm">Instellingen</span>
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

      <div className="flex-1 overflow-y-auto flex justify-center pt-8 px-4">
        <div className="w-full max-w-md">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Tweestapsverificatie (2FA)</h2>

            {isTwoFactorEnabled === null && (
              <p className="text-sm text-muted-foreground">Laden...</p>
            )}

            {success && (
              <p className="text-green-600 text-sm mb-4">{success}</p>
            )}

            {/* 2FA is uitgeschakeld — activeer flow */}
            {isTwoFactorEnabled === false && step === "idle" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  2FA is <strong>uitgeschakeld</strong>. Schakel het in voor extra beveiliging.
                </p>
                <Button onClick={handleSetup} disabled={loading} className="w-full">
                  {loading ? "Bezig..." : "2FA inschakelen"}
                </Button>
              </div>
            )}

            {/* QR-code scannen */}
            {step === "scanning" && (
              <div className="space-y-4">
                <p className="text-sm">
                  Scan de QR-code met <strong>Google Authenticator</strong>, <strong>Authy</strong> of een andere authenticator-app.
                </p>
                {qrCode && (
                  <div className="flex justify-center">
                    <img src={qrCode} alt="2FA QR-code" className="w-48 h-48 border rounded" />
                  </div>
                )}
                <form onSubmit={handleEnable} className="space-y-3">
                  <div>
                    <Label htmlFor="enable-code" className="block text-sm font-medium mb-1">
                      Bevestig met code uit de app
                    </Label>
                    <Input
                      type="text"
                      id="enable-code"
                      required
                      autoFocus
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="text-center text-xl tracking-widest"
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <Button type="submit" disabled={loading || code.length !== 6} className="w-full">
                    {loading ? "Verifiëren..." : "Activeer 2FA"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => { setStep("idle"); setCode(""); setError(""); setQrCode(""); }}
                  >
                    Annuleer
                  </Button>
                </form>
              </div>
            )}

            {/* 2FA is ingeschakeld — uitschakelflow */}
            {isTwoFactorEnabled === true && step !== "scanning" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  2FA is <strong>ingeschakeld</strong>.
                </p>
                <form onSubmit={handleDisable} className="space-y-3">
                  <div>
                    <Label htmlFor="disable-code" className="block text-sm font-medium mb-1">
                      Voer je authenticator-code in om 2FA uit te schakelen
                    </Label>
                    <Input
                      type="text"
                      id="disable-code"
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="text-center text-xl tracking-widest"
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={loading || code.length !== 6}
                    className="w-full"
                  >
                    {loading ? "Bezig..." : "2FA uitschakelen"}
                  </Button>
                </form>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
