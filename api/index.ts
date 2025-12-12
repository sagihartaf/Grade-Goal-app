import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "../server/routes";

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody?: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as Request).rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

registerRoutes(app);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
});

export default app;

