import { useEffect, useRef } from "react";
import { Card, Badge } from "../../../components/UI";
import { useLiveStreams } from "../../../context/LiveStreamsContext";

const LiveCandidateCard = ({ candidate, onClick }) => {
  const videoRef = useRef(null);
  const { getStream } = useLiveStreams();

  useEffect(() => {
    const stream = getStream(candidate.attemptId);
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [candidate.attemptId]);

  const severity =
    candidate.integrityScore < 60
      ? "danger"
      : candidate.integrityScore < 80
      ? "warning"
      : "success";

  return (
    <Card
      className="p-4 cursor-pointer hover:border-blue-500 transition"
      onClick={onClick}
    >
      {/* VIDEO */}
      <div className="relative mb-3 rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-40 object-cover"
        />
        <span className="absolute top-2 left-2 bg-red-600 text-xs px-2 py-0.5 rounded">
          LIVE
        </span>
      </div>

      {/* INFO */}
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold">{candidate.candidateName}</p>
          <p className="text-xs text-slate-400">
            {candidate.candidateEmail}
          </p>
        </div>
        <Badge risk={severity}>{candidate.integrityScore}%</Badge>
      </div>

      <div className="mt-2 text-xs text-slate-400">
        <p>{candidate.testTitle}</p>
        <p>Violations: {candidate.violationCount}</p>
      </div>
    </Card>
  );
};

export default LiveCandidateCard;
