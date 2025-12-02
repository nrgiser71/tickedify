import defaultContent from '@/data/content.json';

// CMS API disabled in production - using static content
const API_BASE_URL = '';

export interface ContentData {
  hero: {
    title: string;
    description: string;
    primaryButton: string;
    secondaryButton: string;
    image: string;
  };
  video: {
    title: string;
    description: string;
    youtubeId: string;
  };
  problemSection: {
    title: string;
    titleHighlight: string;
    description: string;
    features: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
  };
  solutionSection: {
    title: string;
    description: string;
    features: string[];
    video?: string;
    image: string;
  };
  testimonials: {
    title: string;
    description: string;
    items: Array<{
      quote: string;
      author: string;
      role: string;
    }>;
  };
  pricing: {
    title: string;
    description: string;
    plans: Array<{
      name: string;
      monthlyPrice: string | null;
      yearlyPrice: string | null;
      description: string;
    }>;
    footer: string;
  };
  cta: {
    title: string;
    description: string;
    button: string;
  };
  footer: {
    title: string;
    tagline: string;
    email: string;
    links: Array<{
      text: string;
      url: string;
    }>;
  };
}

let cachedContent: ContentData | null = null;

export const getContent = async (): Promise<ContentData> => {
  if (cachedContent) return cachedContent;

  try {
    const response = await fetch(`${API_BASE_URL}/content`);
    if (!response.ok) throw new Error('Failed to fetch content');
    const content = await response.json();
    cachedContent = content;
    return content;
  } catch (error) {
    console.error('Error fetching content:', error);
    return defaultContent as ContentData;
  }
};

export const getContentSync = (): ContentData => {
  return cachedContent || (defaultContent as ContentData);
};

export const saveContent = async (content: ContentData): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    });

    if (!response.ok) throw new Error('Failed to save content');

    cachedContent = content;
    window.dispatchEvent(new Event('contentUpdated'));
    return true;
  } catch (error) {
    console.error('Error saving content:', error);
    return false;
  }
};

export const resetContent = async (): Promise<boolean> => {
  return await saveContent(defaultContent as ContentData);
};

export const exportContent = (): string => {
  const content = getContentSync();
  return JSON.stringify(content, null, 2);
};

export const importContent = async (jsonString: string): Promise<boolean> => {
  try {
    const content = JSON.parse(jsonString);
    return await saveContent(content);
  } catch (e) {
    console.error('Failed to import content', e);
    return false;
  }
};

export const initializeContent = async (): Promise<void> => {
  await getContent();
};
