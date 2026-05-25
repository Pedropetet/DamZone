import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/authService";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.register({ username, email, password });
      navigate("/", {
        state: { message: "Registratie geslaagd! Je kunt nu inloggen." },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registratie mislukt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex justify-center mt-8">
        <img src="/damzone logo.png" alt="DamZone logo" className="w-12 h-12" />
      </div>
      <Card className="max-w-md mx-auto mt-4 p-6">
        <h1 className="text-2xl font-bold mb-4">Registreren</h1>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <Label htmlFor="username" className="block text-sm font-medium mb-1">
                Gebruikersnaam
              </Label>
              <Input
                type="text"
                id="username"
                name="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Minimaal 3 tekens"
              />
            </div>
            <div>
              <Label htmlFor="email" className="block text-sm font-medium mb-1">
                E-mail
              </Label>
              <Input
                type="email"
                id="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Voer je e-mailadres in"
              />
            </div>
            <div>
              <Label htmlFor="password" className="block text-sm font-medium mb-1">
                Wachtwoord
              </Label>
              <Input
                type="password"
                id="password"
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimaal 8 tekens"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Registreren..." : "Registreer"}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Al een account?{" "}
              <Link to="/" className="text-blue-500 hover:underline">
                Log hier in
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
