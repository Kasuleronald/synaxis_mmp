import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import express from "express";
import session from "express-session";
import passport from "passport";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { AppModule } from "./app.module";

async function bootstrap() {
  // bodyParser: false -- Nest's default json parser caps at 100kb, which
  // rejects a base64-encoded church logo (Settings screen). Re-added below
  // with a higher limit instead.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));
  const config = app.get(ConfigService);

  // Every API route lives under /api in both dev and prod -- in dev, Vite's
  // proxy forwards /api/* here unchanged (vite.config.ts); in prod, this is
  // what lets one process serve both the built SPA and the API on the same
  // origin/port, with ServeStaticModule (app.module.ts) handling everything
  // that isn't /api*.
  app.setGlobalPrefix("api");

  app.enableCors({
    origin: config.get<string>("WEB_ORIGIN", "http://localhost:5173"),
    credentials: true,
  });

  // Sessions live in Postgres (not memory) so a server restart doesn't log
  // everyone out and multiple API instances can share session state later.
  const PgSession = connectPgSimple(session);
  const pool = new Pool({ connectionString: config.get<string>("DATABASE_URL") });

  app.use(
    session({
      store: new PgSession({ pool, createTableIfMissing: true }),
      secret: config.getOrThrow<string>("SESSION_SECRET"),
      resave: false,
      saveUninitialized: false,
      // Sliding idle-timeout: each authenticated request pushes the expiry
      // back out to a full week from now, so someone actively using the
      // system never gets logged out mid-work -- only genuine inactivity
      // for a full week actually expires the session.
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const port = config.get<number>("PORT", 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Synaxis MMP API listening on :${port}`);
}

bootstrap();
