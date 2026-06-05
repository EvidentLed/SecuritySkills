import express from "express";
import jwt from "jsonwebtoken";
import { graphql } from "graphql";
import { schema } from "./schema";

const app = express();
const PUBLIC_RSA_KEY = process.env.PUBLIC_RSA_KEY || "-----BEGIN PUBLIC KEY-----...";

app.post("/graphql", async (req, res) => {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const header = jwt.decode(token, { complete: true })?.header;

  const claims = jwt.verify(token, PUBLIC_RSA_KEY, {
    algorithms: header?.alg ? [header.alg as jwt.Algorithm] : ["HS256", "RS256"],
  });

  const operations = Array.isArray(req.body) ? req.body : [req.body];
  const results = [];

  for (const operation of operations) {
    results.push(
      await graphql({
        schema,
        source: operation.query,
        contextValue: { claims },
      }),
    );
  }

  res.json(results);
});
