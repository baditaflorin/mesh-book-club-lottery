import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMockRoom } from "@baditaflorin/mesh-common/testing";
import { drawIndex, Feature, isValidNomination } from "../../src/Feature";
import { config } from "../../src/config";
describe("book club lottery", () => {
  it("validates a complete nomination", () => {
    expect(isValidNomination({ title: "Kindred", author: "Octavia Butler", submittedAt: 1 })).toBe(
      true,
    );
    expect(isValidNomination({ title: "", author: "Octavia Butler", submittedAt: 1 })).toBe(false);
  });
  it("draws deterministically", () => {
    const list: Array<[string, { title: string; author: string; submittedAt: number }]> = [
      ["a", { title: "A", author: "A", submittedAt: 1 }],
      ["b", { title: "B", author: "B", submittedAt: 2 }],
    ];
    expect(drawIndex(list)).toBe(drawIndex(list));
  });
  it("renders nomination controls", () => {
    render(<Feature room={createMockRoom()} config={config} />);
    expect(
      screen.getByRole("heading", { name: "Let the next read choose itself." }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Book title")).toBeInTheDocument();
  });
});
