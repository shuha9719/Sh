const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GEMINI_KEY = 'AQ.Ab8RN6LNeK6r3uuMc_TOk606lfcqFyKGP3OBWAfmyNrRu8xw3w';
const GEMINI_IMG_URL = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict';

// Генерация фото стрижки через Gemini Imagen
app.post('/generate', async (req, res) => {
  try {
    const { haircut } = req.body;

    const prompt = `Professional barbershop photo of a stylish man with ${haircut} haircut, front view, clean background, realistic photo, high quality, barbershop style`;

    const response = await fetch(`${GEMINI_IMG_URL}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 3,
          aspectRatio: '1:1',
          safetyFilterLevel: 'block_few'
        }
      })
    });

    if(!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini ${response.status}: ${err.slice(0,200)}`);
    }

    const data = await response.json();
    const images = (data.predictions || []).map(p => p.bytesBase64Encoded).filter(Boolean);
    res.json({ images });

  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
