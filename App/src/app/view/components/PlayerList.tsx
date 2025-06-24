interface PlayerListProps {
  players: string[];
  isConnected: boolean;
}

export function PlayerList({ players, isConnected }: PlayerListProps) {
  return (
    <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-4 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Players ({players.length})</h3>
      {!isConnected && (
        <p className="text-red-400 text-sm">Disconnected from server</p>
      )}
      {players.length === 0 ? (
        <p className="text-gray-400 text-sm">No players joined</p>
      ) : (
        <ul className="space-y-1">
          {players.map((player, index) => (
            <li key={index} className="text-sm">
              {player}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 