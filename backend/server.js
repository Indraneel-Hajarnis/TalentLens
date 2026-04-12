import express from "express";
import cors from "cors";
import multer from "multer";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./src/auth.js";
import { db } from "./src/db/index.js";
import { resumes, atsScores } from "./src/db/schema.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const app = express();
app.use(cors({ 
  origin: ["http://localhost:5173", "http://localhost:5174"], 
  credentials: true 
}));
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});

// Better-Auth handler
app.use("/api/auth", toNodeHandler(auth));

// Middleware to get user from session
const requireAuth = async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers),
  });
  if (!session || !session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = session.user;
  next();
};

const upload = multer({ storage: multer.memoryStorage() });

// Upload Resume endpoint
app.post("/api/upload", requireAuth, upload.single("resume"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const { jobDescription } = req.body;

  try {
    // 1. Forward the PDF to the Python NLP Engine for Analysis
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append("resume", blob, req.file.originalname);
    if (jobDescription) {
      formData.append("jobDescription", jobDescription);
    }

    let nlpResponse;
    try {
      nlpResponse = await fetch("http://localhost:8000/score", {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(30000), // 30s timeout
      });
    } catch (fetchErr) {
      console.error("NLP Engine Connection Error:", fetchErr.message);
      return res.status(502).json({ 
        error: "NLP Engine Unreachable", 
        details: "The analysis service is currently down. Please ensure the Python engine is running on port 8000." 
      });
    }

    if (!nlpResponse.ok) {
      const errorText = await nlpResponse.text();
      return res.status(nlpResponse.status).json({ 
        error: "Analysis Failed", 
        details: errorText || "The NLP engine returned an error during processing." 
      });
    }
    
    const nlpData = await nlpResponse.json();

    // 2. Apply Contact Info Penalty
    let finalScore = nlpData.totalScore;
    const hi = nlpData.scoreDetails.heuristicEvaluation;
    
    // Deduct points for missing contact info
    if (!hi.emailFound) finalScore -= 5;
    if (!hi.phoneFound) finalScore -= 5;
    if (!hi.contactInfo?.linkedin) finalScore -= 2;

    // Clamp score to [0, 100]
    finalScore = Math.max(0, Math.min(100, finalScore));

    // 3. Save metadata and file to DB
    const resumeId = crypto.randomUUID();
    await db.insert(resumes).values({
      id: resumeId,
      userId: req.user.id,
      filename: req.file.originalname,
      parsedText: nlpData.parsedText,
      fileData: req.file.buffer, // Store the PDF buffer
      contentType: req.file.mimetype,
      createdAt: new Date(),
    });

    const scoreId = crypto.randomUUID();
    await db.insert(atsScores).values({
      id: scoreId,
      resumeId: resumeId,
      jobDescription: jobDescription || "",
      scoreDetailsJson: JSON.stringify(nlpData.scoreDetails),
      totalScore: finalScore, // Use adjusted score
      createdAt: new Date(),
    });

    res.json({ success: true, score: { ...nlpData, totalScore: finalScore, id: resumeId } });
  } catch (err) {
    console.error("Critical Backend Error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

// Delete Scan
app.delete("/api/resumes/:id", requireAuth, async (req, res) => {
  try {
    const [resume] = await db.select().from(resumes).where(eq(resumes.id, req.params.id));
    if (!resume) return res.status(404).json({ error: "Resume not found" });
    if (resume.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    // Delete associated scores first
    await db.delete(atsScores).where(eq(atsScores.resumeId, req.params.id));
    // Delete resume
    await db.delete(resumes).where(eq(resumes.id, req.params.id));

    res.json({ success: true, message: "Scan deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: "Failed to delete scan" });
  }
});

// Serve Resume File
app.get("/api/resumes/:id/file", requireAuth, async (req, res) => {
  try {
    const [resume] = await db.select().from(resumes).where(eq(resumes.id, req.params.id));
    if (!resume) return res.status(404).json({ error: "Resume not found" });
    if (resume.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    res.setHeader("Content-Type", resume.contentType || "application/pdf");
    res.send(resume.fileData);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch file" });
  }
});

// Get User Profile
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ name: req.user.name, email: req.user.email });
});

// Dashboard History endpoint
app.get("/api/history", requireAuth, async (req, res) => {
  try {
    const history = await db.query.resumes.findMany({
      where: eq(resumes.userId, req.user.id),
      with: {
        scores: {
          orderBy: (scores, { desc }) => [desc(scores.createdAt)],
          limit: 1, // Get the latest score for each resume
        }
      },
      orderBy: (resumes, { desc }) => [desc(resumes.createdAt)],
    });
    
    res.json(history);
  } catch (err) {
    console.error("History Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.listen(3000, () => {
  console.log("Backend listening on port 3000");
});
