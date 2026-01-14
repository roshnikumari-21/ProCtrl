import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const useBlockBackNavigation = (enabled = true) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    // Push current page again so back goes nowhere
    window.history.pushState(null, "", window.location.href);

    const onPopState = () => {
      window.history.pushState(null, "", window.location.href);
      navigate(0); // optional refresh guard
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [enabled, navigate]);
};

export default useBlockBackNavigation;
