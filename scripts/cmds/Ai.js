¥cmd install ai.js const axios = require('axios');
const moment = require('moment-timezone');
const { google } = require("googleapis");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const stream = require("stream");
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');

dotenv.config({ override: true });

// Configuration de l'API Gemini
const API_KEY = "AIzaSyCnuhpDQAz7HCPw1O3Ri8O7RDevB0fUFpg";
const model = "gemini-1.5-flash-latest";
const GENAI_DISCOVERY_URL = `https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta&key=${API_KEY}`;

// Configuration initiale
const UPoLPrefix = ['edu', 'ai', 'bot', 'ask'];
const MAX_HISTORY = 25; // Mémoire de 25 messages par utilisateur

// Mapping des fuseaux horaires
const timezoneMap = {
  france: 'Europe/Paris',
  cameroun: 'Africa/Douala',
  algérie: 'Africa/Algiers',
  maroc: 'Africa/Casablanca',
  tunisie: 'Africa/Tunis',
  sénégal: 'Africa/Dakar',
  côte_d_ivoire: 'Africa/Abidjan',
  burkina_faso: 'Africa/Ouagadougou',
  mali: 'Africa/Bamako',
  niger: 'Africa/Niamey',
  tchad: 'Africa/Ndjamena',
  bénin: 'Africa/Porto-Novo',
  togo: 'Africa/Lome',
  ghana: 'Africa/Accra',
  nigéria: 'Africa/Lagos',
  afrique_du_sud: 'Africa/Johannesburg',
  égypte: 'Africa/Cairo',
  kenya: 'Africa/Nairobi',
  éthiopie: 'Africa/Addis_Ababa',
  rwanda: 'Africa/Kigali',
  tanzanie: 'Africa/Dar_es_Salaam',
  ouganda: 'Africa/Kampala',
  angola: 'Africa/Luanda',
  rdcongo: 'Africa/Kinshasa',
  congo: 'Africa/Brazzaville',
  gabon: 'Africa/Libreville',
  zambie: 'Africa/Lusaka',
  zimbabwe: 'Africa/Harare',
  botswana: 'Africa/Gaborone',
  namibie: 'Africa/Windhoek',
  madagascar: 'Indian/Antananarivo',
  maurice: 'Indian/Mauritius',
};

const paysMasculins = [
  'togo', 'cameroun', 'maroc', 'mali', 'niger', 'tchad', 'bénin', 'ghana',
  'nigéria', 'congo', 'rdcongo', 'burkina_faso', 'zimbabwe', 'botswana',
  'namibie', 'angola', 'zambie'
];

// Fonctions utilitaires
async function imageUrlToBase64(url) {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (error) {
    console.error("Erreur de conversion d'image:", error);
    return null;
  }
}

async function uploadImageAndGetFileData(genaiService, auth, imageUrl) {
  if (!imageUrl || !imageUrl.startsWith("http")) return null;
  
  try {
    const imageBase64 = await imageUrlToBase64(imageUrl);
    if (!imageBase64) return null;
    
    const bufferStream = new stream.PassThrough();
    bufferStream.end(Buffer.from(imageBase64, "base64"));
    
    const media = { mimeType: "image/png", body: bufferStream };
    const body = { file: { displayName: "Uploaded Image" } };
    
    const createFileResponse = await genaiService.media.upload({
      media,
      auth,
      requestBody: body,
    });
    
    return createFileResponse.data.file;
  } catch (error) {
    console.error("Erreur d'upload d'image:", error);
    return null;
  }
}

function getHistoryFilePath(uid) {
  const dirPath = path.join(__dirname, 'uids');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return path.join(dirPath, `${uid}_gemini_history.json`);
}

function loadChatHistory(uid) {
  const historyFile = getHistoryFilePath(uid);
  
  try {
    if (fs.existsSync(historyFile)) {
      const data = fs.readFileSync(historyFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Erreur de chargement de l'historique:", error);
  }
  
  return [];
}

function saveChatHistory(uid, history) {
  const historyFile = getHistoryFilePath(uid);
  
  try {
    // Limite l'historique à MAX_HISTORY messages
    const truncatedHistory = history.slice(-MAX_HISTORY);
    fs.writeFileSync(historyFile, JSON.stringify(truncatedHistory, null, 2));
    return true;
  } catch (error) {
    console.error("Erreur de sauvegarde de l'historique:", error);
    return false;
  }
}

function cleanAllHistories() {
  const historyDir = path.join(__dirname, 'uids');
  
  try {
    if (fs.existsSync(historyDir)) {
      // Supprime tous les fichiers dans le dossier
      const files = fs.readdirSync(historyDir);
      for (const file of files) {
        fs.unlinkSync(path.join(historyDir, file));
      }
      return true;
    }
  } catch (error) {
    console.error("Erreur de suppression de l'historique:", error);
  }
  
  return false;
}

async function getGeminiResponse(uid, prompt, fileUrls = []) {
  try {
    const genaiService = await google.discoverAPI({ url: GENAI_DISCOVERY_URL });
    const auth = new google.auth.GoogleAuth().fromAPIKey(API_KEY);
    
    // Charger l'historique complet
    let chatHistory = loadChatHistory(uid);
    
    // Ajouter un message système en français si l'historique est vide
    if (chatHistory.length === 0) {
      chatHistory = [
        {
          role: "user",
          parts: [{ 
            text: "Tu es Megan Education, un assistant IA francophone. " +
                  "Réponds toujours en français sauf si l'utilisateur pose une question dans une autre langue. " +
                  "Sois concis, précis et utile."
          }]
        },
        {
          role: "model",
          parts: [{ text: "D'accord, je suis prêt. Je répondrai en français par défaut." }]
        }
      ];
    }
    
    // Préparer les fichiers pour la requête actuelle uniquement
    const fileDataParts = [];
    for (const fileUrl of fileUrls) {
      if (fileUrl) {
        const fileData = await uploadImageAndGetFileData(genaiService, auth, fileUrl);
        if (fileData) {
          fileDataParts.push({
            file_data: {
              file_uri: fileData.uri,
              mime_type: fileData.mimeType
            }
          });
        }
      }
    }
    
    // Construire le contenu avec l'historique complet
    const contents = {
      contents: [
        // Ajouter tout l'historique de conversation
        ...chatHistory.map(msg => ({
          role: msg.role,
          parts: msg.parts
        })),
        // Ajouter la nouvelle requête
        {
          role: "user",
          parts: [
            { text: prompt },
            ...fileDataParts
          ],
        }
      ],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
      generation_config: {
        maxOutputTokens: 10000,
        temperature: 0.9,
        topP: 0.95,
        topK: 64,
      },
    };
    
    // Envoyer la requête
    const response = await genaiService.models.generateContent({
      model: `models/${model}`,
      requestBody: contents,
      auth: auth,
    });
    
    const modelResponse = response.data.candidates[0].content.parts[0].text;
    
    // Mettre à jour l'historique
    const newHistory = [
      ...chatHistory,
      { 
        role: "user", 
        parts: [
          { text: prompt },
          ...fileDataParts.map(p => ({ file_data: p.file_data }))
        ] 
      },
      { 
        role: "model", 
        parts: [{ text: modelResponse }] 
      }
    ];
    
    saveChatHistory(uid, newHistory);
    
    return modelResponse;
  } catch (error) {
    console.error("Erreur Gemini:", error);
    throw error;
  }
}

// Fonction de fallback améliorée
async function getFallbackResponse(prompt) {
  try {
    const response = await axios.get(
      `https://sandipbaruwal.onrender.com/gemini?prompt=${encodeURIComponent(prompt)}`,
      { timeout: 10000 }
    );
    return response.data.answer || "Je n'ai pas pu trouver de réponse.";
  } catch (error) {
    return "Désolé, je n'arrive pas à traiter ta demande pour le moment 💔";
  }
}

// Fonction principale pour gérer les requêtes AI
async function handleAIRequest({ api, message, event, prompt, fileUrls = [] }) {
  const uid = event.senderID;
  
  // Réaction "en train de réfléchir"
  api.setMessageReaction("😵‍💫", event.messageID, () => {}, true);

  try {
    // Essayer Gemini en premier
    const response = await getGeminiResponse(uid, prompt, fileUrls);
    api.setMessageReaction("🤠", event.messageID, () => {}, true);
    
    // Envoyer la réponse
    const replyMessage = await message.reply(`『 𝐏𝐑𝐎𝐉𝐄𝐓 𝐃𝐄𝐗𝐓𝐄𝐔𝐑 』\n━━━━━━━━━━━━━━━━━━\n${response}`);
    
    // Enregistrer pour le système de réponse
    if (replyMessage && replyMessage.messageID) {
      global.GoatBot.onReply.set(replyMessage.messageID, {
        commandName: "ai",
        author: event.senderID,
        threadID: event.threadID
      });
    }
  } catch (error) {
    // Fallback si Gemini échoue
    try {
      const fallbackResponse = await getFallbackResponse(prompt);
      api.setMessageReaction("⚠", event.messageID, () => {}, true);
      const replyMessage = await message.reply(`『 𝐏𝐑𝐎𝐉𝐄𝐓 𝐃𝐄𝐗𝐓𝐄𝐔𝐑 』\n━━━━━━━━━━━━━━━━━━\n${fallbackResponse}`);
      
      // Enregistrer pour le système de réponse
      if (replyMessage && replyMessage.messageID) {
        global.GoatBot.onReply.set(replyMessage.messageID, {
          commandName: "ai",
          author: event.senderID,
          threadID: event.threadID
        });
      }
    } catch (fallbackError) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("『 𝐏𝐑𝐎𝐉𝐄𝐓 𝐃𝐄𝐗𝐓𝐄𝐔𝐑 』\n━━━━━━━━━━━━━━━━━━\n❌ Désolé, une erreur critique est survenue");
    }
  }
}

// Système de verrou pour éviter les doubles réponses
const activeRequests = new Set();

module.exports = {
  config: {
    name: 'ai',
    version: '8.0.0',
    role: 0,
    category: 'AI',
    author: 'Metoushela Walker',
    shortDescription: 'Super IA avec intelligence améliorée',
    longDescription: 'Assistant IA ultra-intelligent en français avec système de réponse continue',
  },

  onStart: async function () {},

  onChat: async function ({ api, message, event, args }) {
    const body = event.body || '';
    
    // Vérifier le préfixe
    const ahprefix = UPoLPrefix.find(p => body.toLowerCase().startsWith(p));
    if (!ahprefix) return;

    const fullCommand = body.substring(ahprefix.length).trim();

    // Détection des commandes de nettoyage
    const cleanCommands = ['clean all', 'effacer historique', 'supprimer mémoire', 'reset mémoire', 'clear all'];
    if (cleanCommands.some(cmd => fullCommand.toLowerCase().includes(cmd))) {
      const success = cleanAllHistories();
      return message.reply(
        success ? "『 𝐏𝐑𝐎𝐉𝐄𝐓 𝐃𝐄𝐗𝐓𝐄𝐔𝐑 』\n━━━━━━━━━━━━━━━━━━\n✅ Mémoire effacée avec succès !" : 
                 "『 𝐏𝐑𝐎𝐉𝐄𝐓 𝐃𝐄𝐗𝐓𝐄𝐔𝐑 』\n━━━━━━━━━━━━━━━━━━\n❌ Échec de la suppression de la mémoire"
      );
    }

    // Gestion de la date/heure
    const isTimeQuestion = /(quel(le)? heure|date|année|mois|jour)/i.test(fullCommand);
    if (isTimeQuestion) {
      let country = 'france';
      for (const key in timezoneMap) {
        if (new RegExp(key, 'i').test(fullCommand)) {
          country = key;
          break;
        }
      }

      const timezone = timezoneMap[country] || 'Europe/Paris';
      const now = moment().tz(timezone).locale('fr');
      const dateStr = now.format('dddd D MMMM YYYY');
      const timeStr = now.format('HH:mm:ss');
      const countryName = country.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const preposition = paysMasculins.includes(country) ? 'au' : 'en';

      return message.reply(
        `『 𝐏𝐑𝐎𝐉𝐄𝐓 𝐃𝐄𝐗𝐓𝐄𝐔𝐑 』\n━━━━━━━━━━━━━━━━━━\n📅 Nous sommes le ${dateStr}\n🕒 Il est ${timeStr} ${preposition} ${countryName}`
      );
    }

    // Préparation des fichiers
    let fileUrls = [];
    if (event.type === "message_reply" && event.messageReply.attachments) {
      fileUrls = event.messageReply.attachments
        .filter(att => att.type === "photo" || att.type === "video" || att.type === "audio")
        .map(att => att.url);
    } else if (event.attachments) {
      fileUrls = event.attachments
        .filter(att => att.type === "photo" || att.type === "video" || att.type === "audio")
        .map(att => att.url);
    }

    // Créer un ID unique pour cette requête
    const requestId = `${event.threadID}_${event.senderID}_${Date.now()}`;
    
    // Vérifier si cette requête est déjà en cours
    if (activeRequests.has(requestId)) return;
    activeRequests.add(requestId);

    try {
      // Traiter la requête AI
      await handleAIRequest({ 
        api, 
        message, 
        event, 
        prompt: fullCommand, 
        fileUrls 
      });
    } finally {
      // Nettoyer après traitement
      activeRequests.delete(requestId);
    }
  },

  onReply: async function ({ api, message, event, Reply }) {
    // Créer un ID unique pour cette requête
    const requestId = `${event.threadID}_${event.senderID}_${Date.now()}`;
    
    // Vérifier si cette requête est déjà en cours
    if (activeRequests.has(requestId)) return;
    activeRequests.add(requestId);

    try {
      // Vérifier si c'est une réponse à un message du bot
      if (event.type !== "message_reply" || event.messageReply.senderID !== api.getCurrentUserID()) {
        return;
      }

      const { commandName, author } = Reply;
      if (commandName !== this.config.name) return;
      if (author !== event.senderID) return;

      const prompt = event.body.trim();
      if (!prompt) return;

      // Préparation des fichiers
      let fileUrls = [];
      if (event.attachments) {
        fileUrls = event.attachments
          .filter(att => att.type === "photo" || att.type === "video" || att.type === "audio")
          .map(att => att.url);
      }

      // Traiter la requête AI
      await handleAIRequest({ 
        api, 
        message, 
        event, 
        prompt, 
        fileUrls 
      });
    } finally {
      // Nettoyer après traitement
      activeRequests.delete(requestId);
    }
  }
};
