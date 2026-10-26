import type { Request, Response } from "express";
import { getDashboardStats } from "./dashboard.service";

export async function dashboardStatsController(_req: Request, res: Response): Promise<void> {
  const stats = await getDashboardStats();
  res.status(200).json({ data: stats });
}
