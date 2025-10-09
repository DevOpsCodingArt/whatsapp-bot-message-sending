const express = require("express");
const cors = require("cors");
const { Builder, By, until, Key } = require("selenium-webdriver");
const { GoogleGenAI } = require("@google/genai");
const ws = require("ws");
const app = express();
const PORT = 3000;
const ai = new GoogleGenAI({
  apiKey: "",
});
const webSocketServer = new ws.Server({ port: 8080 });

webSocketServer.on("connection", () => {
  console.log("WebSocket connection established");
});

const broadcastStatus = (status) => {
  if (!status) return;
  webSocketServer.clients.forEach((client) => {
    if (client.readyState === ws.OPEN) {
      client.send(JSON.stringify({ status }));
    }
  });
};

const WORD_LENGTH_GUIDANCE = {
  short: "Keep it between 50 and 100 words.",
  medium: "Keep it between 100 and 200 words.",
  long: "Keep it between 200 and 400 words.",
};
app.use(cors());
app.use(express.json());

let driver;

app.get("/connect-whatsapp", async (req, res) => {
  driver = await openBrowser();
  await driver.get("https://web.whatsapp.com");
  const element = await driver.wait(
    until.elementLocated(By.css("span[aria-label='WhatsApp']")),
    30000
  );
  if (element) {
    res.json({ success: true });
  } else {
    res
      .status(404)
      .json({ success: false, error: "WhatsApp element not found" });
  }
});

app.post("/send-messages", async (req, res) => {
  const { recipients = "", message = "", media = "" } = req.body || {};

  if (!driver) {
    return res.status(400).json({
      success: false,
      error: "WhatsApp is not connected. Please call /connect-whatsapp first.",
    });
  }

  try {
    const toArray = (value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        return value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
      return [];
    };

    const recipientsList = toArray(recipients);

    if (!recipientsList.length) {
      return res.status(400).json({
        success: false,
        error: "No valid recipients provided.",
      });
    }

    broadcastStatus(
      `Starting to send messages to ${recipientsList.length} recipient(s)`
    );

    let sentCount = 0;

    for (const recipient of recipientsList) {
      try {
        await driver.get(`https://web.whatsapp.com/send?phone=${recipient}`);
        await driver.wait(
          until.elementLocated(
            By.xpath(
              "//div[@role='textbox' and @contenteditable='true' and @aria-placeholder='Type a message']"
            )
          ),
          20000
        );

        const chatbox = await driver.findElement(
          By.xpath(
            "//div[@role='textbox' and @contenteditable='true' and @aria-placeholder='Type a message']"
          )
        );

        if (media) {
          if (message) {
            await chatbox.sendKeys(message);
            await driver.sleep(2000);
          }

          const attach = await driver.findElement(
            By.xpath("//span[@data-icon='plus-rounded']")
          );
          await attach.click();
          await driver.sleep(2000);

          const mediapath = await driver.findElement(
            By.xpath(
              "//input[@accept='image/*,video/mp4,video/3gpp,video/quicktime']"
            )
          );
          await mediapath.sendKeys(media);
          await driver.sleep(2000);

          const sendbtn = await driver.findElement(
            By.xpath("//span[@data-icon='wds-ic-send-filled']")
          );
          await sendbtn.click();
          await driver.sleep(3000);
        } else if (message) {
          await chatbox.sendKeys(message);
          await driver.sleep(2000);
          await chatbox.sendKeys(Key.ENTER);
          await driver.sleep(3000);
        } else {
          throw new Error("No message or media provided to send.");
        }

        sentCount += 1;

        broadcastStatus(
          `Message ${sentCount}/${recipientsList.length} sent to ${recipient}`
        );
      } catch (error) {
        console.error(`Failed to send message to ${recipient}:`, error.message);
        broadcastStatus(`Failed to send to ${recipient}`);
      }
    }

    broadcastStatus(
      `✅ Completed! Sent ${sentCount}/${recipientsList.length} messages`
    );

    res.json({
      success: true,
      recipients: recipientsList,
      message,
      media,
      sentCount,
    });
  } catch (err) {
    console.error("Error in send-messages:", err);
    res.status(500).json({ success: false, error: err.message || err });
  }
});

app.post("/generate-message", async (req, res) => {
  try {
    const { prompt, language, wordLength, tone } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const aiResponse = await main({ prompt, language, wordLength, tone });

    if (!aiResponse) {
      return res
        .status(502)
        .json({ error: "AI service returned an empty response." });
    }

    res.json({ message: aiResponse });
  } catch (error) {
    console.error("generate-message error:", error);
    res.status(500).json({ error: "Failed to generate AI content." });
  }
});

async function openBrowser() {
  driver = await new Builder().forBrowser("chrome").build();
  return driver;
}

const main = async function ({ prompt, language, wordLength, tone }) {
  const languageClause = language
    ? `Write the email in ${language}.`
    : "Write the email in English.";
  const toneClause = tone
    ? `Adopt a ${tone.toLowerCase()} tone.`
    : "Use a friendly and professional tone.";
  const lengthClause =
    WORD_LENGTH_GUIDANCE[wordLength] || "Keep the length under 200 words.";

  const systemPrompt = `Act as an expert email marketer. Craft a concise email about: "${prompt}". ${toneClause} ${languageClause} ${lengthClause} Do not include a subject line. Provide plain text only.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: systemPrompt,
  });

  let text = "";
  try {
    if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = response.candidates[0].content.parts[0].text;
    } else if (response?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = response.response.candidates[0].content.parts[0].text;
    } else if (typeof response?.text === "function") {
      text = await response.text();
    } else if (typeof response?.response?.text === "function") {
      text = await response.response.text();
    }
  } catch (e) {
    console.error("Error extracting AI text:", e);
  }
  return text || "No message generated.";
};
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
