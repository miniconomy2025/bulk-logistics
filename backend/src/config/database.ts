import { Pool, types } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Set type parser for DATE to return as string in order to match the expected format from the database
types.setTypeParser(types.builtins.DATE, (value) => {
    return value; // Returns the date string as 'YYYY-MM-DD'
});

const db = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.PORT || "5432"),
});

export default db;
