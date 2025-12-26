interface Sponsor {
  id: string;
  name: string;
  logo: string;
}

interface SponsorSliderProps {
  sponsors: Sponsor[];
}

export const SponsorSlider = ({ sponsors }: SponsorSliderProps) => {
  // Duplicate sponsors for seamless infinite scroll
  const duplicatedSponsors = [...sponsors, ...sponsors];

  return (
    <section className="py-16 overflow-hidden border-t border-border/50">
      <div className="container max-w-6xl mx-auto px-4 mb-8">
        <h3 className="text-center text-muted-foreground text-sm font-medium uppercase tracking-widest">
          Nasi Sponsorzy
        </h3>
      </div>

      <div className="relative">
        {/* Gradient overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />

        {/* Slider */}
        <div className="sponsor-slider hover:[animation-play-state:paused]">
          {duplicatedSponsors.map((sponsor, index) => (
            <div
              key={`${sponsor.id}-${index}`}
              className="flex-shrink-0 flex flex-col items-center gap-3 px-8"
            >
              <div className="w-24 h-24 rounded-2xl bg-secondary/50 flex items-center justify-center p-4 hover:bg-secondary transition-colors duration-300">
                <img
                  src={sponsor.logo}
                  alt={sponsor.name}
                  className="max-w-full max-h-full object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                />
              </div>
              <span className="text-muted-foreground text-sm">{sponsor.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
