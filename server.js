const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const GIGACHAT_KEY = 'MDE5ZWUyMGItNDczZS03Y2JhLTg1MTEtNmQzYzI2OWU2Mjc5Ojg2ODBjYTNjLWY3MWEtNGI1Mi1iOGE4LWFmZTQ0MjkyMTA2Nw==';

// Получить токен GigaChat
async function getToken() {
  const res = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${GIGACHAT_KEY}`,
      'RqUID': crypto.randomUUID(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'scope=GIGACHAT_API_PERS',
    // GigaChat использует самоподписанный сертификат
    agent: new (require('https').Agent)({ rejectUnauthorized: false })
  });
  const data = await res.json();
  return data.access_token;
}

// Анализ фото лица
app.post('/analyze', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    const token = await getToken();

    const response = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'GigaChat-Pro',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}` }
            },
            {
              type: 'text',
              text: `Ты профессиональный барбер. Проанализируй форму лица на фото и порекомендуй 3 мужские стрижки.
Ответь ТОЛЬКО в JSON без markdown:
{
  "face_shape": "форма лица",
  "hair_type": "тип волос",
  "summary": "2-3 предложения о лице и стрижках",
  "cuts": [
    {"name": "Название по-русски", "name_en": "English name", "why": "почему подходит", "pexels_query": "men haircut barbershop"},
    {"name": "Вторая", "name_en": "Second", "why": "почему", "pexels_query": "query"},
    {"name": "Третья", "name_en": "Third", "why": "почему", "pexels_query": "query"}
  ]
}`
            }
          ]
        }],
        temperature: 0.4,
        max_tokens: 1200
      }),
      agent: new (require('https').Agent)({ rejectUnorganized: false })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Не удалось распарсить ответ');
    res.json(JSON.parse(jsonMatch[0]));

  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Генерация стрижки на фото
app.post('/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    const token = await getToken();

    const response = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'GigaChat-Pro',
        messages: [{
          role: 'user',
          content: prompt
        }],
        function_call: 'auto',
        functions: [{
          name: 'text2image',
          description: 'Генерация изображения',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Описание изображения' }
            },
            required: ['query']
          }
        }]
      }),
      agent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    const data = await response.json();
    res.json(data);

  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
