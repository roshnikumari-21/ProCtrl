import { createContext, useContext, useRef } from "react";

const LiveStreamsContext = createContext(null);

export const LiveStreamsProvider = ({ children }) => {
  // attemptId -> MediaStream
  const streamsRef = useRef(new Map());

  const registerStream = (attemptId, stream) => {
    streamsRef.current.set(attemptId, stream);
  };

  const removeStream = (attemptId) => {
    streamsRef.current.delete(attemptId);
  };

  const getStream = (attemptId) => {
    return streamsRef.current.get(attemptId);
  };

  return (
    <LiveStreamsContext.Provider
      value={{ registerStream, removeStream, getStream }}
    >
      {children}
    </LiveStreamsContext.Provider>
  );
};

export const useLiveStreams = () => useContext(LiveStreamsContext);
