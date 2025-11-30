import { useState, useEffect } from "react";
import { getContent } from "@/lib/contentManager";

const Footer = () => {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    const loadContent = async () => {
      const data = await getContent();
      setContent(data.footer);
    };
    loadContent();

    const handleContentUpdate = () => {
      loadContent();
    };
    window.addEventListener('contentUpdated', handleContentUpdate);
    return () => window.removeEventListener('contentUpdated', handleContentUpdate);
  }, []);

  if (!content) return <div className="py-12 flex items-center justify-center">Laden...</div>;

  return (
    <footer className="py-12 bg-accent/5 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold mb-1">{content.title}</h3>
              <p className="text-sm text-muted-foreground">{content.tagline}</p>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6">
              <a
                href={`mailto:${content.email}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {content.email}
              </a>
              <div className="flex gap-6">
                {content.links.map((link: any, index: number) => (
                  <a
                    key={index}
                    href={link.url}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.text}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
