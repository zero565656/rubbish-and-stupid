import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { label: "Submit Paper", path: "/submit" },
  { label: "My Submissions", path: "/my-submissions" },
  { label: "About Journal", path: "/about" },
];

const JournalHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role, signOut } = useAuth();

  const accountLinks = user
    ? role === "admin"
      ? [
        { label: "Admin", path: "/admin" },
        { label: "Users", path: "/admin/users" },
        { label: "Profile", path: "/admin/profile" },
      ]
      : role === "editor"
        ? [
          { label: "Editor", path: "/editor" },
          { label: "Profile", path: "/editor/profile" },
        ]
      : role === "reviewer"
        ? [
          { label: "Reviewer", path: "/reviewer" },
          { label: "Profile", path: "/reviewer/profile" },
        ]
        : [
          { label: "My Desk", path: "/my-submissions" },
          { label: "Profile", path: "/user/profile" },
        ]
    : [
      { label: "Author Register", path: "/register-author" },
      { label: "Login", path: "/admin/login" },
    ];

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <header className="border-b border-border">
      <div className="container mx-auto px-6 py-5 flex items-center justify-between">
        <a href="/" className="font-serif italic text-xl md:text-2xl tracking-tight text-foreground">
          rubbish &amp; stupid
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.path}
              className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
          {accountLinks.map((link) => (
            <a
              key={link.label}
              href={link.path}
              className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
          {user && (
            <button
              onClick={handleLogout}
              className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors duration-300"
            >
              Logout
            </button>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {mobileOpen ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border px-6 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.path}
              className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          {accountLinks.map((link) => (
            <a
              key={link.label}
              href={link.path}
              className="text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          {user && (
            <button
              onClick={handleLogout}
              className="text-left text-xs font-sans uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
            >
              Logout
            </button>
          )}
        </nav>
      )}
    </header>
  );
};

export default JournalHeader;
