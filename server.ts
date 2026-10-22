import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'registrations_store.json');
const PHOTOS_FILE = path.join(__dirname, 'card_photos_store.json');

function readCardPhotos(): Record<string, Record<string, string>> {
  try {
    if (fs.existsSync(PHOTOS_FILE)) {
      const raw = fs.readFileSync(PHOTOS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
  } catch {
    // Ignore read error
  }
  return {};
}

function writeCardPhotos(store: Record<string, Record<string, string>>): void {
  try {
    fs.writeFileSync(PHOTOS_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // Ignore write error
  }
}

function readRegistrations(): unknown[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [];
      const photosStore = readCardPhotos();
      return items.map((item: any) => {
        if (item && item.id && photosStore[item.id]) {
          return {
            ...item,
            fotoPeserta: { ...(item.fotoPeserta || {}), ...photosStore[item.id] },
          };
        }
        return item;
      });
    }
  } catch {
    // Ignore read error
  }
  return [];
}

function writeRegistrations(items: unknown[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch {
    // Ignore write error
  }
}

async function startServer() {
  const app = express();
  
  const portArgIndex = process.argv.indexOf('--port');
  const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1], 10) : NaN;
  const PORT = !isNaN(cliPort) && cliPort > 0 ? cliPort : 3000;

  // Support large base64 payment receipt and participant photos
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/registrations', (_req, res) => {
    const items = readRegistrations();
    res.json({ registrations: items });
  });

  app.post('/api/registrations', (req, res) => {
    const newReg = req.body;
    if (!newReg || !newReg.id) {
      res.status(400).json({ error: 'Data pendaftaran tidak valid' });
      return;
    }
    const items = readRegistrations() as Array<{ id: string }>;
    const updated = [newReg, ...items.filter((i) => i.id !== newReg.id)];
    writeRegistrations(updated);
    res.json({ success: true, registration: newReg });
  });

  app.patch('/api/registrations/:id/verify', (req, res) => {
    const { id } = req.params;
    const items = readRegistrations() as Array<{
      id: string;
      statusVerifikasi?: string;
    }>;
    const updated = items.map((item) =>
      item.id === id
        ? {
            ...item,
            statusVerifikasi:
              item.statusVerifikasi === 'Terverifikasi'
                ? 'Menunggu Verifikasi'
                : 'Terverifikasi',
          }
        : item
    );
    writeRegistrations(updated);
    res.json({ success: true, registrations: updated });
  });

  app.put('/api/registrations/:id', (req, res) => {
    const { id } = req.params;
    const updatedReg = req.body;
    if (!updatedReg || !updatedReg.id) {
      res.status(400).json({ error: 'Data pendaftaran tidak valid' });
      return;
    }
    const items = readRegistrations() as Array<{ id: string; fotoPeserta?: Record<string, string> }>;
    const photosStore = readCardPhotos();
    const existingPhotos = photosStore[id] || {};
    const mergedPhotos = { ...existingPhotos, ...(updatedReg.fotoPeserta || {}) };

    if (Object.keys(mergedPhotos).length > 0) {
      photosStore[id] = mergedPhotos;
      writeCardPhotos(photosStore);
    }

    const updated = items.map((i) =>
      i.id === id
        ? {
            ...i,
            ...updatedReg,
            fotoPeserta: mergedPhotos,
          }
        : i
    );
    writeRegistrations(updated);
    res.json({ success: true, registration: { ...updatedReg, fotoPeserta: mergedPhotos } });
  });

  app.delete('/api/registrations/:id', (req, res) => {
    const { id } = req.params;
    const items = readRegistrations() as Array<{ id: string }>;
    const updated = items.filter((item) => item.id !== id);
    writeRegistrations(updated);
    res.json({ success: true, registrations: updated });
  });

  // Photo persistence endpoints for Participant and Leader Cards
  app.get('/api/registrations/:id/photos', (req, res) => {
    const { id } = req.params;
    const store = readCardPhotos();
    res.json({ success: true, photos: store[id] || {} });
  });

  app.post('/api/registrations/:id/photos', (req, res) => {
    const { id } = req.params;
    const { photos, cardId, photoDataUrl } = req.body || {};
    const store = readCardPhotos();
    if (!store[id]) {
      store[id] = {};
    }
    if (photos && typeof photos === 'object') {
      store[id] = { ...store[id], ...photos };
    } else if (cardId && typeof photoDataUrl === 'string') {
      store[id][cardId] = photoDataUrl;
    }
    writeCardPhotos(store);

    // Also sync into registrations store
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((item: any) =>
            item && item.id === id ? { ...item, fotoPeserta: store[id] } : item
          );
          fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');
        }
      }
    } catch {
      // Ignore write error
    }

    res.json({ success: true, photos: store[id] });
  });

  app.delete('/api/registrations/:id/photos/:cardId', (req, res) => {
    const { id, cardId } = req.params;
    const store = readCardPhotos();
    if (store[id] && store[id][cardId]) {
      delete store[id][cardId];
      writeCardPhotos(store);

      try {
        if (fs.existsSync(DATA_FILE)) {
          const raw = fs.readFileSync(DATA_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const updated = parsed.map((item: any) =>
              item && item.id === id ? { ...item, fotoPeserta: store[id] } : item
            );
            fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), 'utf-8');
          }
        }
      } catch {
        // Ignore write error
      }
    }
    res.json({ success: true, photos: store[id] || {} });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
  });

  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
  process.on('SIGINT', () => {
    server.close(() => process.exit(0));
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
