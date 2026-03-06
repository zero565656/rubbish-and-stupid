import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import ProfileSettings from "@/components/profile/ProfileSettings";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "user@example.com" },
    profile: {
      id: "user-1",
      role: "user",
      full_name: "Test User",
      avatar_url: null,
      bio: null,
      research_field: "Physics",
      institution: null,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    refreshProfile: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
      }),
    },
    from: () => ({
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    }),
    auth: {
      updateUser: vi.fn(() => Promise.resolve({ error: null })),
    },
  },
}));

describe("ProfileSettings", () => {
  it("renders editable profile fields", () => {
    render(
      <MemoryRouter>
        <ProfileSettings backPath="/my-submissions" deskTitle="Author Desk" />
      </MemoryRouter>
    );

    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Research Field")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeInTheDocument();
  });
});
