import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { login } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const CmsLogin = () => {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const success = login(password);

      if (success) {
        toast({
          title: "Succesvol ingelogd",
          description: "Welkom in het CMS dashboard",
        });
        navigate("/cms/dashboard");
      } else {
        toast({
          title: "Inloggen mislukt",
          description: "Onjuist wachtwoord. Probeer opnieuw.",
          variant: "destructive",
        });
      }

      setIsLoading(false);
      setPassword("");
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Tickedify CMS</CardTitle>
          <CardDescription className="text-center">
            Voer je wachtwoord in om toegang te krijgen tot het CMS dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                placeholder="Voer je wachtwoord in"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Inloggen..." : "Inloggen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CmsLogin;
