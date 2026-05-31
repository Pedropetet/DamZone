import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { twoFactorService } from "@/services/twoFactorService";

export default function TwoFactorVerifyPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tempToken =
    (location.state as { tempToken?: string } | null)?.tempToken ?? "";

  if (!tempToken) {
    navigate("/", { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await twoFactorService.verify(tempToken, code);
      login(response.token, response.user);
      navigate("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verificatie mislukt");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Tweestapsverificatie</h1>
          <img src="/damzone logo.png" alt="DamZone logo" className="w-10 h-10" />
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Voer de 6-cijferige code uit je authenticator-app in.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div className="px-2">
              <Label htmlFor="code" className="block text-sm font-medium mb-1">
                Verificatiecode
              </Label>
              <Input
                type="text"
                id="code"
                required
                autoFocus
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest"
              />
            </div>

            {error && <p className="text-red-500 text-sm px-2">{error}</p>}

            <div className="px-2">
              <Button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full"
                size="lg"
              >
                {loading ? "Verifiëren..." : "Bevestig"}
              </Button>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              <button
                type="button"
                className="text-blue-500 hover:underline"
                onClick={() => navigate("/", { replace: true })}
              >
                Terug naar inloggen
              </button>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
