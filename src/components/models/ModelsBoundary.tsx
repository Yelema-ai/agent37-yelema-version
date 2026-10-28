"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

// Un bloc de l'écran Modèles qui ne peut pas s'afficher le dit à sa place ; le reste de la page reste utilisable.
export class ModelsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2.5 rounded-[22px] border border-ko/30 bg-ko-pale p-4 text-sm text-ko">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <p className="flex-1">Ce bloc n’a pas pu s’afficher. Réessayez ; si cela continue, rechargez la page ou contactez Yelema.</p>
        <button type="button" onClick={() => this.setState({ failed: false })} className="rounded-full border border-ko/30 px-3 py-1 text-xs font-semibold hover:bg-surface">
          Réessayer
        </button>
      </div>
    );
  }
}
