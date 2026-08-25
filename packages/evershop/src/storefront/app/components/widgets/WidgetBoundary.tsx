import React from 'react';

/**
 * Isolates one widget's render failure from the rest of the page.
 *
 * The widget components are merchant-configured and data-driven: a setting
 * shaped differently than a component expects (a theme-installed value, a
 * hand-edited JSON field, a settings key that changed meaning between
 * versions) throws inside that component. Without a boundary, one such widget
 * takes down the whole route — a blank page instead of a page missing one
 * block.
 *
 * This mirrors the fail-soft posture the rest of the pipeline already has:
 * `WidgetArea` renders nothing for an unregistered type, and
 * `resolvePuckExtras` catches per widget so a deleted collection doesn't kill
 * the page. Rendering is the remaining gap.
 *
 * Renders nothing on failure rather than an error placeholder — this is
 * customer-facing, and a missing block is better than a broken-looking one.
 * The error still reaches the server log, so the failure is not silent to
 * anyone who can act on it.
 *
 * Must be a class: `componentDidCatch`/`getDerivedStateFromError` have no hook
 * equivalent. React catches errors thrown during SSR through this same
 * mechanism, so it protects the server render too, not only hydration.
 */
export class WidgetBoundary extends React.Component<
  { type: string; id: string; children: React.ReactNode },
  { failed: boolean }
> {
  constructor(props: { type: string; id: string; children: React.ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Identify the widget, not just the stack: `type` says which component to
    // look at and `id` says which stored instance carries the bad settings,
    // which is what makes this actionable without reproducing it.
    console.error(
      `[widget] ${this.props.type} (${this.props.id}) failed to render:`,
      error
    );
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
