import express from "express";
import { postThohEvent } from "../controllers/thohController";

const router = express.Router();

router.post("", postThohEvent);

export default router;
