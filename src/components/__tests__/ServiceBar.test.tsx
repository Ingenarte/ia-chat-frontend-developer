import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ServiceBar from "@/components/ServiceBar";

describe("ServiceBar", () => {
  test("renders label and Stats button", () => {
    const onOpenStats = jest.fn();
    const onOutOfService = jest.fn();
    render(<ServiceBar onOpenStats={onOpenStats} onOutOfService={onOutOfService} />);
    expect(screen.getByText(/service/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stats/i })).toBeInTheDocument();
  });

  test("clicking Stats calls onOpenStats", () => {
    const onOpenStats = jest.fn();
    const onOutOfService = jest.fn();
    render(<ServiceBar onOpenStats={onOpenStats} onOutOfService={onOutOfService} />);
    fireEvent.click(screen.getByRole("button", { name: /stats/i }));
    expect(onOpenStats).toHaveBeenCalledTimes(1);
  });
});
