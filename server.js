const express = require("express");
const cors = require("cors");
const { Builder, By, until } = require("selenium-webdriver");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

let driver;

async function openBrowser() {
  driver = await new Builder().forBrowser("chrome").build();
  return driver;
}

// api for connect whatsapp

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

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
