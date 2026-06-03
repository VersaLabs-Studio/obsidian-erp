// tests/components/smoke-component.test.tsx
// Obsidian ERP v4.0 - Smoke Component Test
// Verifies React Testing Library is working

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function SmokeComponent({ message }: { message: string }) {
  return (
    <div>
      <h1>Obsidian ERP</h1>
      <p data-testid="message">{message}</p>
    </div>
  );
}

describe("Smoke Test — Component Rendering", () => {
  it("renders a component with text", () => {
    render(<SmokeComponent message="Test harness active" />);
    expect(screen.getByText("Obsidian ERP")).toBeInTheDocument();
    expect(screen.getByTestId("message")).toHaveTextContent("Test harness active");
  });

  it("renders with different props", () => {
    render(<SmokeComponent message="Phase 0 complete" />);
    expect(screen.getByTestId("message")).toHaveTextContent("Phase 0 complete");
  });
});
