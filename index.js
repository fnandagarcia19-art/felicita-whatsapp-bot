const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'felicita123';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (message?.type === 'text') {
      const from = message.from;
      const text = message.text.body;
      const reply = await getAIReply(text);
      await sendMessage(from, reply);
    }
  }
  res.sendStatus(200);
});

async function getAIReply(userMessage) {
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `Você é a assistente virtual do Felicità Ateliê, especializado em aluguel de vestidos de festa e noivas. 
Responda de forma simpática, elegante e objetiva em português brasileiro.
Ajude clientes com dúvidas sobre vestidos disponíveis, tamanhos, preços, reservas e agendamento de provas.
Quando a cliente estiver pronta para comprar ou reservar, informe que vai transferir para nossa equipe finalizar.`,
        messages: [{ role: 'user', content: userMessage }]
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );
    return response.data.content[0].text;
  } catch (err) {
    return 'Olá! Tive um pequeno problema técnico. Nossa equipe entrará em contato em breve. 😊';
  }
}

async function sendMessage(to, text) {
  await axios.post(
    `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text }
    },
    {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
    }
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
