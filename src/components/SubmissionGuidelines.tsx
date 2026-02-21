import { useSubmissionRules } from "@/hooks/useSubmissionRules";

const RuleSkeleton = () => (
  <li className="animate-pulse pl-2">
    <div className="h-4 bg-muted rounded w-3/4" />
  </li>
);

const SubmissionGuidelines = () => {
  const { data: rules, isLoading, isError, error } = useSubmissionRules();

  return (
    <section>
      <div className="container mx-auto px-6 py-16 md:py-20">
        <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-8">
          Instructions for Authors
        </h2>

        <ol className="list-decimal list-inside space-y-4 max-w-2xl">
          {isLoading && (
            <>
              <RuleSkeleton />
              <RuleSkeleton />
              <RuleSkeleton />
            </>
          )}

          {isError && (
            <li className="font-sans text-sm text-destructive pl-2">
              Failed to load guidelines: {error.message}
            </li>
          )}

          {rules?.map((rule) => (
            <li
              key={rule.id}
              className="font-sans text-sm md:text-base text-muted-foreground leading-relaxed pl-2"
            >
              {rule.rule_text}
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
