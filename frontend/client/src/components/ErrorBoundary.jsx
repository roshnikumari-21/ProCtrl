import { Component } from "react";
import { toastError } from "../utils/toast";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    toastError(error, "Unexpected UI error");
    console.error("UI Crash:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center text-slate-400">
          Something went wrong. Please refresh the page.
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
