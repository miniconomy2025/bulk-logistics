import { Request, Response, NextFunction } from "express";
import { autonomyService } from "../services/AutonomyService";

/**
 * Middleware that ensures the simulation is running before allowing the request to proceed.
 * Returns a 503 Service Unavailable error if the simulation is not running.
 *
 * Use this middleware on endpoints that should only be accessible during an active simulation,
 * such as creating pickup requests.
 */
export const requireSimulationRunning = (req: Request, res: Response, next: NextFunction) => {
    if (!autonomyService.getIsRunning()) {
        return res.status(503).json({
            error: "Service Unavailable",
            message: "Pickup requests cannot be created while the simulation is not running. Please wait for the simulation to start."
        });
    }
    else if (!autonomyService.getBankAccountSecured()){
        return res.status(503).json({
            error: "Cannot fulfill request",
            message: "Pickup requests cannot be created until we have secured a bank account"
        });
    }
    next();
};
