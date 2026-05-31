import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage =
    (location.state as { message?: string } | null)?.message ?? "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.login({ username, password });

      if (response.requiresTwoFactor) {
        navigate("/2fa", { state: { tempToken: response.tempToken } });
        return;
      }

      login(response.token, response.user);
      navigate("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inloggen mislukt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      {successMessage && (
        <p className="text-green-600 text-sm mb-3 px-2">{successMessage}</p>
      )}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Inloggen</h1>
          <img src="/damzone logo.png" alt="DamZone logo" className="w-10 h-10" />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div className="px-2">
              <Label htmlFor="username" className="block text-sm font-medium mb-1">
                Gebruikersnaam
              </Label>
              <Input
                type="text"
                id="username"
                name="username"
                required
                autoFocus
                tabIndex={1}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Voer je gebruikersnaam in"
              />
            </div>
            <div className="px-2">
              <Label htmlFor="password" className="block text-sm font-medium mb-1">
                Wachtwoord
              </Label>
              <Input
                type="password"
                id="password"
                name="password"
                required
                tabIndex={2}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Voer je wachtwoord in"
              />
            </div>

            {error && <p className="text-red-500 text-sm px-2">{error}</p>}

            <div className="px-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Inloggen..." : "Log in"}
              </Button>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              Nog geen account?{" "}
              <Link to="/register" className="text-blue-500 hover:underline">
                Registreer hier
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
