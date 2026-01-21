import React from "react";

const FaceAlignmentOverlay = ({ status, showOverlay = true }) => {
  if (!showOverlay || !status) return null;

  const {
    isDetected,
    isMultiple,
    isCentered,
    isAligned,
    boundingBox,
    message,
    isMatch,
  } = status;

  if (!isDetected) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-black/60 text-white px-4 py-2 rounded-lg font-medium backdrop-blur-sm border border-white/10">
          {message || "No Face Detected"}
        </div>
      </div>
    );
  }

  if (isMultiple) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none border-4 border-red-500/50">
        <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
          Multiple Faces Detected
        </div>
      </div>
    );
  }

  // Status-based Styling
  // isMatch check: if strictly false (not null/undefined), fail it
  const matchFailed = isMatch === false;
  const isGood = isCentered && isAligned && !matchFailed;

  let borderColor = isGood ? "border-emerald-500" : "border-amber-400";
  let textColor = isGood ? "text-emerald-400" : "text-amber-400";
  let bgColor = isGood ? "bg-emerald-500/10" : "bg-amber-500/10";

  if (matchFailed) {
    borderColor = "border-red-500";
    textColor = "text-red-500";
    bgColor = "bg-red-500/10";
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 
        The Guide Box representing the "Safe Zone" 
        (30%-70% width, 20%-80% height)
      */}
      <div
        className={`absolute top-[20%] left-[30%] w-[40%] h-[60%] border-2 border-dashed ${
          isCentered ? "border-emerald-500/50" : "border-white/20"
        } rounded-xl transition-colors duration-300`}
      >
        {!isCentered && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0">
            {/* Empty guide center */}
          </div>
        )}
      </div>

      {/* Central Feedback Message */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
        <div
          className={`px-4 py-2 rounded-full font-bold backdrop-blur-md border shadow-lg transition-all transform duration-300 ${textColor} ${borderColor} ${bgColor}`}
        >
          {message || (isGood ? "Perfect" : "Adjust Position")}
        </div>
      </div>
    </div>
  );
};

export default FaceAlignmentOverlay;
