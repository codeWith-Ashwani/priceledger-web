import { Component, type ReactNode } from "react";

export default class AppBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="page">
        <section className="error-state" role="alert">
          <h1>PriceLedger couldn’t display this page.</h1>
          <p>
            Reload to start again. Your saved targets remain in this browser.
          </p>
          <button
            className="button primary"
            onClick={() => window.location.reload()}
          >
            Reload PriceLedger
          </button>
        </section>
      </main>
    );
  }
}
