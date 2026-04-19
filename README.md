# TalentLens 🎯

**Agentic AI-Powered ATS Resume Analyzer using Best-First Search Algorithm**

A comprehensive, state-of-the-art resume analysis system designed to help job seekers optimize their resumes for Applicant Tracking Systems (ATS). TalentLens uses advanced heuristic-guided execution and robust deterministic NLP processing to reverse-engineer how top-tier ATS platforms score resumes.

## ✨ Key Features

- 🧠 **Agentic Best-First Search**: Explores the combinatorial space of resume improvements using a custom `h(n)` heuristic function, guaranteeing optimal ATS gap identification without LLM hallucinations.
- 📊 **Detailed Composite Scoring**: Multi-axis scoring (Skills, Experience relevance, Action Verbs, Formatting, Structure, and Quantified Achievements).
- 🔍 **Advanced Skill Taxonomy & Extraction**: Matches against a continuously updated dictionary of 100+ complex technical concepts (NLP, DevOps, Data Science, Web3, etc.), falling back to a contextual keyword-floor to prevent false negatives.
- 📄 **Robust PDF Processing**: Normalizes raw PDF extract artifacts (handling invisible spaces, zero-width joiners, and bullet-point artifacts) to ensure 100% regex fidelity.
- 🎨 **Premium Glassmorphic UI**: Beautiful, interactive frontend built with dynamic Framer Motion animations. Features a **rich interactive SVG Heuristics Chart** that maps the AI's step-by-step search trace.
- 📈 **Actionable Intelligence**: Generates a structured analysis report with clear strengths, critical gaps, and numbered, tactical recommendations for the user.
- 💾 **History & Auth**: Secure session management (Better Auth) and persistent tracking of all previous resume analyses via an SQLite backend.

## 🏗️ Architecture

TalentLens successfully decouples traditional web architecture from heavy AI computation:

```text
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│     Frontend (Vite)     │    │    Backend (Node.js)    │    │    NLP Engine (Python)  │
│ - React + Tailwind CSS  │◄──►│ - Express.js + SQLite   │◄──►│ - FastAPI + pdfplumber  │
│ - Framer Motion         │    │ - Better Auth (Sessions)│    │ - Best-First Search     │
│ - Interactive SVG Charts│    │ - History Management    │    │ - Heuristics Pipeline   │
│ Port: 5173              │    │ Port: 3000              │    │ Port: 8000              │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
```

## 🧠 The NLP Engine Mechanics

The Python-based NLP engine goes far beyond simple keyword matching:

1. **PDF Normalization**: Pre-processes raw PDF text to collapse whitespace, convert em-dashes, and eliminate non-breaking artifacts so that word-boundary (`\b`) searches work flawlessly.
2. **Taxonomy & Keyword Hybrid Matching**: Matches explicitly known taxonomy concepts first, and dynamically falls back to finding exact string intersections for domain-specific jargon that hasn't been mapped yet.
3. **Continuous Tense Verbs**: Detects over 100 action verbs across multiple tenses (past, present, progressive) ensuring modern resume-speak ("Developing", "Spearhead") isn't incorrectly penalized.
4. **Best-First Search Trace**: Visually returns the `h(n)` evaluation of the candidate resume as the algorithm functionally attempts to "add missing skills" node by node to see the mathematical delta of improvements. 
## 🔍 Deep Dive: The AI & Algorithms

TalentLens doesn't just look for words; it mathematically structures a resume against an ideal state.

### 1. Heuristic-Based Best-First Search
Instead of a simple diff, we treat resume optimization as a pathfinding problem:
- **State Space**: A node represents a version of the resume with specific skills added.
- **Initial State**: The user's original uploaded resume text.
- **Goal State**: A theoretical perfect match with the Job Description.
- **Goal Test**: Are all critical JD concepts present, and is the overall ATS format sound?
- **Heuristic Function $h(n)$**: At every step, the algorithm generates "child nodes" by injecting a missing JD skill into the text. It computes $h(n)$—the estimated "closeness" to a perfect ATS score—for each child. The algorithm expands the node with the highest $h(n)$ first.
- **Pruning**: To prevent combinatorial explosion (which would freeze the UI), the Search Engine limits exploration to a maximum depth of 15 additions and aggressively trims the frontier based on the strictly calculated heuristic value.

### 2. Skill Matching & Taxonomy Insights
- **The Dictionary**: We use a curated flat array of 100+ nested technology concepts (e.g., distinguishing between "Python" and "PyTorch", or "CI/CD" and "Docker"). 
- **Unique Overlap**: Rather than raw word counts (which can artificially inflate scores if a candidate repeats "React" 10 times), the engine uses unique vocabulary overlap.
- **The Keyword-Floor Hybrid**: If a heavily specialized Job Description uses sparse jargon outside our dictionary, the skill engine checks literal JD unigram density. It blends the Taxonomy Match Authority with a Keyword Supplement so that specialized resumes never falsely bottom out at 0%.

### 3. How the Final Score is Calculated
The final $h(n)$ composite score is a strict weighted sum designed to mirror enterprise ATS platforms. When a Job Description is provided, the weights are exactly:

- **Skill Match (30%)**: Authoritative matching of hard skills from our taxonomy.
- **Keyword Match (28%)**: Contextual overlap of significant tokens (≥ 4 characters) to catch non-taxonomy jargon.
- **Experience Relevance (15%)**: Measures the density of extracted skills located specifically within the "Experience" section of the document.
- **Formatting (8%)**: Verifies presence of email, phone, and standard structural markers.
- **Action Verbs (7%)**: Checks for a diversity of achievement-oriented verbs (e.g., "Led", "Optimized", "Spearheading"). Finding 8+ distinct verbs guarantees a full score.
- **Achievements (4%)**: Scans for numbers, percentages, and dollar amounts indicating quantified impact.
- **Structure (4%)**: Ensures critical sections (Summary, Experience, Education, Skills) are explicitly identifiable.
- **Education (4%)**: Checks for degree markers (B.S., B.Tech, Master's, etc.).

*Total:* 100%.

## 📁 Project Structure

```text
TalentLens/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── db.js               # Drizzle ORM + SQLite connection
│   │   └── auth.js             # Better Auth configuration
│   ├── server.js              
│   ├── drizzle.config.js       
│   └── package.json            
├── frontend/                   # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable glassmorphic UI components
│   │   ├── context/            # React Context (Auth, History)
│   │   ├── pages/              
│   │   │   └── Dashboard.jsx   # Interactive SVG chart & Analysis Report
│   │   ├── App.jsx             
│   │   └── index.css           # Vanilla CSS + Glassmorphism design tokens
│   ├── vite.config.js          
│   └── package.json            
├── nlp-engine/                 # Python AI / NLP Processing Engine
│   ├── analyzer/               
│   │   ├── heuristics.py       # h(n) scoring functions & NLP normalizer
│   │   ├── search.py           # The Best-First Search algorithm
│   │   └── similarity.py       # Tokenization & Jaccard similarity bounds
│   ├── main.py                 # FastAPI server & Structured Report generator
│   └── requirements.txt        
└── README.md               
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **npm** or **yarn**
- **pip**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TalentLens
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Install Python Dependencies**
   ```bash
   cd ../nlp-engine
   pip install -r requirements.txt
   ```

### Environment Setup

Create an environment variable file for the backend:

```bash
# In backend/.env
BETTER_AUTH_SECRET=your-super-secret-key-at-least-32-characters-long
DATABASE_URL=sqlite:./sqlite.db
```

### Running the Application

For the application to function correctly, run all three services simultaneously in separate terminals:

1. **Start the NLP Engine** (Port 8000)
   ```bash
   cd nlp-engine
   python main.py
   ```

2. **Start the Backend Server** (Port 3000)
   ```bash
   cd backend
   npm run dev
   ```

3. **Start the Frontend** (Port 5173)
   ```bash
   cd frontend
   npm run dev
   ```

4. **Open your browser interactively**
   ```text
   http://localhost:5173
   ```

## 📖 Usage Guide

1. **Authenticate**: Create a secure session using the auth screen via Better Auth.
2. **Submit Content**: Upload a `.pdf` resume file and (optionally) paste a target Job Description. 
3. **Execution**: Watch the Best-First Search algorithm evaluate the document in real time.
4. **Insights**: 
   - Hover over the interactive **Heuristic Value History SVG Chart** to inspect how your score evolved during the agentic search.
   - Read the structured **Analysis Report** card for clear strengths, critical gaps, and actionable recommendations.

## 🛠️ Development & Debugging

### Database Management
```bash
cd backend
npx drizzle-kit generate  # Generate schema migrations
npx drizzle-kit push      # Apply migrations
npx drizzle-kit studio    # Open local database GUI in browser
```

### NLP Test Scripts
Run direct discrimination and performance test scripts built into the `nlp-engine` folder to verify heuristic accuracy when making changes:
```bash
cd nlp-engine
python test_accuracy.py
python test_nlp_scenario.py
python test_perf.py
```

## 🤝 Contributing

We welcome contributions!
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License
This project is licensed under the ISC License.

## 👥 Authors
- **Aryan Doshi** - [GitHub: @aryan-2206]
- **Indraneel Hajarnis** - [GitHub: @Indraneel-Hajarnis]
- **Kavish Desai** - [GitHub: @kavish310107] 

---
**TalentLens** - *Empowering job seekers with Agentic AI-driven resume optimization* 🚀
