import { useJournalSettingsForHero } from "@/hooks/useJournalSettingsForHero";

const HeroSection = () => {
  const { data: settings, isLoading } = useJournalSettingsForHero();

  const coverImage = settings?.cover_image;
  const citeScore = settings?.cite_score;
  const impactFactor = settings?.impact_factor;

  const formatMetric = (value: number | null | undefined, fallback: string) => {
    if (value === null || value === undefined) return fallback;
    return value.toString();
  };

  return (
    <section
      className="w-full"
      style={{ backgroundColor: '#1a2a22', minHeight: '300px' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-between gap-8">
        {/* 左侧：封面图占位符 */}
        <div className="flex-shrink-0">
          <div
            className="relative bg-white p-1"
            style={{
              width: '160px',
              height: '240px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
            }}
          >
            {coverImage ? (
              <img
                src={coverImage}
                alt="Journal Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: '#2a3a32' }}
              >
                <span className="text-white text-xs text-center px-2">
                  Journal Cover
                  <br />
                  (待替换)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 中间：标题区 */}
        <div className="flex-1 text-white">
          <h1
            className={`font-serif text-4xl md:text-5xl lg:text-6xl leading-tight mb-3 transition-opacity duration-300 ${isLoading ? "opacity-40" : "opacity-100"
              }`}
          >
            Journal of Rubbish and Stupid
          </h1>
          <p
            className={`font-sans text-lg md:text-xl text-gray-300 transition-opacity duration-300 ${isLoading ? "opacity-40" : "opacity-100"
              }`}
          >
            Supports absolute nonsense
          </p>
        </div>

        {/* 右侧：学术指标区 */}
        <div className="flex items-center gap-8 flex-shrink-0">
          <div className="text-center text-white border-r border-gray-600 pr-8">
            <div className="font-serif text-4xl md:text-5xl">
              {isLoading ? "-" : formatMetric(citeScore, "-1.0")}
            </div>
            <div className="font-sans text-sm text-gray-400 mt-1">CiteScore</div>
          </div>
          <div className="text-center text-white">
            <div className="font-serif text-3xl md:text-4xl">
              {isLoading ? "-" : formatMetric(impactFactor, "Not available")}
            </div>
            <div className="font-sans text-sm text-gray-400 mt-1">Impact Factor</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
