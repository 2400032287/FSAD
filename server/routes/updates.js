import { Router } from "express";

const router = Router();
const SPRING_BOOT_URL =
  process.env.SPRING_BOOT_URL || "http://localhost:8080/api/updates";

router.get("/", async (_req, res) => {
  try {
    const response = await fetch(SPRING_BOOT_URL);

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Failed to fetch updates from Spring Boot",
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({
      message: "Error connecting to Spring Boot",
      error: error.message,
    });
  }
});

export default router;
