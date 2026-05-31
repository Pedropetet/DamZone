import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { adminService, type AdminGame } from "@/services/adminService";

const STATUS_LABEL: Record<string, string> = {
  waiting: "Wachten",
  in_progress: "Bezig",
  finished: "Afgelopen",
  abandoned: "Verlaten",
};

const STATUS_COLOR: Record<string, string> = {
  waiting: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  finished: "bg-green-100 text-green-700",
  abandoned: "bg-gray-100 text-gray-500",
};

function getWinner(game: AdminGame): string {
  if (game.status === "abandoned") return "Geen winnaar";
  if (!game.winnerId) return game.status === "finished" ? "Gelijkspel" : "—";
  return game.players.find((p) => p.userId === game.winnerId)?.username ?? "Onbekend";
}

export function AdminGames() {
  const { token } = useAuth();
  const [games, setGames] = useState<AdminGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    adminService
      .getGames(token)
      .then(setGames)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="text-sm text-muted-foreground">Laden...</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Spellen ({games.length})</h2>

      {games.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog geen spellen gespeeld.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-6 font-medium">ID</th>
                <th className="pb-2 pr-6 font-medium">Status</th>
                <th className="pb-2 pr-6 font-medium">Spelers</th>
                <th className="pb-2 pr-6 font-medium">Winnaar</th>
                <th className="pb-2 pr-6 font-medium">Gestart</th>
                <th className="pb-2 font-medium">Aangemaakt</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.id} className="border-b hover:bg-muted/20">
                  <td className="py-3 pr-6 font-mono text-xs text-muted-foreground">
                    {game.id.slice(0, 8)}…
                  </td>
                  <td className="py-3 pr-6">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        STATUS_COLOR[game.status] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {STATUS_LABEL[game.status] ?? game.status}
                    </span>
                  </td>
                  <td className="py-3 pr-6">
                    {game.players.length > 0
                      ? game.players
                          .map((p) => `${p.username} (${p.color === "white" ? "⚪" : "⚫"})`)
                          .join(" vs ")
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-3 pr-6 text-muted-foreground">
                    {getWinner(game)}
                  </td>
                  <td className="py-3 pr-6 text-muted-foreground">
                    {game.startedAt
                      ? new Date(game.startedAt).toLocaleDateString("nl-NL")
                      : "—"}
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {new Date(game.createdAt).toLocaleDateString("nl-NL")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
