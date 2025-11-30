import { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getContent } from "@/lib/contentManager";

// Convert kebab-case to PascalCase (e.g., "circle-plus" -> "CirclePlus")
const kebabToPascal = (str: string) => {
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
};

// Get icon component by name (supports both kebab-case and PascalCase)
const getIconComponent = (iconName: string) => {
  // First try exact match (PascalCase)
  if ((LucideIcons as any)[iconName]) {
    return (LucideIcons as any)[iconName];
  }
  // Then try converting from kebab-case
  const pascalName = kebabToPascal(iconName);
  return (LucideIcons as any)[pascalName] || LucideIcons.Star;
};

const ProblemSection = () => {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    const loadContent = async () => {
      const data = await getContent();
      setContent(data.problemSection);
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
    <section id="features" className="py-24 bg-accent/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {content.title}{" "}
            <span className="text-primary">{content.titleHighlight}</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {content.description}
          </p>
        </div>

        <div className="space-y-8 max-w-6xl mx-auto">
          {content.features.map((feature: any, index: number) => {
            const IconComponent = getIconComponent(feature.icon);
            return (
              <Card key={index} className="border-border/50 bg-background min-h-[450px]">
                <CardContent className="pt-6 h-full">
                  <div className="grid grid-cols-3 gap-8 h-full">
                    {/* Text content - 1/3 width */}
                    <div className="col-span-1 space-y-4">
                      <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
                        <IconComponent className="w-7 h-7 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                      </div>
                    </div>

                    {/* Image content - 2/3 width */}
                    <div className="col-span-2 relative">
                      {feature.image ? (
                        <div className="rounded-xl overflow-hidden h-full">
                          <img
                            src={feature.image}
                            alt={feature.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl h-full flex items-center justify-center text-muted-foreground">
                          Geen afbeelding
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
