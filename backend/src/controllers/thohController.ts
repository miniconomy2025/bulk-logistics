import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/errorHandlingMiddleware/catchAsync";
import { beginSimulation, handleTruckDelivery, processTruckFailure } from "../services/thohService";
import { TruckDelivery } from "../types";
import { TruckFailureInfo } from "../types/thoh";
import { handleTruckFailure } from "../services/thohService";
import { autonomyService } from "../services/AutonomyService";
import axios from "axios";

export const startSimulation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { epochStartTime } = req.body;
    res.status(200).send();
    beginSimulation(epochStartTime);
});

export const truckFailure = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const failureInfo: TruckFailureInfo = req.body;

    console.log("=== TRUCK FAILURE REQUEST ===");
    console.log("IP:", req.ip || req.socket.remoteAddress);
    console.log("Host:", req.get("host"));
    console.log("Origin:", req.get("origin"));
    console.log("Referer:", req.get("referer"));
    console.log("User-Agent:", req.get("user-agent"));
    console.log("X-Forwarded-For:", req.get("x-forwarded-for"));
    console.log("Body:", JSON.stringify(failureInfo, null, 2));
    console.log("=============================");

    const result = await handleTruckFailure(failureInfo);

    if (result.success) {
        res.status(204).json(result);
    }

    if (!result.success) {
        res.status(418).json(result).send();
    }
});

export const truckDelivery = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const truckDeliveryInfo: TruckDelivery = req.body;
    await handleTruckDelivery(truckDeliveryInfo);
    res.status(200).send();
});

export const stopSimulation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    autonomyService.stop();

    try {
        await axios.post(
            "https://api.github.com/repos/miniconomy2025/bulk-logistics/actions/workflows/database-migrations.yaml/dispatches",
            {
                ref: "main",
            },
            {
                headers: {
                    Accept: "application/vnd.github+json",
                    Authorization: `Bearer ${process.env.GITHUB_PAT}`,
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            },
        );

        res.status(200).json({ message: "Simulation stopped and migration job triggered." });
    } catch (err: any) {
        console.error("Failed to trigger GitHub workflow", err?.response?.data || err);
        res.status(500).json({ error: "Simulation stopped but failed to trigger migration job." });
    }
});
