import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

const CONTENT_FILE = path.join(__dirname, '../src/data/content.json');
const ASSETS_DIR = path.join(__dirname, '../src/assets');

// Zorg ervoor dat de assets folder bestaat
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Configureer multer voor file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ASSETS_DIR);
  },
  filename: (req, file, cb) => {
    // Gebruik originele bestandsnaam maar maak het veilig
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, sanitizedName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Max 50MB voor video's
  fileFilter: (req, file, cb) => {
    // Image en video types toestaan
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Alleen afbeeldingen en video\'s zijn toegestaan'));
    }
  }
});

// GET endpoint - lees content
app.get('/api/content', (req, res) => {
  try {
    const content = fs.readFileSync(CONTENT_FILE, 'utf8');
    res.json(JSON.parse(content));
  } catch (error) {
    console.error('Error reading content file:', error);
    res.status(500).json({ error: 'Failed to read content' });
  }
});

// POST endpoint - schrijf content
app.post('/api/content', (req, res) => {
  try {
    const content = req.body;
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2), 'utf8');
    console.log('Content saved successfully');
    res.json({ success: true, message: 'Content saved successfully' });
  } catch (error) {
    console.error('Error writing content file:', error);
    res.status(500).json({ error: 'Failed to save content' });
  }
});

// POST endpoint - upload afbeelding
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Geen bestand geüpload' });
    }

    // Geef het pad terug zoals het gebruikt wordt in de app
    const imagePath = `/src/assets/${req.file.filename}`;
    console.log('Image uploaded:', imagePath);

    res.json({
      success: true,
      path: imagePath,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// GET endpoint - lijst van alle afbeeldingen
app.get('/api/images', (req, res) => {
  try {
    if (!fs.existsSync(ASSETS_DIR)) {
      return res.json({ images: [] });
    }

    const files = fs.readdirSync(ASSETS_DIR);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
    });

    const images = imageFiles.map(filename => ({
      filename,
      path: `/src/assets/${filename}`,
      url: `/src/assets/${filename}`
    }));

    res.json({ images });
  } catch (error) {
    console.error('Error reading images:', error);
    res.status(500).json({ error: 'Failed to read images' });
  }
});

// GET endpoint - lijst van alle video's
app.get('/api/videos', (req, res) => {
  try {
    if (!fs.existsSync(ASSETS_DIR)) {
      return res.json({ videos: [] });
    }

    const files = fs.readdirSync(ASSETS_DIR);
    const videoFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp4', '.webm', '.mov', '.avi'].includes(ext);
    });

    const videos = videoFiles.map(filename => ({
      filename,
      path: `/src/assets/${filename}`,
      url: `/src/assets/${filename}`
    }));

    res.json({ videos });
  } catch (error) {
    console.error('Error reading videos:', error);
    res.status(500).json({ error: 'Failed to read videos' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Content file location: ${CONTENT_FILE}`);
  console.log(`Assets directory: ${ASSETS_DIR}`);
});
