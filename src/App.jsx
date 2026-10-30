import { useEffect, useState } from "react";
import "./App.css";
import ReactMarkdown from "react-markdown";

const API_URL = "http://localhost:5000/api/surveys";
const AI_URL = "http://localhost:5000/api/ai";
const AUTH_URL = "http://localhost:5000/api/auth";

function App() {
  const [page, setPage] = useState("dashboard");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [question, setQuestion] = useState("");
  const [questionType, setQuestionType] = useState("Text");
  const [options, setOptions] = useState(["", ""]);
  const [questions, setQuestions] = useState([]);
  const [savedSurvey, setSavedSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [responseCount, setResponseCount] = useState(0);
  const [totalResponseCount, setTotalResponseCount] = useState(0);
  const [surveyId, setSurveyId] = useState("");
  const [allSurveys, setAllSurveys] = useState([]);
  const [resultsData, setResultsData] = useState([]);
  const [aiSummary, setAiSummary] = useState("");
const [summaryLoading, setSummaryLoading] = useState(false);
const [aiTopic, setAiTopic] = useState("");
const [aiLoading, setAiLoading] = useState(false);
const [user, setUser] = useState(() =>
  JSON.parse(localStorage.getItem("surveylyUser") || "null")
);
const [token, setToken] = useState(
  () => localStorage.getItem("surveylyToken") || ""
);
const [authMode, setAuthMode] = useState("login");
const [authName, setAuthName] = useState("");
const [authEmail, setAuthEmail] = useState("");
const [authPassword, setAuthPassword] = useState("");
const [authLoading, setAuthLoading] = useState(false);

const exportResultsToCSV = () => {
  if (!savedSurvey || resultsData.length === 0) {
    alert("No responses to export yet!");
    return;
  }

  const questions = savedSurvey.questions || [];

  const headers = [
    "Response Number",
    ...questions.map((q) => q.text),
  ];

  const rows = resultsData.map((response, index) => [
    index + 1,
    ...questions.map((q, qIndex) => {
      const answer = response.answers?.[qIndex] ?? "";
      return String(answer);
    }),
  ]);

  const escapeCSV = (value) =>
    `"${String(value).replace(/"/g, '""')}"`;

  const csvContent = [
    headers,
    ...rows,
  ]
    .map((row) => row.map(escapeCSV).join(","))
    .join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csvContent],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${savedSurvey.title || "survey"}-results.csv`;
  link.click();

  URL.revokeObjectURL(url);
};

  // Load surveys and their real response counts from MongoDB.
 
async function loadSurveys() {
  try {
    // Shared survey links remain public
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get("survey");

    if (sharedId) {
      const sharedResponse = await fetch(`${API_URL}/${sharedId}`);

      if (!sharedResponse.ok) {
        throw new Error("Shared survey not found");
      }

      const sharedSurvey = await sharedResponse.json();

      setSavedSurvey(sharedSurvey);
      setSurveyId(sharedSurvey._id);
      setTitle(sharedSurvey.title || "");
      setDescription(sharedSurvey.description || "");
      setQuestions(sharedSurvey.questions || []);
      setPage("preview");
    }

    // No login? Public shared survey can still be viewed.
    if (!token) {
      setAllSurveys([]);
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`
    };

    const response = await fetch(API_URL, { headers });

    if (!response.ok) {
      throw new Error("Could not load your surveys");
    }

    const surveys = await response.json();

    const surveysWithCounts = await Promise.all(
      surveys.map(async (survey) => {
        try {
          const resultResponse = await fetch(
            `${API_URL}/${survey._id}/results`,
            { headers }
          );

          if (!resultResponse.ok) {
            return { ...survey, totalResponses: 0 };
          }

          const result = await resultResponse.json();

          return {
            ...survey,
            totalResponses: result.totalResponses || 0
          };
        } catch {
          return { ...survey, totalResponses: 0 };
        }
      })
    );

    setAllSurveys(surveysWithCounts);

    const total = surveysWithCounts.reduce(
      (sum, survey) => sum + survey.totalResponses,
      0
    );

    setTotalResponseCount(total);

    // Don't replace the shared survey with a dashboard survey
    if (sharedId) return;

    let selectedSurvey = null;

    if (savedSurvey?._id) {
      selectedSurvey =
        surveysWithCounts.find(
          (survey) => survey._id === savedSurvey._id
        ) || null;
    } else if (surveysWithCounts.length > 0) {
      selectedSurvey = surveysWithCounts[0];
    }

    if (selectedSurvey) {
      setSavedSurvey(selectedSurvey);
      setSurveyId(selectedSurvey._id);
      setResponseCount(selectedSurvey.totalResponses || 0);
    } else {
      setSavedSurvey(null);
      setResponseCount(0);
    }
  } catch (error) {
    console.error("Loading error:", error);
    alert(error.message || "Could not load surveys");
  }
}


  useEffect(() => {
  loadSurveys();
}, [token]);
  async function handleAuth(e) {
  e.preventDefault();

  setAuthLoading(true);

  try {
    const isRegister = authMode === "register";

    const response = await fetch(
      `${AUTH_URL}/${isRegister ? "register" : "login"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isRegister ? { name: authName } : {}),
          email: authEmail,
          password: authPassword
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Authentication failed");
    }

    if (isRegister) {
      alert("Account created! Please log in.");
      setAuthMode("login");
      setAuthPassword("");
    } else {
      localStorage.setItem("surveylyToken", data.token);
      localStorage.setItem("surveylyUser", JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);
      setPage("dashboard");

      
    }
  } catch (error) {
    alert(error.message);
  } finally {
    setAuthLoading(false);
  }
}

function logout() {
  localStorage.removeItem("surveylyToken");
  localStorage.removeItem("surveylyUser");

  setToken("");
  setUser(null);
  setPage("dashboard");
}
async function loadResults(id) {
  try {
    if (!token) {
      alert("Please log in first!");
      return;
    }

    const response = await fetch(`${API_URL}/${id}/results`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Could not load results");
    }

    const result = await response.json();

    setResultsData(result.responses || []);
    setResponseCount(result.totalResponses || 0);

  } catch (error) {
    console.error("Results error:", error);
    alert("Could not load survey results. Please try again.");
  }
}
async function generateSummary() {
  setSummaryLoading(true);

  try {
    const response = await fetch(`${AI_URL}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: savedSurvey?.title,
        questions: savedSurvey?.questions || [],
        responses: resultsData,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate summary");
    }

    setAiSummary(data.summary);
  } catch (error) {
    alert(error.message);
  } finally {
    setSummaryLoading(false);
  }
}
  // Select a survey and load its latest response count.
  async function openSurvey(survey, destination = "preview") {
    setSavedSurvey(survey);
    setSurveyId(survey._id);
    setTitle(survey.title || "");
    setDescription(survey.description || "");
    setQuestions(survey.questions || []);
    setAnswers({});
    setResponseCount(survey.totalResponses || 0);
    setPage(destination);

   await loadResults(survey._id);
  }

  function createSurvey() {
    if (!title.trim()) {
      alert("Please enter a survey title");
      return;
    }

    setSurveyId("");
    setSavedSurvey(null);
    setQuestions([]);
    setAnswers({});
    setResponseCount(0);
    setPage("builder");
  }

async function generateAIQuestions() {
  if (!aiTopic.trim()) {
    alert("Enter a topic for AI question generation.");
    return;
  }

  setAiLoading(true);

  try {
    const response = await fetch(`${AI_URL}/generate-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: aiTopic, count: 5 }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Question generation failed");
    }

    const generated = data.questions
      .split("\n")
      .map((line) => line.replace(/^\s*(\d+[\.\)]|-|\*)\s*/, "").trim())
      .filter(Boolean);

    if (generated.length === 0) {
      throw new Error("No questions were generated.");
    }

    setQuestions((current) => [
      ...current,
      ...generated.map((text) => ({
        text,
        type: "Text",
        options: [],
      })),
    ]);

    alert(`${generated.length} AI questions added!`);
  } catch (error) {
    console.error("AI generation error:", error);
    alert(error.message);
  } finally {
    setAiLoading(false);
  }
}

  function addQuestion() {
    if (!question.trim()) {
      alert("Please enter a question");
      return;
    }

    const hasOptions =
      questionType === "Multiple Choice" ||
      questionType === "Dropdown";

    const validOptions = options.filter((option) => option.trim());

    if (hasOptions && validOptions.length < 2) {
      alert("Please add at least 2 options");
      return;
    }

    setQuestions((current) => [
      ...current,
      {
        text: question.trim(),
        type: questionType,
        options: hasOptions ? validOptions : [],
      },
    ]);

    setQuestion("");
    setQuestionType("Text");
    setOptions(["", ""]);
  }

  function addOption() {
    setOptions((current) => [...current, ""]);
  }

  function updateOption(index, value) {
    setOptions((current) => {
      const updated = [...current];
      updated[index] = value;
      return updated;
    });
  }

  function deleteQuestion(index) {
    setQuestions((current) => current.filter((_, i) => i !== index));
  }

async function saveSurvey() {
  if (!token) {
    alert("Please log in first!");
    return null;
  }

  if (!title.trim()) {
    alert("Please enter a survey title");
    return null;
  }

  if (questions.length === 0) {
    alert("Please add at least one question");
    return null;
  }

  const surveyData = {
    title: title.trim(),
    description: description.trim(),
    questions
  };

  try {
    const isExisting = Boolean(surveyId);

    const response = await fetch(
      isExisting ? `${API_URL}/${surveyId}` : API_URL,
      {
        method: isExisting ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(surveyData)
      }
    );

    const survey = await response.json();

    if (!response.ok) {
      throw new Error(survey.message || "Could not save survey");
    }

    const previousCount =
      allSurveys.find((item) => item._id === survey._id)?.totalResponses || 0;

    const updatedSurvey = {
      ...survey,
      totalResponses: previousCount
    };

    setSurveyId(survey._id);
    setSavedSurvey(updatedSurvey);

    setAllSurveys((current) => [
      updatedSurvey,
      ...current.filter((item) => item._id !== survey._id)
    ]);

    alert("Survey saved successfully!");
    return survey;

  } catch (error) {
    console.error("Save error:", error);
    alert(`Could not save survey: ${error.message}`);
    return null;
  }
}

  
  async function shareSurvey() {
    let survey = savedSurvey;

    if (!survey?._id) {
      survey = await saveSurvey();
    }

    if (!survey?._id) return;

    const link = `${window.location.origin}${window.location.pathname}?survey=${survey._id}`;

    try {
      await navigator.clipboard.writeText(link);
      alert("Survey link copied!");
    } catch {
      window.prompt("Copy your survey link:", link);
    }
  }

  function updateAnswer(index, value) {
    setAnswers((current) => ({ ...current, [index]: value }));
  }

  async function submitResponse() {
    if (questions.length === 0) {
      alert("There are no questions in this survey.");
      return;
    }

    const id = savedSurvey?._id || surveyId;

    if (!id) {
      alert("Please save the survey before collecting responses.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not submit response");
      }

      setAnswers({});
      await loadSurveys();

      alert("Response saved to MongoDB successfully!");
    } catch (error) {
      console.error("Submit error:", error);
      alert(`Could not submit response: ${error.message}`);
    }
  }

async function deleteSurvey(survey) {
  if (!token) {
    alert("Please log in first!");
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete "${survey.title}"?`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`${API_URL}/${survey._id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not delete survey");
    }

    setAllSurveys(current =>
      current.filter(item => item._id !== survey._id)
    );

    if (surveyId === survey._id) {
      setSurveyId("");
      setSavedSurvey(null);
      setResponseCount(0);
    }

    alert("Survey deleted successfully!");

  } catch (error) {
    console.error("Delete error:", error);
    alert(error.message || "Could not delete survey");
  }
}

  const chartData = (savedSurvey?.questions || []).map((q, qIndex) => {
    const counts = {};

    resultsData.forEach((response) => {
      const answer = response.answers?.[qIndex];

      if (answer !== undefined && answer !== null && answer !== "") {
        const value = String(answer);
        counts[value] = (counts[value] || 0) + 1;
      }
    });

    let labels = [];

    if (q.type === "Multiple Choice" || q.type === "Dropdown") {
      labels = q.options || [];
    } else if (q.type === "Rating") {
      labels = ["1", "2", "3", "4", "5"];
    }

    if (labels.length === 0) return null;

    return {
      question: q.text,
      labels: labels.map((label) => ({
        label: String(label),
        count: counts[String(label)] || 0,
      })),
    };
  }).filter(Boolean);

  const totalQuestions = (savedSurvey?.questions || questions).length;
  const completionRate =
  resultsData.length > 0
    ? Math.round(
        (resultsData.filter((response) =>
          (savedSurvey?.questions || []).every((q, index) => {
            const answer = response.answers?.[index];
            return answer !== undefined &&
              answer !== null &&
              String(answer).trim() !== "";
          })
        ).length / resultsData.length) * 100
      )
    : 0;
    const isSharedSurvey =
  new URLSearchParams(window.location.search).has("survey");

if (!user && !isSharedSurvey) {
  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleAuth}>
        <h1>Surveyly</h1>

        <h2>
          {authMode === "login" ? "Welcome Back!" : "Create Account"}
        </h2>

        {authMode === "register" && (
          <input
            type="text"
            placeholder="Your Name"
            value={authName}
            onChange={(e) => setAuthName(e.target.value)}
            required
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={authEmail}
          onChange={(e) => setAuthEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password (minimum 8 characters)"
          value={authPassword}
          onChange={(e) => setAuthPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={authLoading}>
          {authLoading
            ? "Please wait..."
            : authMode === "login"
            ? "Login"
            : "Register"}
        </button>

        <p>
          {authMode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            type="button"
            onClick={() =>
              setAuthMode(authMode === "login" ? "register" : "login")
            }
          >
            {authMode === "login" ? "Register" : "Login"}
          </button>
        </p>
      </form>
    </div>
  );
}
 if (!user && isSharedSurvey) {
  return (
    <div className="page-container">
      {page === "preview" && (
        <div className="preview-wrapper">
          <div className="preview-header">
            <span className="preview-label">PUBLIC SURVEY</span>
            <h1>{title || "Untitled Survey"}</h1>
            <p>{description}</p>
          </div>

          {questions.map((q, index) => (
            <div className="preview-question" key={index}>
              <span>Question {index + 1}</span>
              <h3>{q.text}</h3>

              {q.type === "Text" && (
                <input
                  className="input"
                  placeholder="Type your answer..."
                  value={answers[index] || ""}
                  onChange={(e) => updateAnswer(index, e.target.value)}
                />
              )}

              {q.type === "Multiple Choice" && (
                <div className="preview-options">
                  {(q.options || []).map((option, i) => (
                    <label key={i}>
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value={option}
                        checked={answers[index] === option}
                        onChange={(e) => updateAnswer(index, e.target.value)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "Dropdown" && (
                <select
                  className="input"
                  value={answers[index] || ""}
                  onChange={(e) => updateAnswer(index, e.target.value)}
                >
                  <option value="">Select an answer</option>
                  {(q.options || []).map((option, i) => (
                    <option key={i} value={option}>{option}</option>
                  ))}
                </select>
              )}

              {q.type === "Rating" && (
                <div className="big-rating">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => updateAnswer(index, rating)}
                    >
                      {answers[index] >= rating ? "★" : "☆"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button className="primary-btn" onClick={submitResponse}>
            Submit response
          </button>
        </div>
      )}
    </div>
  );
}

return (
  <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <span>Surveyly</span>
        </div>

        <div className="menu">
          <button
            className={page === "dashboard" ? "menu-item active" : "menu-item"}
            onClick={() => setPage("dashboard")}
          >
            <span>⌂</span> Dashboard
          </button>

          <button
            className={
              page === "create" || page === "builder"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => setPage("create")}
          >
            <span>＋</span> Create Survey
          </button>

          <button
            className={page === "surveys" ? "menu-item active" : "menu-item"}
            onClick={() => setPage("surveys")}
          >
            <span>▤</span> My Surveys
          </button>

          <button
            className={page === "results" ? "menu-item active" : "menu-item"}
            onClick={() => setPage("results")}
          >
            <span>▥</span> Results
          </button>
        </div>

        <div className="sidebar-bottom">
  <div className="user-card">
    <div className="avatar">
      {user?.name?.charAt(0).toUpperCase() || "S"}
    </div>
    <div>
      <strong>{user?.name || "Student"}</strong>
      <small>{user?.email || "Survey Creator"}</small>
    </div>
  </div>

  <button className="logout-btn" onClick={logout}>
    ↪ Logout
  </button>
</div>
      </aside>

      <main className="main">
        {/* DASHBOARD */}
        {page === "dashboard" && (
          <div className="page-container">
            <header className="topbar">
              <div>
                <p className="small-heading">DASHBOARD</p>
                <h1>Good evening 👋</h1>
                <p className="muted">
                  Create surveys and understand your responses.
                </p>
              </div>
              <button className="primary-btn" onClick={() => setPage("create")}>
                + Create Survey
              </button>
            </header>

            <section className="stats">
              <div className="stat-card">
                <div className="stat-icon purple">▤</div>
                <div>
                  <span>Total Surveys</span>
                  <strong>{allSurveys.length}</strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon blue">↗</div>
                <div>
                  <span>Total Responses</span>
                  <strong>{totalResponseCount}</strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon green">✓</div>
                <div>
                  <span>Published</span>
                  <strong>{allSurveys.length}</strong>
                </div>
              </div>
            </section>

            <section className="section-header">
              <div>
                <h2>Recent Surveys</h2>
                <p className="muted">Your recently created surveys</p>
              </div>
            </section>

            {savedSurvey ? (
              <div className="recent-survey-card">
                <h2>{savedSurvey.title}</h2>
                <p>{savedSurvey.description}</p>
                <p>
                  {(savedSurvey.questions || []).length} question
                  {(savedSurvey.questions || []).length !== 1 ? "s" : ""}
                </p>
                <button
                  className="primary-btn"
                  onClick={() => setPage("surveys")}
                >
                  View Survey
                </button>
              </div>
            ) : (
              <div className="empty-dashboard">
                <div className="empty-icon">✦</div>
                <h3>No surveys yet</h3>
                <p>Create your first survey and start collecting responses.</p>
                <button
                  className="primary-btn"
                  onClick={() => setPage("create")}
                >
                  Create your first survey
                </button>
              </div>
            )}
          </div>
        )}

        {/* CREATE SURVEY */}
        {page === "create" && (
          <div className="page-container">
            <button className="back-btn" onClick={() => setPage("dashboard")}>
              ← Back to dashboard
            </button>

            <div className="create-layout">
              <div className="create-card">
                <div className="page-title">
                  <div className="title-icon">✦</div>
                  <div>
                    <p className="small-heading">NEW SURVEY</p>
                    <h1>Create a survey</h1>
                  </div>
                </div>

                <label>Survey title</label>
                <input
                  className="input"
                  placeholder="e.g. Student Feedback Survey"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <label>Description</label>
                <textarea
                  className="input textarea"
                  placeholder="Tell people what this survey is about..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <button className="primary-btn full-btn" onClick={createSurvey}>
                  Continue to builder →
                </button>
              </div>

              <div className="info-card">
                <span className="sparkle">✦</span>
                <h3>Build better surveys</h3>
                <p>
                  Create simple surveys with multiple question types and
                  collect useful responses.
                </p>
                <div className="info-line"><span>✓</span> Multiple question types</div>
                <div className="info-line"><span>✓</span> Easy response collection</div>
                <div className="info-line"><span>✓</span> AI-powered insights</div>
              </div>
            </div>
          </div>
        )}

        {/* BUILDER */}
        {page === "builder" && (
          <div className="page-container">
            <header className="builder-top">
              <div>
                <button className="back-btn" onClick={() => setPage("dashboard")}>
                  ← Dashboard
                </button>
                <h1>{title || "Untitled Survey"}</h1>
                <p className="muted">{description || "Build your survey below."}</p>
              </div>

              <div>
                <button className="secondary-btn" onClick={() => setPage("preview")}>
                  Preview survey
                </button>
                <button className="secondary-btn" onClick={saveSurvey}>
                  Save Survey
                </button>
                <button className="primary-btn" onClick={shareSurvey}>
                  Share Survey
                </button>
              </div>
            </header>

            <div className="builder-layout">
              <div>
<div className="section-heading surveys-heading">                  <div>
                    <h2>Questions</h2>
                    <p className="muted">Add questions to your survey</p>
                  </div>
                  <span className="question-count">{questions.length} questions</span>
                </div>

                {questions.length === 0 && (
                  <div className="empty-questions">
                    <div className="empty-icon">?</div>
                    <h3>No questions yet</h3>
                    <p>Start by adding your first question.</p>
                  </div>
                )}

                {questions.map((q, index) => (
                  <div className="saved-question" key={index}>
                    <div className="question-number">{index + 1}</div>
                    <div className="saved-content">
                      <span className="question-type">{q.type}</span>
                      <h3>{q.text}</h3>
                      {(q.options || []).length > 0 && (
                        <div className="saved-options">
                          {q.options.map((option, i) => <span key={i}>{option}</span>)}
                        </div>
                      )}
                    </div>
                    <button className="delete-btn" onClick={() => deleteQuestion(index)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              <div className="add-question-card">
                <div className="ai-generator">
  <label>Generate questions with AI</label>
  <input
    className="input"
    placeholder="e.g. Student satisfaction"
    value={aiTopic}
    onChange={(e) => setAiTopic(e.target.value)}
  />
  <button
    className="secondary-btn"
    onClick={generateAIQuestions}
    disabled={aiLoading}
  >
    {aiLoading ? "Generating..." : "✨ Generate 5 Questions"}
  </button>
</div>
                <div className="card-heading">
                  <div className="add-icon">+</div>
                  <div>
                    <h2>Add question</h2>
                    <p>Choose a question type</p>
                  </div>
                </div>

                <label>Question</label>
                <input
                  className="input"
                  placeholder="What would you like to ask?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />

                <label>Question type</label>
                <select
                  className="input"
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                >
                  <option>Text</option>
                  <option>Multiple Choice</option>
                  <option>Rating</option>
                  <option>Dropdown</option>
                </select>

                {(questionType === "Multiple Choice" || questionType === "Dropdown") && (
                  <div>
                    <label>Options</label>
                    {options.map((option, index) => (
                      <input
                        key={index}
                        className="input option-input"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                      />
                    ))}
                    <button className="add-option" onClick={addOption}>
                      + Add another option
                    </button>
                  </div>
                )}

                {questionType === "Rating" && (
                  <div className="rating-example">
                    <span>Preview</span>
                    <div>☆ ☆ ☆ ☆ ☆</div>
                  </div>
                )}

                <button className="primary-btn full-btn" onClick={addQuestion}>
                  Add question
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW / SHARED SURVEY */}
        {page === "preview" && (
          <div className="page-container">
            <button className="back-btn" onClick={() => setPage("surveys")}>
              ← Back to surveys
            </button>

            <div className="preview-wrapper">
              <div className="preview-header">
                <span className="preview-label">SURVEY PREVIEW</span>
                <h1>{title || "Untitled Survey"}</h1>
                <p>{description}</p>
              </div>

              {questions.length === 0 ? (
                <div className="analytics-empty">
                  <h2>No questions in this survey</h2>
                  <p>Add questions in the builder first.</p>
                </div>
              ) : (
                <>
                  {questions.map((q, index) => (
                    <div className="preview-question" key={index}>
                      <span>Question {index + 1}</span>
                      <h3>{q.text}</h3>

                      {q.type === "Text" && (
                        <input
                          className="input"
                          placeholder="Type your answer..."
                          value={answers[index] || ""}
                          onChange={(e) => updateAnswer(index, e.target.value)}
                        />
                      )}

                      {q.type === "Multiple Choice" && (
                        <div className="preview-options">
                          {(q.options || []).map((option, i) => (
                            <label key={i}>
                              <input
                                type="radio"
                                name={`question-${index}`}
                                value={option}
                                checked={answers[index] === option}
                                onChange={(e) => updateAnswer(index, e.target.value)}
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === "Dropdown" && (
                        <select
                          className="input"
                          value={answers[index] || ""}
                          onChange={(e) => updateAnswer(index, e.target.value)}
                        >
                          <option value="">Select an answer</option>
                          {(q.options || []).map((option, i) => (
                            <option key={i} value={option}>{option}</option>
                          ))}
                        </select>
                      )}

                      {q.type === "Rating" && (
                        <div className="big-rating">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => updateAnswer(index, rating)}
                              style={{
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: "32px",
                              }}
                              aria-label={`Rate ${rating}`}
                            >
                              {answers[index] >= rating ? "★" : "☆"}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <button className="primary-btn" onClick={submitResponse}>
                    Submit response
                  </button>
                </>
              )}

              {savedSurvey && (
                <div style={{ marginTop: "18px" }}>
                  <button className="secondary-btn" onClick={shareSurvey}>
                    🔗 Copy Survey Link
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RESULTS */}
        {page === "results" && (
          <div className="page-container">
            <div className="results-heading">
  <p className="small-heading">ANALYTICS</p>
  <h1 className="results-title">Survey Results</h1>
  <p className="muted results-subtitle">
    Track responses and understand your audience.
  </p>
</div>

            <div className="result-grid">
              <div className="result-card">
                <span>Total responses</span>
                <strong>{responseCount}</strong>
                <small>{responseCount === 0 ? "No responses yet" : "Responses received"}</small>
              </div>

              <div className="result-card">
                <span>Total questions</span>
                <strong>{totalQuestions}</strong>
                <small>In the selected survey</small>
              </div>

              <div className="result-card">
                <span>Completion rate</span>
                <strong>{responseCount > 0 ? `${completionRate}%` : "—"}</strong>
                <small>{responseCount > 0 ? "Responses recorded" : "Waiting for responses"}</small>
              </div>
            </div>

            {savedSurvey ? (
              <div className="analytics-empty">
                
<div className="charts-section">
  <h2>Response Analytics</h2>
  <p className="muted">
    See how people answered each question.
  </p>

  {responseCount === 0 ? (
    <div className="chart-empty">
      No responses yet. Your charts will appear after someone submits the survey.
    </div>
  ) : chartData.length === 0 ? (
    <div className="chart-empty">
      This survey has text questions only. View submitted answers below.
    </div>
  ) : (
    chartData.map((chart, index) => {
      const maxCount = Math.max(
        1,
        ...chart.labels.map((item) => item.count)
      );

      return (
        <div className="chart-card" key={index}>
          <h3>
            {index + 1}. {chart.question}
          </h3>

          <div className="chart-bars">
            {chart.labels.map((item) => (
              <div className="chart-row" key={item.label}>
                <div className="chart-label">
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>

                <div
                  className="chart-track"
                  role="progressbar"
                  aria-valuenow={item.count}
                  aria-valuemin={0}
                  aria-valuemax={maxCount}
                  aria-label={`${item.label}: ${item.count} responses`}
                >
                  <div
                    className="chart-bar"
                    style={{
                      width: `${(item.count / maxCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    })
  )}
</div>

                <h2>{savedSurvey.title}</h2>
                <p>
                  {responseCount === 0
                    ? "Once people respond, response analytics will appear here."
                    : `${responseCount} response${responseCount !== 1 ? "s" : ""} collected successfully.`}
                </p>
               <div className="results-actions">
  <button
    className="secondary-btn"
    onClick={() => loadResults(savedSurvey._id)}
  >
    🔄 Refresh results
  </button>

  <button
    className="primary-btn"
    onClick={exportResultsToCSV}
  >
    📥 Export Results CSV
  </button>
</div>
<div className="response-list">
  <h3>Submitted Answers</h3>

  {resultsData.length === 0 ? (
    <p className="muted">No responses submitted yet.</p>
  ) : (
    resultsData.map((response, index) => (
      <div className="response-card" key={response._id || index}>
        <h4>Response {index + 1}</h4>

        {(savedSurvey.questions || []).map((q, qIndex) => {
          const answer = response.answers?.[qIndex];

          return (
            <div className="response-answer" key={qIndex}>
              <strong>
                {qIndex + 1}. {q.text}
              </strong>
              <p>
                {answer !== undefined && answer !== ""
                  ? String(answer)
                  : "Not answered"}
              </p>
            </div>
          );
        })}
      </div>
    ))
  )}
</div>
<div className="ai-summary-card">
  <h3>✨ AI Response Summary</h3>

  <button
    className="secondary-btn"
    onClick={generateSummary}
    disabled={summaryLoading || resultsData.length === 0}
  >
    {summaryLoading ? "Analyzing..." : "Generate AI Summary"}
  </button>

{aiSummary && (
  <div className="ai-summary-text">
    <ReactMarkdown>{aiSummary}</ReactMarkdown>

    <button
      className="secondary-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(aiSummary);
          alert("AI summary copied!");
        } catch {
          alert("Unable to copy. Please try again.");
        }
      }}
    >
      📋 Copy Summary
    </button>
  </div>
)}</div>
                <h3>Select a survey</h3>
                <select
                  className="input"
                  value={savedSurvey._id}
                  onChange={(e) => {
                    const survey = allSurveys.find((item) => item._id === e.target.value);
                    if (survey) openSurvey(survey, "results");
                  }}
                >
                  {allSurveys.map((survey) => (
                    <option key={survey._id} value={survey._id}>{survey.title}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="analytics-empty">
                <h2>No surveys available</h2>
                <p>Create a survey to view its results.</p>
              </div>
            )}
          </div>
        )}

        {/* MY SURVEYS */}
        {page === "surveys" && (
          <div className="page-container">
            <div className="surveys-heading">
              <div>
                <p className="small-heading">SURVEYS</p>
                <h1>My Surveys</h1>
                <p className="muted">Manage all your surveys in one place.</p>
              </div>
              <button className="primary-btn" onClick={() => setPage("create")}>
                + Create Survey
              </button>
            </div>

            {allSurveys.length > 0 ? (
              allSurveys.map((survey) => (
                <div className="survey-empty" key={survey._id}>
                  <h2>{survey.title}</h2>
                  <p>{survey.description}</p>
                  <p>
                    {(survey.questions || []).length} question
                    {(survey.questions || []).length !== 1 ? "s" : ""}
                    {" · "}
                    {survey.totalResponses || 0} response
                    {(survey.totalResponses || 0) !== 1 ? "s" : ""}
                  </p>

                  <div className="survey-actions">
                    <button className="primary-btn" onClick={() => openSurvey(survey)}>
                      Open Survey
                    </button>

                    <button className="primary-btn" onClick={() => openSurvey(survey, "builder")}>
                      ✏️ Edit Survey
                    </button>

                    <button
                      className="secondary-btn"
                      onClick={async () => {
                        const link = `${window.location.origin}${window.location.pathname}?survey=${survey._id}`;
                        try {
                          await navigator.clipboard.writeText(link);
                          alert("Survey link copied!");
                        } catch {
                          window.prompt("Copy your survey link:", link);
                        }
                      }}
                    >
                      🔗 Share Survey
                    </button>

                    <button className="delete-btn" onClick={() => deleteSurvey(survey)}>
                      🗑 Delete Survey
                    </button>

                    <button className="secondary-btn" onClick={() => openSurvey(survey, "results")}>
                      View Results
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="survey-empty">
                <div className="empty-icon">▤</div>
                <h2>No surveys created</h2>
                <p>Your created surveys will appear here.</p>
                <button className="primary-btn" onClick={() => setPage("create")}>
                  Create Survey
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
