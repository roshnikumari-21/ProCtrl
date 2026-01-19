import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getTestById,
  updateTest,
  addCandidates,
  addQuestionsToTest,
  removeQuestionFromTest,
} from "../../services/testApi";
import { getQuestions } from "../../services/questionApi";
import { Card, Button, Input } from "../../../components/UI";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const TestDetails = () => {
  const { id } = useParams();
  const [test, setTest] = useState(null);
  const navigate = useNavigate();

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  // Candidate State
  const [newEmail, setNewEmail] = useState("");
  const [newPasscode, setNewPasscode] = useState("");

  // Question State
  const [allQuestions, setAllQuestions] = useState([]);
  const [isAddingQuestions, setIsAddingQuestions] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    getTestById(id).then((res) => setTest(res.data));
  }, [id]);

  useEffect(() => {
    if (isAddingQuestions) {
      getQuestions()
        .then((res) => setAllQuestions(res.data))
        .catch(() => toast.error("Failed to load question bank"));
    }
  }, [isAddingQuestions]);

  if (!test) {
    return <div className="p-10 text-center">Loading test…</div>;
  }

  const handleStartEdit = () => {
    const date = new Date(test.activeTill);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);

    setFormData({
      title: test.title,
      duration: test.duration,
      activeTill: localDate.toISOString().slice(0, 16),
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const { data } = await updateTest(id, formData);
      setTest(data.test);
      setIsEditing(false);
      toast.success("Test updated successfully");
    } catch (err) {
      toast.error("Failed to update test");
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!newEmail || !newPasscode) return;
    try {
      const { data } = await addCandidates(id, [
        { email: newEmail, passcode: newPasscode },
      ]);
      setTest(data.test);
      setNewEmail("");
      setNewPasscode("");
      toast.success("Candidate added");
    } catch (err) {
      toast.error("Failed to add candidate");
    }
  };

  const handleAddQuestion = async (qId) => {
    try {
      const { data } = await addQuestionsToTest(id, [qId]);
      setTest(data.test);
      toast.success("Question added");
    } catch (err) {
      toast.error("Failed to add question");
    }
  };

  const handleRemoveQuestion = async (qId) => {
    if (!window.confirm("Remove this question from the test?")) return;
    try {
      const { data } = await removeQuestionFromTest(id, qId);
      setTest(data.test);
      toast.success("Question removed");
    } catch (err) {
      toast.error("Failed to remove question");
    }
  };

  const availableQuestions = allQuestions.filter((q) => {
    const isAlreadyInTest = test.questions.some((tq) => tq._id === q._id);
    const matchesSearch = q.questionText
      .toLowerCase()
      .includes(searchQ.toLowerCase());
    return !isAlreadyInTest && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {/* METADATA CARD */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="w-full">
            {isEditing ? (
              <div className="space-y-4 max-w-md">
                <Input
                  label="Title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
                <Input
                  label="Duration (minutes)"
                  type="number"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                />
                <Input
                  label="Active Till"
                  type="datetime-local"
                  value={formData.activeTill}
                  onChange={(e) =>
                    setFormData({ ...formData, activeTill: e.target.value })
                  }
                />
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleSave} size="sm">
                    Save
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="ghost"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-black">{test.title}</h1>
                <p>Duration: {test.duration} minutes</p>
                <p>Active till: {new Date(test.activeTill).toLocaleString()}</p>
                <p>Test ID: {test.testId}</p>
              </div>
            )}
          </div>

          {!isEditing && (
            <Button variant="secondary" size="sm" onClick={handleStartEdit}>
              Edit Details
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Questions ({test.questions.length})</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsAddingQuestions(!isAddingQuestions)}
          >
            {isAddingQuestions ? "Done Adding" : "Add Questions"}
          </Button>
        </div>

        {/* Question Bank (when adding) */}
        {isAddingQuestions && (
          <div className="mb-6 p-4 bg-slate-950 rounded-lg border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300">
            <h4 className="font-bold text-sm text-slate-400 mb-3 uppercase tracking-wider">
              Available Questions
            </h4>
            <input
              type="text"
              placeholder="Search questions..."
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-3"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {availableQuestions.length === 0 ? (
                <p className="text-slate-500 text-sm italic">
                  No matching questions found.
                </p>
              ) : (
                availableQuestions.map((q) => (
                  <div
                    key={q._id}
                    className="flex justify-between items-center p-3 bg-slate-900 border border-slate-800 rounded hover:border-blue-500/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm line-clamp-1">
                        {q.questionText}
                      </p>
                      <span className="text-xs text-slate-500">
                        {q.type} • {q.marks} marks
                      </span>
                    </div>
                    <Button size="sm" onClick={() => handleAddQuestion(q._id)}>
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Current Questions List */}
        <div className="space-y-3">
          {test.questions.map((q, idx) => (
            <div
              key={q._id}
              className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700/50"
            >
              <div className="flex items-start gap-3">
                <span className="bg-slate-700 text-slate-300 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mt-0.5">
                  {idx + 1}
                </span>
                <div>
                  <p
                    onClick={() => navigate(`/admin/questions/${q._id}`)}
                    className="font-medium cursor-pointer hover:text-blue-400 decoration-blue-400/50 hover:underline transition-colors"
                  >
                    {q.questionText}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="uppercase tracking-wider font-bold">
                      {q.type}
                    </span>{" "}
                    • <span className="text-slate-400">{q.marks} marks</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleRemoveQuestion(q._id)}
                className="text-red-500 hover:text-red-400 text-xs font-bold px-3 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all"
              >
                Remove
              </button>
            </div>
          ))}

          {test.questions.length === 0 && (
            <div className="text-center py-8 text-slate-500 italic">
              No questions in this test. Click "Add Questions" to select from
              the bank.
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold mb-4">Allowed Candidates</h3>

        {/* Add Candidate Form */}
        <form
          onSubmit={handleAddCandidate}
          className="flex flex-col sm:flex-row gap-2 mb-6 p-4 bg-slate-950 rounded-lg border border-slate-800"
        >
          <input
            type="email"
            placeholder="Candidate Email"
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Passcode"
            className="w-32 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            value={newPasscode}
            onChange={(e) => setNewPasscode(e.target.value)}
            required
          />
          <Button type="submit" size="sm">
            Add
          </Button>
        </form>

        <ul className="space-y-2 text-sm">
          {test.allowedCandidates.map((c, i) => (
            <li
              key={i}
              className="flex items-center justify-between p-2 rounded hover:bg-slate-800 transition-colors"
            >
              <div>
                <span className="font-mono">{c.email}</span> —{" "}
                <span
                  className={c.hasAttempted ? "text-red-400" : "text-green-400"}
                >
                  {c.hasAttempted ? "Attempted" : "Not Attempted"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

export default TestDetails;
