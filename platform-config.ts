/**
 * /platform/* routes — public configuration endpoints exposed to all
 * authenticated users. Today this only surfaces the on-chain receiving
 * address users send to when funding the platform from an external wallet.
 *
 * The address is configurable via the PLATFORM_RECEIVING_ADDRESS env var.
 * If unset, we fall back to a documented placeholder address. Any production
 * deployment MUST set this env var; the placeholder is intentionally an
 * obviously-not-real address so accidental sends fail loudly rather than
 * silently funding an arbitrary mainnet address.
 */
import { Router, type IRouter } from "express";
import { ethers } from "ethers";
import type { ExchangeAvailability } from "@workspace/api-zod";
import { requireAuth } from "../lib/session";
import { env, isProduction } from "../lib/env";
import {
  isCountryMoonpayBlocked,
  moonpayUnsupportedCountries,
  moonpayUnsupportedReason,
} from "../lib/exchange-availability";

const router: IRouter = Router();

const FALLBACK_ADDRESS = "0x000000000000000000000000000000000000dEaD";

router.get("/platform/receiving-address", requireAuth, (req, res) => {
  const configured = env.PLATFORM_RECEIVING_ADDRESS;
  let address: string | null = null;
  if (configured && ethers.isAddress(configured)) {
    address = ethers.getAddress(configured);
  } else if (configured) {
    req.log.warn(
      { configured },
      "PLATFORM_RECEIVING_ADDRESS is not a valid EVM address.",
    );
  }
  if (!address) {
    if (isProduction) {
      req.log.error(
        "PLATFORM_RECEIVING_ADDRESS is unset/invalid in production; refusing to expose fallback.",
      );
      return res.status(503).json({
        message:
          "Platform receiving address is not configured. External-wallet settlement is disabled.",
      });
    }
    address = FALLBACK_ADDRESS;
  }
  return res.json({
    address,
    chain: "ethereum-mainnet",
    supportedAssets: ["ETH", "USDT", "USDC", "DAI"],
  });
});

router.get("/platform/exchange-availability", requireAuth, (req, res) => {
  const country = req.storedUser!.user.country;
  const moonpaySupported = !isCountryMoonpayBlocked(country);
  const response: ExchangeAvailability = {
    userCountry: country,
    moonpaySupported,
    coinbaseSupported: true,
    moonpayUnsupportedReason: moonpayUnsupportedReason(country),
    unsupportedCountries: [...moonpayUnsupportedCountries()],
  };
  return res.json(response);
});

export default router;
