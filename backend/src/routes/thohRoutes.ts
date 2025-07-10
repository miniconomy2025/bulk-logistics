import express from "express";
import { postThohEvent, truckFailure } from "../controllers/thohController";

const router = express.Router();

router.post("/truck/failure", truckFailure);
router.post("/truck/delivery", postThohEvent);
router.post("/simulation", postThohEvent);

export default router;
