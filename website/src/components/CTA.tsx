import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getContent } from "@/lib/contentManager";

const CTA = () => {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    const loadContent = async () => {
      const data = await getContent();
      setContent(data.cta);
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
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">
            {content.title}
          </h2>
          <p className="text-xl text-muted-foreground">
            {content.description}
          </p>

          <Button size="lg" className="text-lg px-8 h-14" asChild>
            <a href={content.buttonUrl}>{content.button}</a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTA;
