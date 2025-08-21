import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Slider from "@/components/Slider";

describe("Slider", () => {
  test("renders label and current value", () => {
    const onChange = jest.fn();
    render(<Slider label="Temperature" value={0.5} onChange={onChange} />);
    expect(screen.getByText(/temperature/i)).toBeInTheDocument();
    // value is rendered with 2 decimals
    expect(screen.getByText("0.50")).toBeInTheDocument();
  });

  test("onChange is called when sliding", () => {
    const onChange = jest.fn();
    render(<Slider label="Temperature" value={0.5} onChange={onChange} />);
    const input = screen.getByRole("slider");
    fireEvent.change(input, { target: { value: "0.7" } });
    expect(onChange).toHaveBeenCalledWith(0.7);
  });
});
