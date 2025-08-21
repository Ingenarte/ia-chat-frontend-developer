import React from "react";
import { render, screen } from "@testing-library/react";
import PreviewPane from "@/components/PreviewPane";
import { ModalPhase } from "@/components/PreviewModal";

describe("PreviewPane", () => {
  test("renders an iframe when html is provided", () => {
    render(
      <PreviewPane
        html="<html><body><h1>Hello</h1></body></html>"
        modalOpen={false}
        modalPhase={"pairing" as ModalPhase}
        onModalClose={() => {}}
        onTryExample={() => {}}
      />
    );
    expect(screen.getByTitle("Preview")).toBeInTheDocument();
  });

  test("renders modal when modalOpen is true", () => {
    render(
      <PreviewPane
        html="<html><body><h1>Hello</h1></body></html>"
        modalOpen={true}
        modalPhase={"pairing" as ModalPhase}
        onModalClose={() => {}}
        onTryExample={() => {}}
      />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
