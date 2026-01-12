import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getQuestions } from "../../services/questionApi";
import { createTest } from "../../services/testApi";
import { Button, Card, Input } from "../../../components/UI";
import { toast } from "react-toastify";

const CreateTest = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    duration: 60,
    activeTill: "",
    allowedCandidates: [{ email: "", passcode: "" }],
  });

  /* ===============================
     LOAD QUESTION BANK
  =============================== */
  useEffect(() => {
    getQuestions()
      .then((res) => setQuestions(res.data))
      .catch(() => toast.error("Failed to load questions"));
  }, []);

  /* ===============================
     SUBMIT
  =============================== */
  const handleSubmit = async () => {
    if (!form.title || !form.activeTill || selectedQuestions.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }

    const hasInvalidPasscode = form.allowedCandidates.some(
      (c) => (c.email || c.passcode) && c.passcode.length < 4
    );

    if (hasInvalidPasscode) {
      toast.error("Passcode must be at least 4 characters");
      return;
    }

    setLoading(true);
    try {
      await createTest({
        title: form.title,
        duration: form.duration,
        activeTill: form.activeTill,
        questions: selectedQuestions,
        allowedCandidates: form.allowedCandidates,
      });

      toast.success("Test created successfully");
      navigate("/admin/tests");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create test");
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.questionText
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesType = typeFilter === "all" || q.type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-6xl mx-auto p-8">
      <Card className="p-8 space-y-6">
        <h1 className="text-2xl font-black">Create Test</h1>

        <Input
          label="Test Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Duration (minutes)"
            type="number"
            value={form.duration}
            onChange={(e) =>
              setForm({ ...form, duration: Number(e.target.value) })
            }
          />

          <Input
            label="Active Till"
            type="datetime-local"
            value={form.activeTill}
            onChange={(e) => setForm({ ...form, activeTill: e.target.value })}
          />
        </div>

        {/* QUESTION SELECTION */}
        <div>
          <h3 className="font-bold mb-3">Select Questions</h3>

          {/* FILTER BAR */}
          <div className="flex gap-3 mb-3">
            {/* SEARCH */}
            <input
              type="text"
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />

            {/* TYPE FILTER */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            >
              <option value="all">All</option>
              <option value="mcq">MCQ</option>
              <option value="descriptive">Descriptive</option>
              <option value="coding">Coding</option>
            </select>
          </div>

          {/* QUESTION LIST */}
          <div
            className="max-h-80 overflow-y-auto border border-slate-800 rounded p-4 space-y-2
               scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900"
          >
            {filteredQuestions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center">
                No questions match your search
              </p>
            ) : (
              filteredQuestions.map((q) => (
                <label
                  key={q._id}
                  className="flex items-start gap-3 text-sm cursor-pointer hover:bg-slate-800/50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedQuestions.includes(q._id)}
                    onChange={(e) => {
                      setSelectedQuestions((prev) =>
                        e.target.checked
                          ? [...prev, q._id]
                          : prev.filter((id) => id !== q._id)
                      );
                    }}
                  />

                  <div className="flex-1">
                    <p className="font-medium text-white line-clamp-2">
                      {q.questionText}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {q.type.toUpperCase()} • {q.marks} marks
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>

          {/* SELECTED COUNT */}
          <p className="text-xs text-slate-400 mt-2">
            Selected {selectedQuestions.length} question(s)
          </p>
        </div>

        {/* ALLOWED CANDIDATES */}
        <div>
          <h3 className="font-bold mb-2">Allowed Candidates</h3>

          {form.allowedCandidates.map((c, i) => (
            <div key={i} className="grid grid-cols-2 gap-4 mb-2">
              <Input
                placeholder="Email"
                value={c.email}
                onChange={(e) => {
                  const arr = [...form.allowedCandidates];
                  arr[i].email = e.target.value;
                  setForm({ ...form, allowedCandidates: arr });
                }}
              />
              <Input
                placeholder="Passcode"
                value={c.passcode}
                onChange={(e) => {
                  const arr = [...form.allowedCandidates];
                  arr[i].passcode = e.target.value;
                  setForm({ ...form, allowedCandidates: arr });
                }}
              />
            </div>
          ))}

          <Button
            variant="secondary"
            onClick={() =>
              setForm({
                ...form,
                allowedCandidates: [
                  ...form.allowedCandidates,
                  { email: "", passcode: "" },
                ],
              })
            }
          >
            + Add Candidate
          </Button>
        </div>

        <Button fullWidth size="lg" onClick={handleSubmit} disabled={loading}>
          {loading ? "Creating..." : "Create Test"}
        </Button>
      </Card>
    </div>
  );
};

export default CreateTest;
