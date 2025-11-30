import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LogOut, Save, Home, Plus, Trash2, ExternalLink, Upload, FolderOpen } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { isAuthenticated, logout } from "@/lib/auth";
import { getContent, saveContent, ContentData } from "@/lib/contentManager";
import { useToast } from "@/hooks/use-toast";

// Convert kebab-case to PascalCase (e.g., "circle-plus" -> "CirclePlus")
const kebabToPascal = (str: string) => {
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
};

// Get icon component by name (supports both kebab-case and PascalCase)
const getIconComponent = (iconName: string) => {
  if (!iconName) return null;
  // First try exact match (PascalCase)
  if ((LucideIcons as any)[iconName]) {
    return (LucideIcons as any)[iconName];
  }
  // Then try converting from kebab-case
  const pascalName = kebabToPascal(iconName);
  return (LucideIcons as any)[pascalName] || null;
};

const CmsDashboard = () => {
  const [content, setContent] = useState<ContentData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [availableImages, setAvailableImages] = useState<Array<{filename: string, path: string}>>([]);
  const [currentImageSection, setCurrentImageSection] = useState<'hero' | 'solution' | 'problem'>('hero');
  const [currentProblemFeatureIndex, setCurrentProblemFeatureIndex] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/cms");
      return;
    }

    const loadContent = async () => {
      const data = await getContent();
      setContent(data);
    };
    loadContent();
  }, [navigate]);

  const handleSave = async () => {
    if (content) {
      const success = await saveContent(content);
      if (success) {
        toast({
          title: "Content opgeslagen",
          description: "Alle wijzigingen zijn succesvol opgeslagen in content.json",
        });
      } else {
        toast({
          title: "Opslaan mislukt",
          description: "Er ging iets mis bij het opslaan. Controleer of de backend server draait.",
          variant: "destructive",
        });
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/cms");
    toast({
      title: "Uitgelogd",
      description: "Je bent succesvol uitgelogd",
    });
  };

  const loadAvailableImages = async (section: 'hero' | 'solution' | 'problem', featureIndex?: number) => {
    try {
      const response = await fetch('http://localhost:3001/api/images');
      if (!response.ok) throw new Error('Failed to fetch images');

      const data = await response.json();
      setAvailableImages(data.images);
      setCurrentImageSection(section);
      if (section === 'problem' && featureIndex !== undefined) {
        setCurrentProblemFeatureIndex(featureIndex);
      }
      setImageModalOpen(true);
    } catch (error) {
      console.error('Error loading images:', error);
      toast({
        title: "Laden mislukt",
        description: "Kon de afbeeldingen niet ophalen",
        variant: "destructive",
      });
    }
  };

  const selectImage = (imagePath: string) => {
    if (currentImageSection === 'hero') {
      setContent({...content, hero: {...content.hero, image: imagePath}});
    } else if (currentImageSection === 'solution') {
      setContent({...content, solutionSection: {...content.solutionSection, image: imagePath}});
    } else if (currentImageSection === 'problem') {
      const newFeatures = [...content.problemSection.features];
      newFeatures[currentProblemFeatureIndex] = {...newFeatures[currentProblemFeatureIndex], image: imagePath};
      setContent({...content, problemSection: {...content.problemSection, features: newFeatures}});
    }
    setImageModalOpen(false);
    toast({
      title: "Afbeelding geselecteerd",
      description: "Vergeet niet op te slaan!",
    });
  };

  const handleProblemImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, featureIndex: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Valideer bestandstype
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ongeldig bestand",
        description: "Selecteer een afbeelding (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Valideer bestandsgrootte (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Bestand te groot",
        description: "Maximale bestandsgrootte is 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();

      // Update feature met nieuwe image path
      const newFeatures = [...content.problemSection.features];
      newFeatures[featureIndex] = {...newFeatures[featureIndex], image: data.path};
      setContent({...content, problemSection: {...content.problemSection, features: newFeatures}});

      toast({
        title: "Afbeelding geüpload",
        description: `${file.name} is succesvol geüpload. Vergeet niet op te slaan!`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload mislukt",
        description: "Er ging iets mis bij het uploaden van de afbeelding",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, section: 'hero' | 'solution') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Valideer bestandstype
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ongeldig bestand",
        description: "Selecteer een afbeelding (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Valideer bestandsgrootte (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Bestand te groot",
        description: "Maximale bestandsgrootte is 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();

      // Update content met nieuwe image path
      if (section === 'hero') {
        setContent({...content, hero: {...content.hero, image: data.path}});
      } else if (section === 'solution') {
        setContent({...content, solutionSection: {...content.solutionSection, image: data.path}});
      }

      toast({
        title: "Afbeelding geüpload",
        description: `${file.name} is succesvol geüpload. Vergeet niet op te slaan!`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload mislukt",
        description: "Er ging iets mis bij het uploaden van de afbeelding",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!content) {
    return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Tickedify CMS</h1>
              <Link to="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Bekijk Website
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Opslaan
              </Button>
              <Button onClick={handleLogout} variant="destructive" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Uitloggen
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="hero" className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 lg:grid-cols-8">
            <TabsTrigger value="hero">Hero</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="problem">Problem</TabsTrigger>
            <TabsTrigger value="solution">Solution</TabsTrigger>
            <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="cta">CTA</TabsTrigger>
            <TabsTrigger value="footer">Footer</TabsTrigger>
          </TabsList>

          {/* Hero Section */}
          <TabsContent value="hero">
            <Card className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Hero Sectie</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Titel</label>
                  <Input
                    value={content.hero.title}
                    onChange={(e) => setContent({...content, hero: {...content.hero, title: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Beschrijving</label>
                  <Textarea
                    value={content.hero.description}
                    onChange={(e) => setContent({...content, hero: {...content.hero, description: e.target.value}})}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Primaire Button</label>
                    <Input
                      value={content.hero.primaryButton}
                      onChange={(e) => setContent({...content, hero: {...content.hero, primaryButton: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Primaire Button URL</label>
                    <Input
                      value={content.hero.primaryButtonUrl}
                      onChange={(e) => setContent({...content, hero: {...content.hero, primaryButtonUrl: e.target.value}})}
                      placeholder="https://app.tickedify.com/register"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Afbeelding</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={content.hero.image}
                        onChange={(e) => setContent({...content, hero: {...content.hero, image: e.target.value}})}
                        placeholder="/src/assets/image.png"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => loadAvailableImages('hero')}
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Load
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        onClick={() => document.getElementById('hero-image-upload')?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploaden...' : 'Upload'}
                      </Button>
                      <input
                        id="hero-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'hero')}
                      />
                    </div>
                    {content.hero.image && (
                      <div className="border rounded-lg p-4 bg-accent/5">
                        <img
                          src={content.hero.image}
                          alt="Hero preview"
                          className="w-full h-[480px] object-contain rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Video Section */}
          <TabsContent value="video">
            <Card className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Video Sectie</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Titel</label>
                  <Input
                    value={content.video.title}
                    onChange={(e) => setContent({...content, video: {...content.video, title: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Beschrijving</label>
                  <Textarea
                    value={content.video.description}
                    onChange={(e) => setContent({...content, video: {...content.video, description: e.target.value}})}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">YouTube Video ID</label>
                  <Input
                    value={content.video.youtubeId}
                    onChange={(e) => setContent({...content, video: {...content.video, youtubeId: e.target.value}})}
                    placeholder="dQw4w9WgXcQ"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Het ID vind je in de YouTube URL: youtube.com/watch?v=<strong>VIDEO_ID</strong>
                  </p>
                </div>
                {content.video.youtubeId && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Preview</label>
                    <div className="relative w-full rounded-xl overflow-hidden border border-border/50" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        className="absolute top-0 left-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${content.video.youtubeId}`}
                        title="Video Preview"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Problem Section */}
          <TabsContent value="problem">
            <Card className="p-6 space-y-4">
              <h2 className="text-2xl font-bold mb-4">Problem Sectie</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Titel</label>
                  <Input
                    value={content.problemSection.title}
                    onChange={(e) => setContent({...content, problemSection: {...content.problemSection, title: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Titel Highlight</label>
                  <Input
                    value={content.problemSection.titleHighlight}
                    onChange={(e) => setContent({...content, problemSection: {...content.problemSection, titleHighlight: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Beschrijving</label>
                  <Textarea
                    value={content.problemSection.description}
                    onChange={(e) => setContent({...content, problemSection: {...content.problemSection, description: e.target.value}})}
                    rows={2}
                  />
                </div>

                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Features</label>
                    <Button
                      size="sm"
                      onClick={() => {
                        const newFeatures = [...content.problemSection.features, { icon: "Star", title: "", description: "" }];
                        setContent({...content, problemSection: {...content.problemSection, features: newFeatures}});
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Voeg Feature Toe
                    </Button>
                  </div>

                  {content.problemSection.features.map((feature, index) => (
                    <Card key={index} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Feature {index + 1}</h4>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const newFeatures = content.problemSection.features.filter((_, i) => i !== index);
                            setContent({...content, problemSection: {...content.problemSection, features: newFeatures}});
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium">Icon (Lucide naam)</label>
                          <a
                            href="https://lucide.dev/icons"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            Bekijk alle iconen <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input
                            value={feature.icon}
                            onChange={(e) => {
                              const newFeatures = [...content.problemSection.features];
                              newFeatures[index] = {...feature, icon: e.target.value};
                              setContent({...content, problemSection: {...content.problemSection, features: newFeatures}});
                            }}
                            placeholder="Bijv: circle-plus, Zap, target"
                          />
                          {(() => {
                            const IconComponent = getIconComponent(feature.icon);
                            return IconComponent ? (
                              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <IconComponent className="w-5 h-5 text-primary" />
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Titel</label>
                        <Input
                          value={feature.title}
                          onChange={(e) => {
                            const newFeatures = [...content.problemSection.features];
                            newFeatures[index] = {...feature, title: e.target.value};
                            setContent({...content, problemSection: {...content.problemSection, features: newFeatures}});
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Beschrijving</label>
                        <Textarea
                          value={feature.description}
                          onChange={(e) => {
                            const newFeatures = [...content.problemSection.features];
                            newFeatures[index] = {...feature, description: e.target.value};
                            setContent({...content, problemSection: {...content.problemSection, features: newFeatures}});
                          }}
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Afbeelding</label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            value={feature.image || ''}
                            onChange={(e) => {
                              const newFeatures = [...content.problemSection.features];
                              newFeatures[index] = {...feature, image: e.target.value};
                              setContent({...content, problemSection: {...content.problemSection, features: newFeatures}});
                            }}
                            placeholder="/src/assets/image.png"
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadAvailableImages('problem', index)}
                          >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById(`problem-image-upload-${index}`)?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
                          </Button>
                          <input
                            id={`problem-image-upload-${index}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleProblemImageUpload(e, index)}
                            style={{ display: 'none' }}
                          />
                        </div>
                        {feature.image && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-border/50 bg-accent/5">
                            <img
                              src={feature.image}
                              alt={feature.title}
                              className="w-full h-auto max-h-[300px] object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Solution Section */}
          <TabsContent value="solution">
            <Card className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Solution Sectie</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Titel</label>
                  <Input
                    value={content.solutionSection.title}
                    onChange={(e) => setContent({...content, solutionSection: {...content.solutionSection, title: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Beschrijving</label>
                  <Textarea
                    value={content.solutionSection.description}
                    onChange={(e) => setContent({...content, solutionSection: {...content.solutionSection, description: e.target.value}})}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Afbeelding</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={content.solutionSection.image}
                        onChange={(e) => setContent({...content, solutionSection: {...content.solutionSection, image: e.target.value}})}
                        placeholder="/src/assets/image.png"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => loadAvailableImages('solution')}
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Load
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploading}
                        onClick={() => document.getElementById('solution-image-upload')?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploaden...' : 'Upload'}
                      </Button>
                      <input
                        id="solution-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, 'solution')}
                      />
                    </div>
                    {content.solutionSection.image && (
                      <div className="border rounded-lg p-4 bg-accent/5">
                        <img
                          src={content.solutionSection.image}
                          alt="Solution preview"
                          className="w-full h-[480px] object-contain rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Features</label>
                    <Button
                      size="sm"
                      onClick={() => {
                        const newFeatures = [...content.solutionSection.features, ""];
                        setContent({...content, solutionSection: {...content.solutionSection, features: newFeatures}});
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Voeg Feature Toe
                    </Button>
                  </div>

                  {content.solutionSection.features.map((feature, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...content.solutionSection.features];
                          newFeatures[index] = e.target.value;
                          setContent({...content, solutionSection: {...content.solutionSection, features: newFeatures}});
                        }}
                        placeholder={`Feature ${index + 1}`}
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const newFeatures = content.solutionSection.features.filter((_, i) => i !== index);
                          setContent({...content, solutionSection: {...content.solutionSection, features: newFeatures}});
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Testimonials Section */}
          <TabsContent value="testimonials">
            <Card className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Testimonials</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Titel</label>
                  <Input
                    value={content.testimonials.title}
                    onChange={(e) => setContent({...content, testimonials: {...content.testimonials, title: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Beschrijving</label>
                  <Textarea
                    value={content.testimonials.description}
                    onChange={(e) => setContent({...content, testimonials: {...content.testimonials, description: e.target.value}})}
                    rows={2}
                  />
                </div>

                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Testimonials</label>
                    <Button
                      size="sm"
                      onClick={() => {
                        const newItems = [...content.testimonials.items, { quote: "", author: "", role: "" }];
                        setContent({...content, testimonials: {...content.testimonials, items: newItems}});
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Voeg Testimonial Toe
                    </Button>
                  </div>

                  {content.testimonials.items.map((item, index) => (
                    <Card key={index} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Testimonial {index + 1}</h4>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const newItems = content.testimonials.items.filter((_, i) => i !== index);
                            setContent({...content, testimonials: {...content.testimonials, items: newItems}});
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Quote</label>
                        <Textarea
                          value={item.quote}
                          onChange={(e) => {
                            const newItems = [...content.testimonials.items];
                            newItems[index] = {...item, quote: e.target.value};
                            setContent({...content, testimonials: {...content.testimonials, items: newItems}});
                          }}
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Auteur</label>
                        <Input
                          value={item.author}
                          onChange={(e) => {
                            const newItems = [...content.testimonials.items];
                            newItems[index] = {...item, author: e.target.value};
                            setContent({...content, testimonials: {...content.testimonials, items: newItems}});
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Rol</label>
                        <Input
                          value={item.role}
                          onChange={(e) => {
                            const newItems = [...content.testimonials.items];
                            newItems[index] = {...item, role: e.target.value};
                            setContent({...content, testimonials: {...content.testimonials, items: newItems}});
                          }}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Pricing Section */}
          <TabsContent value="pricing">
            <Card className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Pricing</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Titel</label>
                  <Input
                    value={content.pricing.title}
                    onChange={(e) => setContent({...content, pricing: {...content.pricing, title: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Beschrijving</label>
                  <Textarea
                    value={content.pricing.description}
                    onChange={(e) => setContent({...content, pricing: {...content.pricing, description: e.target.value}})}
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Footer Tekst</label>
                  <Input
                    value={content.pricing.footer}
                    onChange={(e) => setContent({...content, pricing: {...content.pricing, footer: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Knop Tekst</label>
                  <Input
                    value={content.pricing.buttonText}
                    onChange={(e) => setContent({...content, pricing: {...content.pricing, buttonText: e.target.value}})}
                    placeholder="Bijv: Start Free Trial"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Knop URL</label>
                  <Input
                    value={content.pricing.buttonUrl}
                    onChange={(e) => setContent({...content, pricing: {...content.pricing, buttonUrl: e.target.value}})}
                    placeholder="Bijv: https://app.tickedify.com/register"
                  />
                </div>

                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Plans</label>
                    <Button
                      size="sm"
                      onClick={() => {
                        const newPlans = [...content.pricing.plans, { name: "", icon: "star", monthlyPrice: "", yearlyPrice: "", description: "", highlighted: false, highlightLabel: "" }];
                        setContent({...content, pricing: {...content.pricing, plans: newPlans}});
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Voeg Plan Toe
                    </Button>
                  </div>

                  {content.pricing.plans.map((plan, index) => (
                    <Card key={index} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Plan {index + 1}</h4>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const newPlans = content.pricing.plans.filter((_, i) => i !== index);
                            setContent({...content, pricing: {...content.pricing, plans: newPlans}});
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Naam</label>
                        <Input
                          value={plan.name}
                          onChange={(e) => {
                            const newPlans = [...content.pricing.plans];
                            newPlans[index] = {...plan, name: e.target.value};
                            setContent({...content, pricing: {...content.pricing, plans: newPlans}});
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Maandprijs (of leeglaten)</label>
                          <Input
                            value={plan.monthlyPrice || ""}
                            onChange={(e) => {
                              const newPlans = [...content.pricing.plans];
                              newPlans[index] = {...plan, monthlyPrice: e.target.value || null};
                              setContent({...content, pricing: {...content.pricing, plans: newPlans}});
                            }}
                            placeholder="€7"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Jaarprijs (of leeglaten)</label>
                          <Input
                            value={plan.yearlyPrice || ""}
                            onChange={(e) => {
                              const newPlans = [...content.pricing.plans];
                              newPlans[index] = {...plan, yearlyPrice: e.target.value || null};
                              setContent({...content, pricing: {...content.pricing, plans: newPlans}});
                            }}
                            placeholder="€70"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Beschrijving</label>
                        <Textarea
                          value={plan.description}
                          onChange={(e) => {
                            const newPlans = [...content.pricing.plans];
                            newPlans[index] = {...plan, description: e.target.value};
                            setContent({...content, pricing: {...content.pricing, plans: newPlans}});
                          }}
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Icoon</label>
                        <Input
                          value={plan.icon || ""}
                          onChange={(e) => {
                            const newPlans = [...content.pricing.plans];
                            newPlans[index] = {...plan, icon: e.target.value};
                            setContent({...content, pricing: {...content.pricing, plans: newPlans}});
                          }}
                          placeholder="Bijv: gift, star, rocket"
                        />
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`highlight-${index}`}
                            checked={plan.highlighted || false}
                            onChange={(e) => {
                              const newPlans = [...content.pricing.plans];
                              newPlans[index] = {...plan, highlighted: e.target.checked};
                              setContent({...content, pricing: {...content.pricing, plans: newPlans}});
                            }}
                            className="w-4 h-4"
                          />
                          <label htmlFor={`highlight-${index}`} className="text-sm font-medium">Highlight dit plan</label>
                        </div>
                      </div>
                      {plan.highlighted && (
                        <div>
                          <label className="block text-sm font-medium mb-2">Highlight Label</label>
                          <Input
                            value={plan.highlightLabel || ""}
                            onChange={(e) => {
                              const newPlans = [...content.pricing.plans];
                              newPlans[index] = {...plan, highlightLabel: e.target.value};
                              setContent({...content, pricing: {...content.pricing, plans: newPlans}});
                            }}
                            placeholder="Bijv: Meest gekozen"
                          />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* CTA Section */}
          <TabsContent value="cta">
            <Card className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">CTA Sectie</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Titel</label>
                  <Input
                    value={content.cta.title}
                    onChange={(e) => setContent({...content, cta: {...content.cta, title: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Beschrijving</label>
                  <Textarea
                    value={content.cta.description}
                    onChange={(e) => setContent({...content, cta: {...content.cta, description: e.target.value}})}
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Button Tekst</label>
                  <Input
                    value={content.cta.button}
                    onChange={(e) => setContent({...content, cta: {...content.cta, button: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Button URL</label>
                  <Input
                    value={content.cta.buttonUrl}
                    onChange={(e) => setContent({...content, cta: {...content.cta, buttonUrl: e.target.value}})}
                    placeholder="https://app.tickedify.com/register"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Footer Section */}
          <TabsContent value="footer">
            <Card className="p-6 space-y-4">
              <h2 className="text-2xl font-bold">Footer</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Titel</label>
                  <Input
                    value={content.footer.title}
                    onChange={(e) => setContent({...content, footer: {...content.footer, title: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tagline</label>
                  <Input
                    value={content.footer.tagline}
                    onChange={(e) => setContent({...content, footer: {...content.footer, tagline: e.target.value}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    value={content.footer.email}
                    onChange={(e) => setContent({...content, footer: {...content.footer, email: e.target.value}})}
                  />
                </div>

                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Links</label>
                    <Button
                      size="sm"
                      onClick={() => {
                        const newLinks = [...content.footer.links, { text: "", url: "" }];
                        setContent({...content, footer: {...content.footer, links: newLinks}});
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Voeg Link Toe
                    </Button>
                  </div>

                  {content.footer.links.map((link, index) => (
                    <Card key={index} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Link {index + 1}</h4>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const newLinks = content.footer.links.filter((_, i) => i !== index);
                            setContent({...content, footer: {...content.footer, links: newLinks}});
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Tekst</label>
                        <Input
                          value={link.text}
                          onChange={(e) => {
                            const newLinks = [...content.footer.links];
                            newLinks[index] = {...link, text: e.target.value};
                            setContent({...content, footer: {...content.footer, links: newLinks}});
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">URL</label>
                        <Input
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...content.footer.links];
                            newLinks[index] = {...link, url: e.target.value};
                            setContent({...content, footer: {...content.footer, links: newLinks}});
                          }}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Image Selection Modal */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecteer een afbeelding</DialogTitle>
            <DialogDescription>
              Klik op een afbeelding om deze te selecteren
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {availableImages.length === 0 ? (
              <div className="col-span-3 text-center py-8 text-muted-foreground">
                Geen afbeeldingen gevonden. Upload eerst een afbeelding.
              </div>
            ) : (
              availableImages.map((image, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-2 cursor-pointer hover:border-primary hover:bg-accent/5 transition-colors"
                  onClick={() => selectImage(image.path)}
                >
                  <img
                    src={image.path}
                    alt={image.filename}
                    className="w-full h-32 object-contain rounded mb-2"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <p className="text-xs text-center truncate" title={image.filename}>
                    {image.filename}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default CmsDashboard;
