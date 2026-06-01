import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { twoFactorService } from "@/services/twoFactorService";

type TwoFactorStep = "idle" | "scanning" | "done";

export function TwoFactorSettings() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState<boolean | null>(null);
  const [step, setStep] = useState<TwoFactorStep>("idle");
  const [qrCode, setQrCode] = useState("");
  const [tfCode, setTfCode] = useState("");
  const [tfError, setTfError] = useState("");
  const [tfSuccess, setTfSuccess] = useState("");
  const [tfLoading, setTfLoading] = useState(false);

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
    setTfError("");
    setTfLoading(true);
    try {
      const result = await twoFactorService.setup(token!);
      setQrCode(result.qrCode);
      setStep("scanning");
    } catch (err) {
      setTfError(err instanceof Error ? err.message : "Fout bij setup");
    } finally {
      setTfLoading(false);
    }
  }

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setTfError("");
    setTfLoading(true);
    try {
      await twoFactorService.enable(tfCode, token!);
      setIsTwoFactorEnabled(true);
      setStep("done");
      setTfSuccess("2FA is succesvol ingeschakeld.");
      setTfCode("");
    } catch (err) {
      setTfError(err instanceof Error ? err.message : "Activering mislukt");
      setTfCode("");
    } finally {
      setTfLoading(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setTfError("");
    setTfLoading(true);
    try {
      await twoFactorService.disable(tfCode, token!);
      setIsTwoFactorEnabled(false);
      setStep("idle");
      setTfSuccess("2FA is uitgeschakeld.");
      setTfCode("");
    } catch (err) {
      setTfError(err instanceof Error ? err.message : "Uitschakelen mislukt");
      setTfCode("");
    } finally {
      setTfLoading(false);
    }
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4">Tweestapsverificatie (2FA)</h2>

        {isTwoFactorEnabled === null && (
          <p className="text-sm text-muted-foreground">Laden...</p>
        )}

        {tfSuccess && (
          <p className="text-green-600 text-sm mb-4">{tfSuccess}</p>
        )}

        {isTwoFactorEnabled === false && step === "idle" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              2FA is <strong>uitgeschakeld</strong>. Schakel het in voor extra beveiliging.
            </p>
            <Button onClick={handleSetup} disabled={tfLoading} className="w-full">
              {tfLoading ? "Bezig..." : "2FA inschakelen"}
            </Button>
          </div>
        )}

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
                  value={tfCode}
                  onChange={(e) => setTfCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="text-center text-xl tracking-widest"
                />
              </div>
              {tfError && <p className="text-red-500 text-sm">{tfError}</p>}
              <Button type="submit" disabled={tfLoading || tfCode.length !== 6} className="w-full">
                {tfLoading ? "Verifiëren..." : "Activeer 2FA"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setStep("idle"); setTfCode(""); setTfError(""); setQrCode(""); }}
              >
                Annuleer
              </Button>
            </form>
          </div>
        )}

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
                  value={tfCode}
                  onChange={(e) => setTfCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="text-center text-xl tracking-widest"
                />
              </div>
              {tfError && <p className="text-red-500 text-sm">{tfError}</p>}
              <Button
                type="submit"
                variant="destructive"
                disabled={tfLoading || tfCode.length !== 6}
                className="w-full"
              >
                {tfLoading ? "Bezig..." : "2FA uitschakelen"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
