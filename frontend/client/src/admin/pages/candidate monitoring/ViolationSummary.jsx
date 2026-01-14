import { Card } from "../../../components/UI";

const VIOLATION_CONFIG = {
  multiple_faces: {
    label: "Multiple Faces Detected",
    color: "text-red-400",
    bar: "bg-red-500",
  },
  face_not_detected: {
    label: "Face Not Visible",
    color: "text-amber-400",
    bar: "bg-amber-500",
  },
  tab_switch: {
    label: "Tab Switch",
    color: "text-orange-400",
    bar: "bg-orange-500",
  },
  window_blur: {
    label: "Window Blur",
    color: "text-orange-400",
    bar: "bg-orange-500",
  },
  fullscreen_exit: {
    label: "Fullscreen Exit",
    color: "text-red-400",
    bar: "bg-red-500",
  },
  copy_attempt: {
    label: "Copy Attempt",
    color: "text-yellow-400",
    bar: "bg-yellow-500",
  },
  paste_attempt: {
    label: "Paste Attempt",
    color: "text-yellow-400",
    bar: "bg-yellow-500",
  },
  devtools_detected: {
    label: "DevTools Detected",
    color: "text-red-400",
    bar: "bg-red-500",
  },
};

const ViolationSummary = ({ violations = [] }) => {
  const counts = violations.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1;
    return acc;
  }, {});

  const total = violations.length;

  const entries = Object.entries(counts)
    .map(([type, count]) => ({
      type,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">Violation Summary</h3>
        <span className="text-xs text-slate-500">
          Total Violations: <b className="text-white">{total}</b>
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">
          No violations recorded for this attempt.
        </p>
      ) : (
        <div className="space-y-4">
          {entries.map(({ type, count, percent }) => {
            const cfg = VIOLATION_CONFIG[type] || {
              label: type,
              color: "text-slate-300",
              bar: "bg-slate-600",
            };

            return (
              <div key={type}>
                {/* Row */}
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-sm font-semibold ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {count}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${cfg.bar}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-500 mt-1">
                  {percent}% of total violations
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default ViolationSummary;

