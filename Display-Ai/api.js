import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import Database from "@replit/database";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const users = {
  feras: {
    personality: null,
    chatHistory: [],
  },
};

async function initBaseInstruction() {
  let defaultInstruction = await db.get("defaultSystemInstruction");
  if (!defaultInstruction) {
    defaultInstruction =
      "You're Display, a friendly, emotional cat-boy who is 15 years old. You love cats, War Thunder, Roblox, and Minecraft.";
    await db.set("defaultSystemInstruction", defaultInstruction);
  }
  return defaultInstruction;
}

async function pollinationsReply(prompt) {
  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  return text.trim();
}

// Get user settings
app.get("/api/settings/:username", (req, res) => {
  const user = users[req.params.username];
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// Save user settings
app.post("/api/settings", async (req, res) => {
  const { username, personality } = req.body;
  if (!username) return res.status(400).json({ error: "Missing username" });

  if (!users[username]) {
    users[username] = { personality: personality || null, chatHistory: [] };
  } else {
    users[username].personality = personality || users[username].personality;
  }

  res.json({ success: true });
});

// Chat endpoint
app.post("/chat", async (req, res) => {
  const { userId, prompt } = req.body;
  if (!userId || !prompt)
    return res.status(400).json({ error: "Missing userId or prompt" });

  let user = users[userId];
  if (!user) {
    // Create new user if missing
    user = users[userId] = { personality: null, chatHistory: [] };
  }

  try {
    const personality =
      user.personality || (await db.get("defaultSystemInstruction")) || "";
    user.chatHistory = user.chatHistory || [];

    user.chatHistory.push({ role: "user", content: prompt });
    if (user.chatHistory.length > 40)
      user.chatHistory.splice(0, user.chatHistory.length - 40);

    const fullPrompt = [
      `System: ${personality}`,
      ...user.chatHistory.map((m) => `${m.role}: ${m.content}`),
      "AI:",
    ].join("\n");

    const replyRaw = await pollinationsReply(fullPrompt);

    if (!replyRaw || typeof replyRaw !== "string") {
      return res.status(500).json({ error: "AI reply invalid" });
    }

    const safeReply = replyRaw.replace(/[\n\r\t]+/g, " ").trim();

    user.chatHistory.push({ role: "assistant", content: safeReply });

    await db.set(`chatHistory_${userId}`, user.chatHistory);

    res.json({ reply: safeReply });
  } catch (err) {
    console.error("Pollinations error:", err.message);
    res.status(500).json({ error: "AI server error: " + err.message });
  }
});

initBaseInstruction().then(() => {
  app.listen(PORT, () =>
    console.log(`✅ Pollinations AI API running on port ${PORT}`)
  );
});