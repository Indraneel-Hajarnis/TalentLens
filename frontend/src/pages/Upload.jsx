import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useHistory } from "../context/HistoryContext";

export default function Upload() {
  const { refreshHistory } = useHistory();
  const [file, setFile] = useState(null);
  const [jobDesc, setJobDesc] = useState("");
  const [isHovering, setIsHovering] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleDrop = (e) => {
    e.preventDefault();
    setIsHovering(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        alert("Please upload a PDF file.");
      }
    }
  };

  const handleScan = async () => {
    if (!file) return;
    setIsScanning(true);
    
    // Redirect through Node.js backend for DB persistence
    const formData = new FormData();
    formData.append("resume", file);
    if (jobDesc) formData.append("jobDescription", jobDesc);

    try {
      const res = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include", // Essential for session cookies
      });

      if (res.status === 401) {
        alert("Please login first to analyze resumes and save results.");
        navigate("/auth");
        return;
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || errData.error || "Analysis failed");
      }

      const data = await res.json();
      // data from Node is { success: true, score: nlpData }
      
      // Refresh global history sidebar
      refreshHistory();

      // navigate to dashboard with score
      navigate("/dashboard", { state: { result: data.score, filename: file.name } });
    } catch (err) {
      console.error(err);
      alert(`Error Analyzing Resume: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full animate-fadeIn">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        
        {/* Job Description */}
        <div className="flex flex-col gap-2 stagger-item">
          <label className="text-md font-bold text-white mb-1 drop-shadow-sm animate-slideInLeft">
            Job Description (Optional)
          </label>
          <textarea
            className="form-input w-full bg-[#0d1624] border border-[#0ab5d0]/30 rounded-lg p-4 text-[#cbd5e1] focus:outline-none focus:border-[#0ab5d0] resize-none h-40 placeholder-[#64748b] text-sm"
            placeholder="Paste the job description here for targeted analysis..."
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
          />
        </div>

        {/* Upload Zone */}
        <div
          className={`upload-zone border border-[#0ab5d0]/30 rounded-lg p-10 flex flex-col items-center justify-center gap-4 ${isHovering ? "drag-over border-[#0ab5d0] bg-[#0ab5d0]/10" : "bg-[#0d1624]"} stagger-item`}
          onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
          onDragLeave={() => setIsHovering(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <div className={`text-3xl mb-2 transition-all duration-300 ${file ? 'animate-bounce text-[#10b981]' : 'opacity-80'}`}>? </div>
          {file ? (
            <p className="text-lg font-medium text-[#10b981] animate-slideInRight">{file.name}</p>
          ) : (
            <p className="text-md font-medium text-[#cbd5e1]">
              Select a resume PDF to upload.
            </p>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleScan}
          disabled={!file || isScanning}
          className={`btn-primary w-full py-4 rounded-lg font-bold text-lg stagger-item ${
            isScanning ? "bg-[#334155] text-gray-400 cursor-not-allowed animate-pulse" : 
            !file ? "bg-[#1e293b] text-gray-500 cursor-not-allowed" : 
            "bg-[#0ab5d0] text-white hover:bg-[#009bba] shadow-[0_0_15px_rgba(10,181,208,0.3)] cursor-pointer hover-lift"
          }`}
        >
          {isScanning ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
              Scanning Matrix...
            </span>
          ) : "Analyze Resume"}
        </button>
      </div>
    </div>
  );
}
