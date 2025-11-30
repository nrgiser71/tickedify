import { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getContent } from "@/lib/contentManager";

// Convert kebab-case to PascalCase (e.g., "circle-plus" -> "CirclePlus")
const kebabToPascal = (str: string) => {
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
};

// Get icon component by name (supports both kebab-case and PascalCase)
const getIconComponent = (iconName: string) => {
  if (!iconName) return LucideIcons.Star;
  // First try exact match (PascalCase)
  if ((LucideIcons as any)[iconName]) {
    return (LucideIcons as any)[iconName];
  }
  // Then try converting from kebab-case
  const pascalName = kebabToPascal(iconName);
  return (LucideIcons as any)[pascalName] || LucideIcons.Star;
};

const Pricing = () => {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    const loadContent = async () => {
      const data = await getContent();
      setContent(data.pricing);
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
    <section id="pricing" className="py-24" style={{ backgroundColor: '#E9FCFD' }}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {content.title}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {content.description}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
          {content.plans.map((plan: any, index: number) => {
            const IconComponent = getIconComponent(plan.icon);
            const isHighlighted = plan.highlighted;

            return (
              <div key={index} className={`relative ${isHighlighted ? 'md:-mt-4 md:-mb-4' : ''}`}>
                {/* Highlight Label */}
                {isHighlighted && plan.highlightLabel && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1 rounded-full">
                      {plan.highlightLabel}
                    </span>
                  </div>
                )}

                <Card className={`border-border/50 bg-background transition-all h-full ${
                  isHighlighted
                    ? 'border-primary border-2 shadow-lg'
                    : ''
                }`}>
                  <CardContent className={`pt-6 h-full ${isHighlighted ? 'py-8' : ''}`}>
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>

                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    {plan.monthlyPrice && (
                      <div className="text-2xl font-bold mb-2">
                        {plan.monthlyPrice} / month or {plan.yearlyPrice} / year
                      </div>
                    )}
                    <p className="text-muted-foreground mt-4">{plan.description}</p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Button size="lg" asChild>
            <a href={content.buttonUrl}>{content.buttonText}</a>
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {content.footer}
        </p>
      </div>
    </section>
  );
};

export default Pricing;
