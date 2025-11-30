import { Button } from "@/components/ui/button";

const Header = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - Links */}
          <div className="flex-shrink-0">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:opacity-80 transition-opacity"
            >
              <img
                src="/Tickedify logo.png"
                alt="Tickedify"
                className="h-8"
              />
            </button>
          </div>

          {/* Navigatie - Midden */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("features")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </button>
          </nav>

          {/* Login knop - Rechts */}
          <div className="flex-shrink-0">
            <Button
              asChild
              className="text-sm font-medium"
            >
              <a href="https://tickedify.com/app" target="_blank" rel="noopener noreferrer">
                Login
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
