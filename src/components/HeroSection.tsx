import { useState } from "react";

const HeroSection = () => {
  const [hovered, setHovered] = useState(false);

  return (
    <section className="border-b border-border">
      <div className="container mx-auto px-6 py-16 md:py-24 max-w-3xl">
        <p className="text-xs font-sans uppercase tracking-[0.3em] text-muted-foreground mb-8">
          Vol. 1, Issue 42 · ISSN: 0000-0000
        </p>

        <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl leading-tight tracking-tight text-foreground mb-6">
          The Paradigm Shift of Doing Absolutely Nothing.
        </h1>

        <p className="font-sans text-base md:text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl">
          Advancing the frontiers of human procrastination through peer-reviewed nonsense.
        </p>

        <button
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="bg-primary text-primary-foreground font-sans text-sm uppercase tracking-widest px-8 py-4 border-2 border-foreground hover:bg-background hover:text-foreground transition-all duration-300"
        >
          {hovered ? "Don't click me" : "Read Latest Issue"}
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
