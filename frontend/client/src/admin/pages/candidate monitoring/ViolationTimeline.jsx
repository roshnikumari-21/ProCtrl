import { Card } from "../../../components/UI";

const severityColor = {
  low: "text-slate-300",
  medium: "text-yellow-400",
  high: "text-red-400",
};

const ViolationTimeline = ({ violations }) => {
  if (!violations || violations.length === 0) {
    return (
      <Card className="p-6 text-center text-slate-400">
        No violations recorded
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <h3 className="font-bold text-lg">
        Violation Timeline
      </h3>

      <div className="space-y-3">
        {violations.map((v, index) => (
          <div
            key={index}
            className="border border-slate-800 rounded p-4"
          >
            <div className="flex justify-between">
              <p
                className={`font-semibold ${
                  severityColor[v.severity]
                }`}
              >
                {v.type}
              </p>

              <p className="text-xs text-slate-400">
                {new Date(v.timestamp).toLocaleTimeString()}
              </p>
            </div>

            <p className="text-sm text-slate-400 mt-1">
              Severity: {v.severity.toUpperCase()} ·
              Confidence: {Math.round(v.confidence * 100)}%
            </p>

            {v.details && (
              <p className="text-sm mt-2">
                {v.details}
              </p>
            )}

            {v.snapshot && (
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-1">
                  Evidence Snapshot
                </p>
                <img
                  src={v.snapshot}
                  alt="Violation snapshot"
                  className="rounded border border-slate-700 max-w-xs"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ViolationTimeline;
