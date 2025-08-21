import React from "react";
import { render, screen } from "@testing-library/react";
import { MessageList } from "@/components/MessageList";

describe("MessageList", () => {
  test("renders user and assistant messages", () => {
    const messages = [
      { id: "1", role: "user" as const, text: "Hello" },
      { id: "2", role: "assistant" as const, text: "Hi there" },
    ];
    render(<MessageList messages={messages} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there")).toBeInTheDocument();
  });

  test("renders multiple messages", () => {
    const messages = [
      { id: "1", role: "user" as const, text: "A" },
      { id: "2", role: "assistant" as const, text: "B" },
      { id: "3", role: "user" as const, text: "C" },
    ];
    render(<MessageList messages={messages} />);
    expect(screen.getAllByText(/^[ABC]$/)).toHaveLength(3);
  });
});
