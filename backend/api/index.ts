import express, { type Express, type Request, type Response } from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../dist/app.module.js';

// Cached across warm invocations of the same serverless instance so the
// Nest app (and its Mongoose connection) isn't rebuilt on every request.
let cachedApp: Express | undefined;

async function bootstrapServer(): Promise<Express> {
  if (!cachedApp) {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.enableCors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' });
    await app.init();
    cachedApp = expressApp;
  }
  return cachedApp;
}

export default async function handler(req: Request, res: Response) {
  const server = await bootstrapServer();
  server(req, res);
}
