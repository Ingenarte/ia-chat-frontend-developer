import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PreviewModal, { ModalPhase } from "@/components/PreviewModal";

describe("PreviewModal", () => {
  test("renders dialog when open in pairing phase", () => {
    render(
      <PreviewModal
        open={true}
        phase={"pairing" as ModalPhase}
        statusText="Processing"
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("pressing Escape triggers onClose when allowed", () => {
    const onClose = jest.fn();
    render(
      <PreviewModal
        open={true}
        phase={"pairing" as ModalPhase}
        onClose={onClose}
        closeOnEscape={true}
        persistent={false}
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
