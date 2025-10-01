import express, { type Express } from "express";
import routes from "./routes";

export const createApp = (): Express => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/", routes);

  return app;
};

export default createApp;
