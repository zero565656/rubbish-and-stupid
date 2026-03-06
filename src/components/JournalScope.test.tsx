import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import JournalScope from "./JournalScope";

vi.mock("@/hooks/useFeaturedNonsense", () => ({
  useFeaturedNonsense: () => ({
    data: {
      article: {
        id: "article-1",
        title: "The Aerodynamics of Dropping Buttered Toast: A Stochastic Approach to Carpet Ruin",
        author: "Dr. I. M. Clumsy",
      },
      topComment: {
        content: "Reviewer #2: My cat is now stuck in a perpetual motion loop. Please retract immediately.",
        helpful_count: 14200,
      },
    },
  }),
}));

describe("JournalScope", () => {
  it("renders featured nonsense content and top comment", () => {
    render(
      <MemoryRouter>
        <JournalScope />
      </MemoryRouter>
    );

    expect(screen.getByText("Featured Nonsense")).toBeInTheDocument();
    expect(screen.getByText("Aims & Scope")).toBeInTheDocument();
    expect(
      screen.getByText("The Aerodynamics of Dropping Buttered Toast: A Stochastic Approach to Carpet Ruin")
    ).toBeInTheDocument();
    expect(
      screen.getByText("❝ Reviewer #2: My cat is now stuck in a perpetual motion loop. Please retract immediately. ❞")
    ).toBeInTheDocument();
    expect(screen.getByText("▲ 14.2k Helpful")).toBeInTheDocument();
  });
});
