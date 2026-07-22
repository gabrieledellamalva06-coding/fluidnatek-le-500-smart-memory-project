import { getRegistryStatistics } from "../utils/parameterRegistry";

export default function ParameterLearningPanel() {
  const stats = getRegistryStatistics();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">
        AI Parameter Learning
      </h2>

      {stats.length === 0 ? (
        <p className="text-gray-500">
          No parameters learned yet.
        </p>
      ) : (
        <div className="space-y-4">
          {stats.map((item) => (
            <div
              key={item.parameter}
              className="rounded-lg border p-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">
                  {item.parameter}
                </h3>

                <span className="text-sm text-gray-500">
                  {item.samples} samples
                </span>
              </div>

              <div className="mt-2 text-sm text-gray-600">
                Average confidence:{" "}
                {(item.averageConfidence * 100).toFixed(1)}%
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {item.aliases.map((alias) => (
                  <span
                    key={alias}
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm"
                  >
                    {alias}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}