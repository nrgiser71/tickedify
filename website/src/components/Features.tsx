import { Edit3, Mail, Bell, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Edit3,
    title: "Bulk Editing",
    description: "Change dozens of tasks in seconds."
  },
  {
    icon: Mail,
    title: "Email-to-Task Syntax",
    description: "Turn any mail into a structured task."
  },
  {
    icon: Bell,
    title: "In-App Updates",
    description: "Get feature tips and announcements directly inside the app."
  },
  {
    icon: Globe,
    title: "English Interface",
    description: "Work in your preferred language."
  }
];

const Features = () => {
  return (
    <section className="py-24 bg-accent/5">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="border-border/50"
              >
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
