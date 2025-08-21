import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import OutOfServiceModal from "@/components/OutOfServiceModal";

describe("OutOfServiceModal", () => {
  test("does not render when open=false", () => {
    const onClose = jest.fn();
    const { container } = render(<OutOfServiceModal open={false} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders title and closes on button click", () => {
    const onClose = jest.fn();
    render(<OutOfServiceModal open={true} onClose={onClose} checkUrl="https://api.example.com/health" />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/backend is out of service/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
