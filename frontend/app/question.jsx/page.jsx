"use client";
import { useState } from "react";

export default function ExamGenerator() {
  const [mode, setMode] = useState("topic");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  
  // Settings
  const [count, setCount] = useState(5);
  const [type, setType] = useState("Short Answer");
  
  // Results
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setQuestions([]);

    try {
      let response;
      if (mode === "topic") {
        response = await fetch("http://localhost:8000/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, count, type }),
        });
      } else {
        if (!file) {
          setError("Please upload a PDF file here first.");
          setLoading(false);
          return;
        
        }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("count", count);
        formData.append("type", type);

        response = await fetch("http://localhost:8000/api/generate-pdf", {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) throw new Error("Failed to connect to Backend.");
      const data = await response.json();
      setQuestions(data.questions);
    } catch (err) {
      setError("Error: Backend not running or failed to generate question.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 py-10 px-4">
      
      {/* Main Card */}
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 text-center">
          <h1 className="text-2xl font-extrabold text-gray-800 dark:text-white tracking-tight">
            Exam<span className="text-blue-600 dark:text-blue-400">Scale</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            AI Assessment Generator
          </p>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Mode Tabs */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all duration-200 ${
                mode === "topic"
                  ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              onClick={() => setMode("topic")}
            >
              Enter Topic
            </button>
            <button
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all duration-200 ${
                mode === "pdf"
                  ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
              onClick={() => setMode("pdf")}
            >
              Upload PDF
            </button>
          </div>

          {/* Input Section */}
          <div className="space-y-4">
            {mode === "topic" ? (
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Topic
                </label>
                <input
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none text-gray-900 dark:text-white transition-colors"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Java Thread Lifecycle..."
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Upload PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Question Count
                </label>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Question Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition-colors appearance-none"
                >
                  <option>Short Answer</option>
                  <option>Long Answer</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "Generating..." : "Generate Exam"}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-xl text-center text-sm font-medium animate-pulse">
              {error}
            </div>
          )}

          {/* Results Display */}
          {questions.length > 0 && (
            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Generated Exam</h2>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                  {questions.length} Questions
                </span>
              </div>
              
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={i} className="group p-5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
                    <div className="flex gap-4">
                      <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 font-bold rounded-lg shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {i + 1}
                      </span>
                      <p className="text-gray-700 dark:text-gray-200 leading-relaxed pt-1">
                        {q}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}