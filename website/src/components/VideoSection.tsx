import { useState, useEffect } from "react";
import { getContent } from "@/lib/contentManager";

const VideoSection = () => {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    const loadContent = async () => {
      const data = await getContent();
      setContent(data.video);
    };
    loadContent();

    const handleContentUpdate = () => {
      loadContent();
    };
    window.addEventListener('contentUpdated', handleContentUpdate);
    return () => window.removeEventListener('contentUpdated', handleContentUpdate);
  }, []);

  if (!content) return <div className="py-24 flex items-center justify-center">Laden...</div>;

  return (
    <section className="py-24" style={{ backgroundColor: '#E9FCFD' }}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              {content.title}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {content.description}
            </p>
          </div>

          {/* Responsive YouTube Embed */}
          {content.youtubeId && (
            <div className="relative w-full rounded-xl overflow-hidden border border-border/50 shadow-lg" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${content.youtubeId}`}
                title="Tickedify Introduction Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
