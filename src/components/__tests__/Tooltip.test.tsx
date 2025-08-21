import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Tooltip from "@/components/Tooltip";

describe("Tooltip", () => {
  test("opens on click and shows content", () => {
    render(<Tooltip title="More info" content="Helpful details" />);
    const btn = screen.getByRole("button", { name: /more info/i });
    fireEvent.click(btn);
    expect(screen.getByRole("dialog", { name: /more info/i })).toBeInTheDocument();
    expect(screen.getByText(/helpful details/i)).toBeInTheDocument();
  });

  test("closes on Escape", () => {
    render(<Tooltip title="Title" content="Body" />);
    const btn = screen.getByRole("button", { name: /title/i });
    fireEvent.click(btn);
    expect(screen.getByRole("dialog", { name: /title/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    // dialog should be gone
    expect(screen.queryByRole("dialog", { name: /title/i })).toBeNull();
  });
});
