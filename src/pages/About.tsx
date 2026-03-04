import { useAboutContent } from "@/hooks/useAboutContent";
import { useJournalSettings } from "@/hooks/useJournalSettings";
import JournalHeader from "@/components/JournalHeader";

const About = () => {
    const { data: aboutContent, isLoading, error } = useAboutContent();
    const { data: journalSettings } = useJournalSettings();

    return (
        <div className="min-h-screen bg-background">
            <JournalHeader />

            <main className="container mx-auto px-6 py-24 mb-32 max-w-4xl">
                <div className="space-y-16">
                    {/* Header Section */}
                    <div className="border-b border-border/40 pb-12">
                        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight mb-6">
                            About the Journal
                        </h1>
                        {isLoading ? (
                            <div className="h-8 bg-muted animate-pulse rounded w-3/4"></div>
                        ) : error ? (
                            <p className="text-destructive font-sans">Failed to load journal information.</p>
                        ) : (
                            <p className="font-serif italic text-xl md:text-2xl text-muted-foreground leading-relaxed border-l-4 border-primary pl-6">
                                "{aboutContent?.slogan}"
                            </p>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="grid md:grid-cols-12 gap-12">
                        {/* Sidebar */}
                        <div className="md:col-span-4 space-y-8">
                            <div>
                                <h3 className="font-sans uppercase tracking-widest text-xs font-semibold text-foreground mb-4 border-b border-border/40 pb-2">
                                    Our Purpose
                                </h3>
                                {isLoading ? (
                                    <div className="space-y-2 text-sm text-muted-foreground animate-pulse font-sans">Loading purpose...</div>
                                ) : (
                                    <p className="font-sans text-sm text-foreground leading-relaxed">
                                        {aboutContent?.purpose}
                                    </p>
                                )}
                            </div>

                            <div>
                                <h3 className="font-sans uppercase tracking-widest text-xs font-semibold text-foreground mb-4 border-b border-border/40 pb-2">
                                    ISSN
                                </h3>
                                <p className="font-mono text-xs text-muted-foreground">
                                    Print: 1234-5678<br />
                                    Online: 9876-5432
                                </p>
                            </div>

                            {/* Impact Factor */}
                            {journalSettings?.impact_factor && (
                                <div>
                                    <h3 className="font-sans uppercase tracking-widest text-xs font-semibold text-foreground mb-4 border-b border-border/40 pb-2">
                                        Impact Factor
                                    </h3>
                                    <p className="font-serif text-3xl text-foreground">
                                        {journalSettings.impact_factor}
                                    </p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {journalSettings.impact_factor_year}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Main Body */}
                        <div className="md:col-span-8 prose prose-neutral max-w-none">
                            <h2 className="font-serif text-2xl text-foreground mb-6">Introduction</h2>
                            {isLoading ? (
                                <div className="space-y-4 animate-pulse">
                                    <div className="h-4 bg-muted rounded w-full"></div>
                                    <div className="h-4 bg-muted rounded w-5/6"></div>
                                    <div className="h-4 bg-muted rounded w-4/6"></div>
                                </div>
                            ) : (
                                <div className="font-serif text-base text-foreground/80 leading-loose space-y-6 whitespace-pre-line">
                                    {aboutContent?.introduction}
                                </div>
                            )}

                            {/* Editors Team */}
                            {journalSettings?.editors_team && journalSettings.editors_team.length > 0 && (
                                <div className="mt-16">
                                    <h2 className="font-serif text-2xl text-foreground mb-6">Editorial Board</h2>
                                    <div className="grid gap-6">
                                        {journalSettings.editors_team.map((editor, index) => (
                                            <div key={index} className="border border-border p-4">
                                                <p className="font-medium text-foreground">{editor.name}</p>
                                                <p className="text-sm text-muted-foreground">{editor.title}</p>
                                                <p className="text-sm text-muted-foreground">{editor.institution}</p>
                                                <p className="text-sm text-muted-foreground">{editor.email}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reviewers Team */}
                            {journalSettings?.reviewers_team && journalSettings.reviewers_team.length > 0 && (
                                <div className="mt-16">
                                    <h2 className="font-serif text-2xl text-foreground mb-6">Reviewers</h2>
                                    <div className="grid gap-4">
                                        {journalSettings.reviewers_team.map((reviewer, index) => (
                                            <div key={index} className="border border-border p-4">
                                                <p className="font-medium text-foreground">{reviewer.name}</p>
                                                <p className="text-sm text-muted-foreground">{reviewer.institution}</p>
                                                <p className="text-sm text-muted-foreground">{reviewer.research_field}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Additional Content */}
                            {journalSettings?.about_page_additional && (
                                <div className="mt-16">
                                    <div className="font-serif text-base text-foreground/80 leading-loose whitespace-pre-line">
                                        {journalSettings.about_page_additional}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default About;
