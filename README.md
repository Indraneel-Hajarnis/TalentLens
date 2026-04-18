# TalentLens 🎯

**Heuristic-Powered ATS Resume Analyzer using Best-First Search Algorithm**

A comprehensive resume analysis system that helps job seekers optimize their resumes for Applicant Tracking Systems (ATS) using advanced AI techniques and heuristic evaluation.

## ✨ Features

- 🧠 **Best-First Search Algorithm**: Intelligent resume analysis using heuristic-guided search
- 📊 **Detailed Scoring**: Comprehensive ATS scoring with breakdown by skills, structure, and formatting
- 🔍 **Keyword Analysis**: Job description matching and keyword gap analysis
- 📄 **PDF Processing**: Automatic PDF text extraction and analysis
- 💾 **History Management**: Track and manage previous resume analyses
- 🔐 **User Authentication**: Secure user accounts with session management
- 🎨 **Modern UI**: Beautiful, responsive interface with real-time analysis feedback

## 🏗️ Architecture

TalentLens follows a modern microservices architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   NLP Engine    │
│   (React)       │◄──►│   (Express)     │◄──►│   (FastAPI)     │
│   Port: 5173    │    │   Port: 3000    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Components

- **Frontend**: React + Vite with Tailwind CSS
- **Backend**: Express.js with Better Auth and SQLite
- **NLP Engine**: FastAPI with advanced text analysis algorithms

## 📁 Project Structure

```
TalentLens/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── db.js             # Database schema and connection
│   │   └── auth.js           # Authentication configuration
│   ├── server.js              # Main backend server
│   ├── drizzle.config.js       # Database configuration
│   └── package.json          # Backend dependencies
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   │   └── Sidebar.jsx
│   │   ├── context/          # React context providers
│   │   │   └── HistoryContext.jsx
│   │   ├── pages/            # Main application pages
│   │   │   ├── Dashboard.jsx  # Main analysis interface
│   │   │   ├── Auth.jsx      # Authentication page
│   │   │   └── Upload.jsx    # Legacy upload component
│   │   ├── App.jsx           # Main App component
│   │   └── main.jsx         # Application entry point
│   ├── public/               # Static assets
│   ├── vite.config.js        # Vite configuration with proxy
│   └── package.json          # Frontend dependencies
├── nlp-engine/              # Python NLP processing engine
│   ├── analyzer/             # Core analysis algorithms
│   │   ├── heuristics.py     # Heuristic evaluation functions
│   │   ├── search.py         # Best-First Search implementation
│   │   └── similarity.py    # Text similarity calculations
│   ├── main.py              # FastAPI server and endpoints
│   └── requirements.txt     # Python dependencies
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **npm** or **yarn** for package management
- **pip** for Python packages

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

Create environment variables for the backend:

```bash
# In backend/.env
BETTER_AUTH_SECRET=your-super-secret-key-at-least-32-characters-long
DATABASE_URL=sqlite:./sqlite.db
```

### Running the Application

You need to run all three services simultaneously:

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

4. **Open your browser**
   ```
   http://localhost:5173
   ```

## 📖 Usage Guide

### 1. User Authentication

- **Sign Up**: Create a new account with email and password
- **Sign In**: Log in to your existing account
- **Sign Out**: Securely log out from your session

### 2. Resume Analysis

1. **Upload Resume**: Click "Upload PDF" to select a resume file
2. **Add Job Description** (Optional): Paste the target job description for better matching
3. **Analyze**: Click "Analyze Resume" to start the analysis
4. **View Results**: Explore detailed analysis across multiple tabs

### 3. Analysis Results

The analysis provides:

- **Overall Score**: ATS compatibility score (0-100%)
- **Score Breakdown**: Detailed scoring by category
- **Search Trace**: Visual representation of the Best-First Search process
- **Skills Analysis**: Matched and missing skills comparison
- **Keyword Analysis**: Keyword matching against job description
- **Improvement Tips**: Actionable recommendations

### 4. History Management

- **View History**: Access all previous analyses from the sidebar
- **Delete Scans**: Remove unwanted analysis results
- **Compare Results**: Track improvement over time

## 🔧 Technical Details

### Best-First Search Algorithm

The core of TalentLens is the Best-First Search algorithm that:

1. **Extracts Skills**: Identifies key skills from resume and job description
2. **Builds Search Tree**: Creates a search tree of possible resume improvements
3. **Applies Heuristics**: Uses multiple heuristics to guide the search:
   - Skills matching score
   - Keyword density
   - Resume structure quality
   - Action verb usage
   - Achievement quantification
4. **Finds Optimal Path**: Returns the best-scoring resume configuration

### Heuristic Evaluation

The system evaluates resumes using multiple heuristics:

- **Skills Matching**: How well skills match job requirements
- **Structure Quality**: Resume section organization and completeness
- **Formatting**: Contact information presence and formatting
- **Action Verbs**: Strong action verb usage in experience descriptions
- **Achievements**: Quantified achievements and metrics
- **Keyword Optimization**: Keyword density and relevance

### Scoring System

The final ATS score is calculated as:

```
Final Score = (Skills × 0.35) + (Structure × 0.25) + 
              (Experience × 0.20) + (Action Verbs × 0.10) + 
              (Formatting × 0.10) - Penalties
```

## 🛠️ Development

### Backend Development

```bash
cd backend
npm run dev        # Start with nodemon for auto-restart
npm start          # Start production server
```

### Frontend Development

```bash
cd frontend
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

### NLP Engine Development

```bash
cd nlp-engine
python main.py      # Start FastAPI server
```

### Database Management

```bash
cd backend
npx drizzle-kit generate  # Generate migrations
npx drizzle-kit migrate   # Apply migrations
npx drizzle-kit studio    # Open database GUI
```

## 📚 API Documentation

### Backend API Endpoints

#### Authentication
- `POST /api/auth/sign-up` - Create new user account
- `POST /api/auth/sign-in` - Authenticate user
- `POST /api/auth/sign-out` - Logout user
- `GET /api/me` - Get current user info

#### Resume Analysis
- `POST /api/upload` - Upload and analyze resume
- `GET /api/history` - Get user's analysis history
- `DELETE /api/resumes/:id` - Delete specific analysis

### NLP Engine Endpoints

- `POST /analyze/pdf` - Analyze PDF resume
- `POST /analyze` - Analyze text resume
- `GET /` - Health check endpoint

## 🔒 Security Features

- **Session Management**: Secure session handling with Better Auth
- **Input Validation**: Comprehensive input sanitization
- **CORS Configuration**: Proper cross-origin resource sharing
- **File Upload Security**: Secure file handling and validation

## 🐛 Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3000, 5173, and 8000 are available
2. **CORS Issues**: Check that all services are running
3. **Database Errors**: Verify SQLite database permissions
4. **PDF Processing**: Ensure Python dependencies are installed

### Debug Mode

Enable detailed logging:

```bash
# Backend
DEBUG=true npm run dev

# Frontend
# Check browser console for detailed logs

# NLP Engine
python main.py --log-level DEBUG
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- **JavaScript**: Use ESLint configuration
- **Python**: Follow PEP 8 guidelines
- **React**: Use functional components with hooks
- **CSS**: Use Tailwind CSS classes

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 👥 Authors

- **Aryan Doshi** - [GitHub: @aryan-2206]
- **Indraneel Hajarnis** - [GitHub: @Indraneel-Hajarnis]
- **Kavish Desai** - [GitHub: @kavish310107] 

## Acknowledgments

- **FastAPI** - For the excellent Python web framework
- **React** - For the powerful frontend library
- **Express.js** - For the robust backend framework
- **Drizzle ORM** - For the elegant database toolkit
- **Tailwind CSS** - For the utility-first CSS framework
- **PDF.js** - For client-side PDF processing

---

**TalentLens** - *Empowering job seekers with AI-driven resume optimization* 🚀
