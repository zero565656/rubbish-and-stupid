const rules = [
  "Font size must be 11.5pt. Not 11, not 12. We will reject it.",
  "Peer review is done by a group of cats walking over a keyboard.",
  "Plagiarism is prohibited, unless it's really, really good.",
];

const SubmissionGuidelines = () => {
  return (
    <section>
      <div className="container mx-auto px-6 py-16 md:py-20">
        <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-8">
          Instructions for Authors
        </h2>

        <ol className="list-decimal list-inside space-y-4 max-w-2xl">
          {rules.map((rule, i) => (
            <li
              key={i}
              className="font-sans text-sm md:text-base text-muted-foreground leading-relaxed pl-2"
            >
              {rule}
            </li>
          ))}
        </ol>
      </div>

      {/* Footer bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-serif italic text-sm text-muted-foreground">
            rubbish &amp; stupid
          </p>
          <p className="font-sans text-xs text-muted-foreground">
            © 2025 r&amp;s. All rights reversed.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SubmissionGuidelines;
