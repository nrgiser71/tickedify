import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { getContent } from "@/lib/contentManager";

const Hero = () => {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    const loadContent = async () => {
      const data = await getContent();
      setContent(data.hero);
    };
    loadContent();

    const handleContentUpdate = () => {
      loadContent();
    };
    window.addEventListener('contentUpdated', handleContentUpdate);
    return () => window.removeEventListener('contentUpdated', handleContentUpdate);
  }, []);

  if (!content) return <div className="min-h-screen flex items-center justify-center">Laden...</div>;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight animate-fade-in-up">
            {content.title}
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
            {content.description}
          </p>

          <div className="flex justify-center items-center animate-fade-in-up animation-delay-400">
            <Button size="lg" className="text-lg px-8 h-14" asChild>
              <a href={content.primaryButtonUrl}>{content.primaryButton}</a>
            </Button>
          </div>
        </div>

        <div className="pt-12 animate-fade-in-up animation-delay-600 max-w-6xl mx-auto">
          <div className="relative rounded-xl overflow-hidden">
            <img
              src={content.image}
              alt="Tickedify Dashboard Interface"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-6 h-6 text-muted-foreground" />
      </div>
    </section>
  );
};

export default Hero;
