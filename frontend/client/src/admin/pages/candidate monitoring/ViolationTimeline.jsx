import { useEffect, useState } from "react";
import socket from "../../../services/socket";
import { Card } from "../../../components/UI";

const ViolationTimeline = ({ violations: initial }) => {
  const [violations, setViolations] = useState(initial || []);

  useEffect(() => {
    const handler = ({ violation }) => {
      setViolations((prev) => [...prev, violation]); // append to end (timeline)
    };

    socket.on("admin:violation", handler);
    return () => socket.off("admin:violation", handler);
  }, []);

  return (
    <Card className="p-6">
      <h3 className="font-bold mb-4">Violation Timeline</h3>

      {violations.length === 0 ? (
        <p className="text-slate-400 text-sm">
          No violations recorded
        </p>
      ) : (
        <div className="relative">
          {/* Timeline rail */}
          <div className="absolute top-10 left-0 right-0 h-[2px] bg-slate-800" />

          {/* Scroll container */}
          <div className="flex gap-6 overflow-x-auto pb-4 pt-2 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            {violations.map((v, i) => (
              <div
                key={i}
                className="relative min-w-[220px] bg-slate-900 border border-slate-800 rounded-xl p-4"
              >
                {/* Dot */}
                <div className="absolute -top-3 left-4 w-3 h-3 rounded-full bg-red-500 shadow-md" />

                {/* Content */}
                <p className="text-xs font-black uppercase tracking-wider text-red-400">
                  {v.type.replaceAll("_", " ")}
                </p>

                <p className="text-[10px] text-slate-500 mt-1">
                  {new Date(v.timestamp).toLocaleString()}
                </p>

                {v.metadata?.image && (
                  <img
                    src={v.metadata.image}
                    alt="snapshot"
                    className="mt-3 rounded-lg w-full object-cover border border-slate-800"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ViolationTimeline;


