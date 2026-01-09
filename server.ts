/**
 * Custom Server with Socket.IO
 * Banking Ticketing Portal
 * 
 * This server initializes Socket.IO alongside Next.js
 * Run with: node server.js (or ts-node server.ts)
 */

import 'dotenv/config';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeSocketServer } from './src/lib/socket-server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  try {
    await app.prepare();

    const httpServer = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });

    // Initialize Socket.IO
    const io = initializeSocketServer(httpServer);
    console.log('Socket.IO initialized');

    httpServer.listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.IO ready`);
      console.log(`> Environment: ${dev ? 'development' : 'production'}`);
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      console.log('\nShutting down gracefully...');
      httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

main();
