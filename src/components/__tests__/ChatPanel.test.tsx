import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatPanel from "@/components/ChatPanel";

describe("ChatPanel", () => {
  test("renders textarea and Send button", () => {
    render(<ChatPanel onHtml={() => {}} currentHtml="" />);
    expect(screen.getByPlaceholderText(/type your instruction/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  test("typing updates textarea value", () => {
    render(<ChatPanel onHtml={() => {}} currentHtml="" />);
    const textarea = screen.getByPlaceholderText(/type your instruction/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Generate a page" } });
    expect(textarea.value).toBe("Generate a page");
  });
});
