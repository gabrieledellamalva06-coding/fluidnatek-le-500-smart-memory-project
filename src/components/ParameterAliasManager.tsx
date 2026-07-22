import { useEffect, useState } from "react";

import {
  getRegistryStatistics,
  registerParameter,
  saveRegistry
} from "../utils/parameterRegistry";

export default function ParameterAliasManager() {

  const [stats, setStats] = useState(getRegistryStatistics());

  const [parameter, setParameter] = useState("");

  const [alias, setAlias] = useState("");

  useEffect(() => {
    setStats(getRegistryStatistics());
  }, []);

  function addAlias() {

    if (!parameter.trim()) return;

    if (!alias.trim()) return;

    registerParameter(
      parameter,
      alias,
      1
    );

    saveRegistry();

    setStats(getRegistryStatistics());

    setAlias("");

  }

return (
  <div className="space-y-6">

    <h2 className="text-xl font-bold">
      Parameter Alias Manager
    </h2>

    <div className="space-y-2">

      <input
        value={parameter}
        onChange={(e) => setParameter(e.target.value)}
        placeholder="Parameter (es. voltage)"
        className="w-full rounded border p-2"
      />

      <input
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder="Alias (es. HV+)"
        className="w-full rounded border p-2"
      />

      <button
        onClick={addAlias}
        className="rounded bg-blue-600 px-4 py-2 text-white"
      >
        Add Alias
      </button>

    </div>

    <div className="space-y-4">

      {stats.map((item) => (

        <div
          key={item.parameter}
          className="rounded border p-3"
        >

          <h3 className="font-semibold">
            {item.parameter}
          </h3>

          <p>
            <strong>Aliases:</strong>{" "}
            {item.aliases.join(", ")}
          </p>

          <p>
            <strong>Samples:</strong>{" "}
            {item.samples}
          </p>

          <p>
            <strong>Average confidence:</strong>{" "}
            {item.averageConfidence.toFixed(2)}
          </p>

        </div>

      ))}

    </div>

  </div>
);

}