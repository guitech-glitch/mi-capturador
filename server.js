const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir el archivo HTML
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('Usuario conectado');

    socket.on('analizar', async (url) => {
        let browser;
        try {
            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            
            // Interceptar peticiones de red
            await page.setRequestInterception(true);
            page.on('request', request => {
                const link = request.url();
                // Filtramos por extensiones multimedia y flujos de video
                if (link.match(/\.(mp4|m3u8|mp3|webm|ts|mkv|m4s)/i)) {
                    socket.emit('enlace_encontrado', link);
                }
                request.continue();
            });

            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            socket.emit('finalizado', 'Análisis completado');

        } catch (error) {
            socket.emit('error', 'Error: ' + error.message);
        } finally {
            if (browser) await browser.close();
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
