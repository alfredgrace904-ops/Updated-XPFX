import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { adminSeedStatus } from "../lib/store";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Public — lets the admin portal show a "no admin provisioned" banner
// instead of failing silently when ADMIN_EMAIL/ADMIN_PASSWORD secrets
// haven't been set yet. Does not leak the actual email.
router.get("/admin/provisioning-status", (_req, res) => {
  res.json({ provisioned: adminSeedStatus.provisioned });
});

export default router;
