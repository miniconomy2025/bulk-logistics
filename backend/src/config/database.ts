import { Pool, types } from "pg";
import dotenv from "dotenv";

dotenv.config();

types.setTypeParser(types.builtins.DATE, (value) => {
    return value;
});

const db = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.PORT || "5432"),
});

export default db;
