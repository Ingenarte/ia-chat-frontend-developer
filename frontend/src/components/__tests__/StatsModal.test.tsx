import React from "react";
import { render, screen } from "@testing-library/react";
import StatsModal from "@/components/StatsModal";

describe("StatsModal", () => {
  test("does not render when open=false", () => {
    const { container } = render(<StatsModal open={false} onClose={() => {}} apiBase="/api" />);
    expect(container.firstChild).toBeNull();
  });

  test("renders tables when open=true (initial empty state)", () => {
    render(<StatsModal open={true} onClose={() => {}} apiBase="/api" />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Table headings and empty messages should be present even before fetch completes
    expect(screen.getByText(/recent finished/i)).toBeInTheDocument();
    expect(screen.getByText(/no jobs running/i)).toBeInTheDocument();
    expect(screen.getByText(/no recent jobs/i)).toBeInTheDocument();
  });
});
