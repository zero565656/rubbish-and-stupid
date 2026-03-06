import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useJournalSettings } from "@/hooks/useJournalSettings";
import type { EditorTeamMember, Profile, ReviewerTeamMember } from "@/types/database.types";

const ABSURD_REVIEWER_TITLES = [
  "PhD in Luck Management",
  "Director of Procrastination",
  "Senior Analyst of Trivial Pursuits",
  "Certified Nonsense Validator",
  "Professor of Advanced Overthinking",
  "Chief Excuses Officer",
];

const Avatar = ({ name, avatarUrl }: { name: string; avatarUrl: string | null }) => {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className="w-24 h-28 md:w-32 md:h-40 border-4 border-[#C5A059] bg-[#fdfbf6] text-[#1a4c3b] flex items-center justify-center text-4xl font-serif font-bold shadow-[4px_4px_0px_#111111] rotate-[-2deg] mb-6 overflow-hidden"
      style={{ clipPath: 'polygon(0% 0%, 100% 2%, 98% 100%, 2% 98%)' }} // Rough scissor cut effect
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover grayscale contrast-125 sepia-[0.3]" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};

const SubmissionGuidelines = () => {
  const { data: settings } = useJournalSettings();
  const editors = settings?.editors_team || [];
  const reviewers = settings?.reviewers_team || [];

  const teamUserIds = useMemo(() => {
    const idSet = new Set<string>();
    editors.forEach((item) => {
      if (item.user_id) idSet.add(item.user_id);
    });
    reviewers.forEach((item) => {
      if (item.user_id) idSet.add(item.user_id);
    });
    return Array.from(idSet);
  }, [editors, reviewers]);

  const { data: teamProfiles = [] } = useQuery({
    queryKey: ["team_profiles", teamUserIds.join(",")],
    enabled: teamUserIds.length > 0,
    queryFn: async () => {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", teamUserIds);

      if (profileError) throw profileError;
      return (data || []) as Profile[];
    },
  });

  const profileById = useMemo(() => {
    const map = new Map<string, Profile>();
    teamProfiles.forEach((profile) => map.set(profile.id, profile));
    return map;
  }, [teamProfiles]);

  const mapEditor = (editor: EditorTeamMember) => {
    const profile = editor.user_id ? profileById.get(editor.user_id) : undefined;
    return {
      name: profile?.full_name || editor.name || "Unnamed Editor",
      institution: profile?.institution || editor.institution || "Institute of Random Studies",
      title: editor.title || "Chief Trash Officer (CTO)",
      researchField: profile?.research_field || editor.research_field || "",
      signature: profile?.bio || editor.signature || "",
      avatarUrl: profile?.avatar_url ?? editor.avatar_url ?? null,
      email: editor.email || "",
    };
  };

  const mapReviewer = (reviewer: ReviewerTeamMember, index: number) => {
    const profile = reviewer.user_id ? profileById.get(reviewer.user_id) : undefined;
    const fallbackTitle = ABSURD_REVIEWER_TITLES[index % ABSURD_REVIEWER_TITLES.length];
    return {
      name: profile?.full_name || reviewer.name || "Anonymous Reviewer",
      title: reviewer.signature || profile?.research_field || reviewer.research_field || fallbackTitle,
    };
  };

  const editorMembers = editors.length > 0
    ? editors.map(mapEditor)
    : [{
      name: "Dr. Null Pointer",
      institution: "University of Uncaught Exceptions",
      title: "Chief Trash Officer (CTO)",
      researchField: "Chaos Theory",
      signature: "Always panic before closing.",
      avatarUrl: null,
      email: "dev@null.com",
    }];

  return (
    <>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap');`}
      </style>
      <footer className="w-full bg-[#1a4c3b] text-[#fdfbf6] relative z-10 overflow-hidden">

        {/* Top Dark Gold Divider */}
        <div className="w-full border-t-[6px] border-[#C5A059]"></div>
        <div className="w-full border-t border-[#C5A059] mt-1"></div>

        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20 relative">

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16 relative z-10">

            {/* Left Column: Editor-in-Chief (4 cols) */}
            <div className="md:col-span-4 flex flex-col items-start pt-2">
              <h3 className="font-serif text-xl md:text-3xl uppercase tracking-widest text-[#C5A059] font-bold mb-8 pb-4 border-b-2 border-[#C5A059]/30">
                Editors-in-Chief
              </h3>

              <div className="w-full space-y-8 md:pl-8 lg:pl-10">
                {editorMembers.map((editor, index) => (
                  <div
                    key={`${editor.name}-${index}`}
                    className={index > 0 ? "pt-8 border-t border-[#fdfbf6]/15" : ""}
                  >
                    <Avatar name={editor.name} avatarUrl={editor.avatarUrl} />

                    <div className="mt-2">
                      <p className="font-serif italic text-xl text-[#C5A059] mb-1">
                        {editor.title}
                      </p>
                      <h4
                        className={index === 0
                          ? "text-5xl md:text-6xl text-[#fdfbf6] leading-none mb-4 -rotate-2"
                          : "text-3xl md:text-4xl text-[#fdfbf6] leading-none mb-3"}
                        style={index === 0
                          ? { fontFamily: "'Caveat', cursive", textShadow: "2px 2px 0px rgba(0,0,0,0.5)" }
                          : { fontFamily: "var(--font-serif)" }}
                      >
                        {editor.name}
                      </h4>
                      <p className="font-mono text-sm opacity-80 mt-2 text-[#fdfbf6]/80">
                        {editor.institution}
                      </p>
                      {editor.researchField && (
                        <p className="font-mono text-xs opacity-70 mt-1 uppercase text-[#C5A059]">
                          FIELD: {editor.researchField}
                        </p>
                      )}
                      {editor.email && (
                        <p className="font-mono text-xs opacity-60 mt-1 uppercase">
                          MAIL: {editor.email}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Middle Column: Review Board (5 cols) */}
            <div className="md:col-span-5 pt-2">
              <h3 className="font-serif text-xl md:text-3xl uppercase tracking-widest text-[#C5A059] font-bold mb-8 pb-4 border-b-2 border-[#C5A059]/30">
                Reviewers
              </h3>

              {reviewers.length === 0 ? (
                <p className="font-mono text-sm text-[#fdfbf6]/50">No reviewers bold enough to join yet.</p>
              ) : (
                <ul className="flex flex-col gap-4 font-mono text-sm">
                  {reviewers.map((reviewer, index) => {
                    const member = mapReviewer(reviewer, index);
                    return (
                      <li key={`${member.name}-${index}`} className="flex flex-col border-b border-[#fdfbf6]/10 pb-3 last:border-0 hover:bg-white/5 p-2 -mx-2 rounded transition-colors duration-200">
                        <span className="font-bold text-[#fdfbf6] uppercase tracking-wide text-base">{member.name}</span>
                        <span className="text-[#C5A059] text-xs mt-1 italic">› {member.title}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Right Column: Contact/Legal & Stamp (3 cols) */}
            <div className="md:col-span-3 pt-2 flex flex-col justify-between relative">
              <div>
                <h3 className="font-serif text-xl md:text-3xl uppercase tracking-widest text-[#C5A059] font-bold mb-8 pb-4 border-b-2 border-[#C5A059]/30">
                  Submission & Rejection
                </h3>
                <div className="font-sans text-sm leading-relaxed text-[#fdfbf6]/80 space-y-5">
                  <p>
                    <strong className="text-white block mb-1">投稿警告 (WARNING)：</strong>
                    投稿免费，撤稿一万。
                    <span className="block mt-1 italic opacity-70">我们不仅生产学术垃圾，我们还负责回收您的智商税。</span>
                  </p>
                  <p>
                    <strong className="text-white block mb-1">免责声明 (DISCLAIMER)：</strong>
                    阅读本刊可能会导致高血压、脑溢血或手机屏幕碎裂。本刊不承担任何医疗费用。
                  </p>
                </div>
              </div>

              {/* Bottom Footer Links within Right Column */}
              <div className="mt-12 flex flex-col gap-4 font-mono text-xs z-20 relative">
                <div className="flex flex-wrap gap-4">
                  <a
                    href="/register-author"
                    className="bg-[#C5A059] text-[#1a4c3b] font-bold px-6 py-3 uppercase tracking-widest hover:bg-[#fdfbf6] transition-colors shadow-[4px_4px_0px_#111111] hover:translate-y-1 hover:shadow-[2px_2px_0px_#111111] active:translate-y-2 active:shadow-none"
                  >
                    AUTHOR REGISTER
                  </a>
                  <a
                    href="/admin/login"
                    className="border-2 border-[#C5A059] text-[#C5A059] font-bold px-6 py-3 uppercase tracking-widest bg-[#1a4c3b] hover:bg-[#C5A059] hover:text-[#1a4c3b] transition-colors shadow-[4px_4px_0px_#111111] hover:translate-y-1 hover:shadow-[2px_2px_0px_#111111] active:translate-y-2 active:shadow-none"
                  >
                    STAFF LOGIN
                  </a>
                </div>
                <p className="opacity-60 text-[#C5A059] uppercase pt-4 border-t border-[#fdfbf6]/20 mt-2">
                  © 2026 R&S. ALL RIGHTS REVERSED.
                </p>
              </div>

              {/* The GIANT STAMP */}
              <div
                className="absolute -bottom-10 -right-10 md:-right-20 pointer-events-none select-none z-0 transform -rotate-[25deg] mix-blend-screen opacity-20"
                style={{ textShadow: '2px 2px 0px rgba(255,0,0,0.5)' }}
              >
                <div className="border-[8px] border-red-600 text-red-600 p-4 inline-block font-sans font-black tracking-[-0.05em] uppercase" style={{ fontSize: 'clamp(3rem, 6vw, 6rem)', lineHeight: '0.8' }}>
                  <span className="block border-b-[4px] border-red-600 mb-2 pb-2">ACADEMIC</span>
                  <span className="block text-center">TRASH</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </footer>
    </>
  );
};

export default SubmissionGuidelines;
