import express from "express";
import { postThohEvent } from "../controllers/thohController";

const router = express.Router();

router.post("/truck/failure", postThohEvent);
router.post("/truck/delivery", postThohEvent);
router.post("/simulation", postThohEvent);

export default router;
