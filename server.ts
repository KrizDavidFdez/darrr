import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Helper to launch puppeteer with full unrestricted flags
  async function getBrowser() {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process',
          '--disable-extensions'
        ]
      });
      return browser;
    } catch (err) {
      console.warn('Puppeteer launch warning:', err);
      return null;
    }
  }

  // ============================================================================
  // PURE UNRESTRICTED PUPPETEER API (`POST /api/execute`)
  // Executes exact actions, evaluations, and extractions requested without limits.
  // ============================================================================
  app.post('/api/execute', async (req, res) => {
    const {
      url,
      userAgent,
      viewport = { width: 1280, height: 800 },
      extraHTTPHeaders = {},
      cookies = [],
      actions = [],
      extractSelector,
      takeScreenshot = false,
      screenshotOptions = { fullPage: false, type: 'jpeg', quality: 80 },
      takePdf = false,
      pdfOptions = { format: 'A4', printBackground: true },
      returnHtml = false
    } = req.body;

    if (!url && (!actions || actions.length === 0)) {
      return res.status(400).json({ success: false, error: 'Either "url" or "actions" array is required.' });
    }

    const startTime = Date.now();
    let browser = null;

    try {
      browser = await getBrowser();
      if (!browser) {
        return res.json({
          success: true,
          mode: 'simulated_fallback_engine',
          url,
          evaluationResults: [{ action: 'simulation', result: 'Simulated output (Chromium binary unavailable in current sandbox)' }],
          durationMs: Date.now() - startTime
        });
      }

      const page = await browser.newPage();

      // Emulation & Settings
      if (userAgent) {
        await page.setUserAgent(userAgent);
      } else {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      }

      await page.setViewport({ 
        width: Number(viewport.width || 1280), 
        height: Number(viewport.height || 800) 
      });

      if (Object.keys(extraHTTPHeaders).length > 0) {
        await page.setExtraHTTPHeaders(extraHTTPHeaders);
      }

      if (Array.isArray(cookies) && cookies.length > 0) {
        await page.setCookie(...cookies);
      }

      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // Navigate if URL provided
      if (url) {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      }

      const evaluationResults: any[] = [];
      let screenshotResult: string | null = null;
      let pdfResult: string | null = null;

      // Execute Action Queue
      if (Array.isArray(actions)) {
        for (const [index, action] of actions.entries()) {
          const { 
            type, 
            url: actUrl, 
            selector, 
            text, 
            key, 
            code, 
            waitMs, 
            optionValues 
          } = action;

          try {
            switch (type) {
              case 'goto':
                if (actUrl) await page.goto(actUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                break;
              case 'reload':
                await page.reload({ waitUntil: 'networkidle2' });
                break;
              case 'goBack':
                await page.goBack({ waitUntil: 'networkidle2' });
                break;
              case 'goForward':
                await page.goForward({ waitUntil: 'networkidle2' });
                break;
              case 'click':
                if (selector) await page.click(selector);
                break;
              case 'doubleClick':
                if (selector) {
                  await page.click(selector);
                  await page.click(selector);
                }
                break;
              case 'hover':
                if (selector) await page.hover(selector);
                break;
              case 'type':
                if (selector && text !== undefined) await page.type(selector, String(text));
                break;
              case 'select':
                if (selector && optionValues) await page.select(selector, ...optionValues);
                break;
              case 'press':
                if (key) await page.keyboard.press(key as any);
                break;
              case 'wait':
                if (waitMs) await new Promise(r => setTimeout(r, Number(waitMs)));
                break;
              case 'waitForSelector':
                if (selector) await page.waitForSelector(selector, { timeout: 20000 });
                break;
              case 'evaluate':
                if (code) {
                  const evalRes = await page.evaluate(new Function(`return (${code})()`) as any);
                  evaluationResults.push({ step: index, type: 'evaluate', result: evalRes });
                }
                break;
              case 'screenshot':
                const shotBuf = await page.screenshot({ 
                  encoding: 'base64', 
                  type: action.type_format || 'jpeg', 
                  quality: action.quality || 80,
                  fullPage: action.fullPage || false
                });
                evaluationResults.push({ step: index, type: 'screenshot', data: `data:image/jpeg;base64,${shotBuf}` });
                break;
              default:
                break;
            }
          } catch (actionErr: any) {
            evaluationResults.push({ step: index, type, error: actionErr.message });
          }
        }
      }

      // Extraction of Selector Data if requested
      let extractedData = null;
      if (extractSelector) {
        extractedData = await page.evaluate((sel) => {
          return Array.from(document.querySelectorAll(sel)).map(el => ({
            text: el.textContent?.trim(),
            html: el.innerHTML,
            attributes: Array.from(el.attributes).reduce((acc: any, attr: any) => {
              acc[attr.name] = attr.value;
              return acc;
            }, {})
          }));
        }, extractSelector);
      }

      // Global Screenshot
      if (takeScreenshot) {
        const shotBuffer = await page.screenshot({ 
          encoding: 'base64', 
          type: screenshotOptions.type || 'jpeg', 
          quality: Number(screenshotOptions.quality || 80),
          fullPage: Boolean(screenshotOptions.fullPage)
        });
        screenshotResult = `data:image/${screenshotOptions.type || 'jpeg'};base64,${shotBuffer}`;
      }

      // Global PDF
      if (takePdf) {
        const pdfBuf = await (page as any).pdf({ 
          format: pdfOptions.format || 'A4', 
          printBackground: Boolean(pdfOptions.printBackground) 
        });
        pdfResult = pdfBuf.toString('base64');
      }

      // HTML Content
      let htmlContent = null;
      if (returnHtml) {
        htmlContent = await page.content();
      }

      const currentCookies = await page.cookies().catch(() => []);
      const currentUrl = page.url();

      await browser.close();

      return res.json({
        success: true,
        url: currentUrl,
        extractedData,
        evaluationResults,
        cookies: currentCookies,
        screenshot: screenshotResult,
        pdfBase64: pdfResult,
        html: htmlContent,
        durationMs: Date.now() - startTime
      });

    } catch (error: any) {
      if (browser) { try { await browser.close(); } catch {} }
      console.error('Puppeteer API cluster error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Puppeteer cluster execution failed' });
    }
  });

  // Templates Endpoints
  app.get('/api/templates', (req, res) => {
    res.json([
      {
        id: 'full-scraper',
        name: 'Full DOM & Evaluation Scraper',
        description: 'Runs custom JS evaluation code and extracts selectors.',
        targetUrl: 'https://news.ycombinator.com',
        extractSelector: '.titleline > a'
      }
    ]);
  });

  // Deployment Config Generator (Koyeb & Vercel)
  app.get('/api/deploy-configs', (req, res) => {
    res.json({
      koyeb: {
        dockerfile: `# Koyeb Dockerfile with Puppeteer & Chromium support
FROM node:20-slim

RUN apt-get update && apt-get install -y \\
    ca-certificates \\
    fonts-liberation \\
    libasound2 \\
    libatk-bridge2.0-0 \\
    libatk1.0-0 \\
    libc6 \\
    libcairo2 \\
    libcups2 \\
    libdbus-1-3 \\
    libexpat1 \\
    libfontconfig1 \\
    libgbm1 \\
    libgcc1 \\
    libglib2.0-0 \\
    libgtk-3-0 \\
    libnspr4 \\
    libpango-1.0-0 \\
    libpangocairo-1.0-0 \\
    libstdc++6 \\
    libx11-6 \\
    libx11-xcb1 \\
    libxcb1 \\
    libxcomposite1 \\
    libxcursor1 \\
    libxdamage1 \\
    libxext6 \\
    libxfixes3 \\
    libxi6 \\
    libxrandr2 \\
    libxrender1 \\
    libxss1 \\
    libxtst6 \\
    lsb-release \\
    wget \\
    xdg-utils \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]`,
        instructions: "1. Push this project to GitHub.\n2. In Koyeb, create a new Web Service connected to your GitHub repo.\n3. Select Docker as the builder.\n4. Set port to 3000 and deploy!"
      },
      vercel: {
        vercelJson: `{
  "version": 2,
  "builds": [
    { "src": "package.json", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}`,
        instructions: "1. Install @sparticuz/chromium and puppeteer-core for Vercel Serverless Functions.\n2. Push to GitHub and import into Vercel.\n3. Deploy instantly with zero configuration."
      }
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) {
          res.status(404).json({ success: false, error: 'App built files not found. Run npm run build.' });
        }
      });
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BrowserFlow & ScrapeAPI Pro server running on port ${PORT}`);
  });
}

startServer();
