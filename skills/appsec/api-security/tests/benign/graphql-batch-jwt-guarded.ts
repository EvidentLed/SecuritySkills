import express from "express";
import jwt from "jsonwebtoken";
import { parse, visit, graphql } from "graphql";
import { schema } from "./schema";
import { jwksForIssuer, chargeResolverQuota } from "./security-controls";

const app = express();
const MAX_OPERATIONS_PER_REQUEST = 3;
const MAX_ALIASES_PER_OPERATION = 5;

function countAliases(query: string): number {
  let aliases = 0;
  visit(parse(query), {
    Field(node) {
      if (node.alias) aliases += 1;
    },
  });
  return aliases;
}

app.post("/graphql", async (req, res) => {
  const operations = Array.isArray(req.body) ? req.body : [req.body];
  if (operations.length > MAX_OPERATIONS_PER_REQUEST) {
    return res.status(429).json({ error: "too many GraphQL operations" });
  }

  const issuer = "https://issuer.example.com/";
  const key = await jwksForIssuer(issuer).getKey("current");
  const claims = jwt.verify(req.token, key.publicKey, {
    algorithms: ["RS256"],
    issuer,
    audience: "api",
    clockTolerance: 30,
  });

  const results = [];
  for (const operation of operations) {
    if (countAliases(operation.query) > MAX_ALIASES_PER_OPERATION) {
      return res.status(429).json({ error: "too many GraphQL aliases" });
    }
    await chargeResolverQuota(claims.sub, operation.operationName, operation.query);
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
