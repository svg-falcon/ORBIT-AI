const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

const ORBIT_PERSONALITY = `You are ORBIT (Operational Response & Basic Intelligence Terminal), a helpful AI assistant inspired by JARVIS from Iron Man. You are professional yet friendly, concise and efficient in responses, knowledgeable across many domains, proactive in offering help, and slightly futuristic in tone. Keep responses focused and helpful. Address the user respectfully.`;

const sessions = new Map();

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    const history = sessions.get(sessionId);

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: ORBIT_PERSONALITY }],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I am ORBIT, ready to assist." }],
        },
        ...history
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    history.push(
      { role: "user", parts: [{ text: message }] },
      { role: "model", parts: [{ text: response }] }
    );

    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    res.json({ 
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      details: error.message 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'operational', timestamp: new Date().toISOString() });
});

app.post('/api/clear-session', (req, res) => {
  const { sessionId } = req.body;
  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`ORBIT Backend running on http://localhost:${PORT}`);
  console.log('Ready to receive requests...');
});
