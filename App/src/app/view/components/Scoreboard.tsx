import { HighScore } from "../types";

interface ScoreboardProps {
  highScores: HighScore[];
}

export function Scoreboard({ highScores }: ScoreboardProps) {
  return (
    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white min-w-[200px]">
      <h2 className="text-lg font-bold mb-3 text-center border-b border-white/20 pb-2">
        🏆 High Scores
      </h2>
      <div className="space-y-2">
        {highScores.length === 0 ? (
          <p className="text-sm text-gray-400 text-center italic">
            No scores yet
          </p>
        ) : (
          highScores.map((score, index) => (
            <div
              key={`${score.name}-${score.timestamp}`}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400 font-bold w-6">
                  #{index + 1}
                </span>
                <span className="font-medium truncate max-w-[100px]">
                  {score.name}
                </span>
                {score.isActive && (
                  <span className="text-green-400 text-xs">●</span>
                )}
              </div>
              <span className="text-green-400 font-bold">
                {score.score}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 