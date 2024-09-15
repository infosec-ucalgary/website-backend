import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sqlite3 from "sqlite3";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const DATABASE = process.env.DATABASE!;

app.use(cors({ origin: "https://cybersec-ucalgary.club" }));
app.use(express.json());

const db = new sqlite3.Database(DATABASE);

app.get("/api/events", (_, res) => {
  db.all(
    "SELECT * FROM events ORDER BY date ASC, start_time ASC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    },
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
