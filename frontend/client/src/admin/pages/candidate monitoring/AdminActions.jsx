import { useState } from "react";
import { Button, Card } from "../../../components/UI";
import socket from "../../../services/socket";
import { toast } from "react-toastify";

const AdminActions = ({ attemptId, testId }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleWarn = () => {
    const message = window.prompt(
      "Enter warning message for the candidate:",
      "Please focus on your screen. Continued violation will lead to termination."
    );

    if (message && message.trim()) {
      socket.emit("admin:warn", { attemptId, message });
      toast.success("Warning sent to candidate");
    }
  };

  const handleTerminate = () => {
    const reason = window.prompt(
      "ARE YOU SURE? This will end the test immediately.\n\nEnter reason for termination:",
      "Multiple malpractice violations detected."
    );

    if (reason && reason.trim()) {
      setIsProcessing(true);
      socket.emit("admin:terminate", { attemptId, reason });
      
      // Ideally, listen for success, but for UI responsiveness we disable button
      setTimeout(() => {
          setIsProcessing(false);
          toast.info("Termination command sent");
      }, 1000);
    }
  };

  return (
    <Card className="p-6 space-y-3 border-red-900/30 bg-red-500/5">
      <h3 className="font-bold text-red-400">Enforcement Actions</h3>
      <div className="flex gap-3">
        <Button 
          variant="secondary" 
          onClick={handleWarn}
          className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
        >
          ⚠️ Warn Candidate
        </Button>
        <Button 
          variant="danger" 
          onClick={handleTerminate}
          disabled={isProcessing}
        >
          ⛔ Terminate Attempt
        </Button>
      </div>
    </Card>
  );
};

export default AdminActions;
