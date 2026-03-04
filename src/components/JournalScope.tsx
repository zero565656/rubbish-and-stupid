const JournalScope = () => {
    return (
        <section className="py-24 bg-white border-t border-border/40">
            <div className="container mx-auto px-6 max-w-4xl">
                <h2 className="font-serif text-3xl mb-12 text-center text-foreground">
                    Aims &amp; Scope
                </h2>

                <div className="prose prose-neutral max-w-none font-serif text-base leading-loose text-foreground/80">
                    <p className="mb-8 text-center text-lg italic text-muted-foreground">
                        We publish research across all disciplines—provided it meets our rigorous standards of academic triviality.
                    </p>

                    <div className="grid md:grid-cols-2 gap-x-16 gap-y-8 mt-12">
                        <div>
                            <h3 className="font-sans uppercase tracking-widest text-xs font-bold text-foreground mb-4 border-b border-border/40 pb-2">
                                Physical Sciences
                            </h3>
                            <p className="text-sm font-sans text-muted-foreground leading-relaxed">
                                Physics, Chemistry, Earth Sciences, and Astronomy. Research must demonstrate mathematically sound principles applied to utterly inconsequential phenomena.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-sans uppercase tracking-widest text-xs font-bold text-foreground mb-4 border-b border-border/40 pb-2">
                                Life Sciences
                            </h3>
                            <p className="text-sm font-sans text-muted-foreground leading-relaxed">
                                Biology, Neuroscience, and Ecology. We welcome longitudinal studies with statistically significant but practically useless findings.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-sans uppercase tracking-widest text-xs font-bold text-foreground mb-4 border-b border-border/40 pb-2">
                                Social Sciences
                            </h3>
                            <p className="text-sm font-sans text-muted-foreground leading-relaxed">
                                Psychology, Economics, and Sociology. Qualitative and quantitative analyses of behavioral patterns that surprise absolutely no one.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-sans uppercase tracking-widest text-xs font-bold text-foreground mb-4 border-b border-border/40 pb-2">
                                Applied Technology
                            </h3>
                            <p className="text-sm font-sans text-muted-foreground leading-relaxed">
                                Computer Science and Engineering. Innovations that solve problems which did not exist until the innovation was introduced.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default JournalScope;
