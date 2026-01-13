import { useEffect, useRef, useState } from "react";
import { Card, Badge } from "../../../components/UI";
import socket from "../../../services/socket";

const LiveMonitor = ({ attemptId }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!attemptId) return;

    // 1. Initialize PeerConnection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    // 2. Handle Incoming Stream
    pc.ontrack = (event) => {
      console.log("Stream received!");
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
        setConnected(true);
      }
    };

    // 3. Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc:ice", {
          attemptId,
          candidate: event.candidate,
        });
      }
    };

    // 4. Join Room & Signal Ready
    // FIX: Key must match backend expectations ({ attemptId })
    socket.emit("admin:join", { attemptId }); 

    // 5. Socket Listeners
    socket.on("webrtc:offer", async (offer) => {
      console.log("Received Offer");
      try {
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", { attemptId, answer });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    });

    socket.on("webrtc:ice", (candidate) => {
      pc.addIceCandidate(candidate).catch((e) => console.error(e));
    });

    return () => {
      pc.close();
      socket.off("webrtc:offer");
      socket.off("webrtc:ice");
      // Optional: Leave room
    };
  }, [attemptId]);

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
          muted // Admin usually mutes audio to prevent feedback loop
          className="w-full h-full object-cover"
        />
        {!connected && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
            Waiting for candidate stream...
          </div>
        )}
      </div>
    </Card>
  );
};

export default LiveMonitor;
