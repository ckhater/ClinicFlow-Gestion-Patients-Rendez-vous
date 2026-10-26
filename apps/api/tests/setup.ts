import { afterAll } from "vitest";
import { prisma } from "../src/lib/prisma";

process.env.TZ = "UTC";

afterAll(async () => {
  await prisma.$disconnect();
});
