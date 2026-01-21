import { useEffect, useRef, useState } from "react";
import { Card, Badge } from "../../../components/UI";
import socket from "../../../services/socket";
import { useLiveStreams } from "../../../context/LiveStreamsContext";

const LiveMonitor = ({ attemptId }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // 🔴 IMPORTANT: get registerStream from context
  const { registerStream } = useLiveStreams();

  useEffect(() => {
    if (!attemptId) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    /* ===============================
       RECEIVE STREAM FROM CANDIDATE
    =============================== */
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      console.log("🎥 Stream received for attempt:", attemptId);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // ✅ REGISTER STREAM GLOBALLY
      registerStream(attemptId, stream);

      setConnected(true);
    };

    /* ===============================
       ICE CANDIDATES (ADMIN → SERVER)
    =============================== */
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:ice", {
          attemptId,
          candidate: event.candidate,
        });
      }
    };

    /* ===============================
       JOIN ADMIN ROOM
    =============================== */
    socket.emit("admin:join", { attemptId });

    /* ===============================
       RECEIVE OFFER FROM CANDIDATE
    =============================== */
    socket.on("webrtc:offer", async (offer) => {
      try {
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc:answer", { attemptId, answer });
      } catch (err) {
        console.error("Error handling WebRTC offer:", err);
      }
    });

    /* ===============================
       RECEIVE ICE FROM CANDIDATE
    =============================== */
    socket.on("webrtc:ice", (candidate) => {
      pc.addIceCandidate(candidate).catch((e) =>
        console.error("ICE error:", e)
      );
    });

    /* ===============================
       CLEANUP
    =============================== */
    return () => {
      try {
        pc.close();
      } catch {}

      socket.off("webrtc:offer");
      socket.off("webrtc:ice");
    };
  }, [attemptId, registerStream]);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">Live Camera Feed</h3>
        <Badge risk={connected ? "active" : "medium"}>
          {connected ? "LIVE" : "CONNECTING..."}
        </Badge>
      </div>

      <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {!connected && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
            Waiting for candidate stream…
          </div>
        )}
      </div>
    </Card>
  );
};

export default LiveMonitor;

