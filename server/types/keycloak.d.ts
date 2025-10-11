import "express";
import { Grant } from "keycloak-connect";

declare global {
  namespace Express {
    interface Request {
      kauth?: {
        grant?: Grant;
      };
      logout: () => void;
    }
  }
}

