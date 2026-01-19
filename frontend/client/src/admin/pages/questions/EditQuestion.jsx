import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import { Button, Card, Input, Textarea } from "../../../components/UI";
import { toast } from "react-toastify";

const EditQuestion = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [type, setType] = useState("mcq");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [form, setForm] = useState(null);

  /* ===============================
     FETCH QUESTION
  =============================== */
  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const { data } = await api.get(`/questions/${id}`);

        setType(data.type);
        setForm({
          questionText: data.questionText,
          marks: data.marks,
          mcq: data.mcq || { options: ["", "", "", ""], correctAnswer: 0 },
          descriptive: data.descriptive || { sampleAnswer: "" },
          coding: data.coding || {
            problemStatement: "",
            constraints: "",
            inputFormat: "",
            outputFormat: "",
            sampleTestCases: [],
            hiddenTestCases: [{ input: "", output: "" }],
            timeLimitMs: 2000,
            memoryLimitMb: 256,
            supportedLanguages: ["cpp", "python", "java"],
          },
        });
      } catch {
        toast.error("Failed to load question");
        navigate("/admin/questions");
      } finally {
        setFetching(false);
      }
    };

    fetchQuestion();
  }, [id, navigate]);

  /* ===============================
     UPDATE
  =============================== */
  const handleUpdate = async () => {
    setLoading(true);
    try {
      await api.put(`/questions/${id}`, {
        questionText: form.questionText,
        type,
        marks: form.marks,
        mcq: type === "mcq" ? form.mcq : undefined,
        descriptive: type === "descriptive" ? form.descriptive : undefined,
        coding: type === "coding" ? form.coding : undefined,
      });

      toast.success("Question updated");
      navigate("/admin/questions");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  if (fetching || !form) {
    return (
      <div className="p-10 text-slate-400 text-center">Loading question…</div>
    );
  }

  /* ===============================
     RENDER
  =============================== */
  return (
    <div className="max-w-4xl mx-auto p-8">
      <Card className="p-8 space-y-6 bg-slate-900 border-slate-800">
        <h1 className="text-2xl font-black text-white">Edit Question</h1>

        <Input
          label="Question Text"
          value={form.questionText}
          onChange={(e) => setForm({ ...form, questionText: e.target.value })}
        />

        <div className="flex gap-4">
          <Input
            label="Marks"
            type="number"
            min={1}
            value={form.marks}
            onChange={(e) =>
              setForm({ ...form, marks: Number(e.target.value) })
            }
          />

          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1">Type</label>
            <select
              disabled
              value={type}
              className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-400 cursor-not-allowed"
            >
              <option>{type}</option>
            </select>
          </div>
        </div>

        {/* ========== MCQ ========== */}
        {type === "mcq" && (
          <div className="space-y-4">
            {form.mcq.options.map((opt, i) => (
              <div key={i} className="flex gap-3 items-center">
                <input
                  type="radio"
                  checked={form.mcq.correctAnswer === i}
                  onChange={() =>
                    setForm({
                      ...form,
                      mcq: { ...form.mcq, correctAnswer: i },
                    })
                  }
                />
                <Input
                  value={opt}
                  onChange={(e) => {
                    const options = [...form.mcq.options];
                    options[i] = e.target.value;
                    setForm({
                      ...form,
                      mcq: { ...form.mcq, options },
                    });
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* ========== DESCRIPTIVE ========== */}
        {type === "descriptive" && (
          <Textarea
            label="Sample Answer"
            value={form.descriptive.sampleAnswer}
            onChange={(e) =>
              setForm({
                ...form,
                descriptive: { sampleAnswer: e.target.value },
              })
            }
          />
        )}

        {/* ========== CODING ========== */}
        {type === "coding" && (
          <div className="space-y-4">
            <Textarea
              label="Problem Statement"
              value={form.coding.problemStatement}
              onChange={(e) =>
                setForm({
                  ...form,
                  coding: {
                    ...form.coding,
                    problemStatement: e.target.value,
                  },
                })
              }
            />

            {/* Sample Test Cases (Visible) */}
            <div>
              <h4 className="font-bold text-white mb-2">
                Sample Test Cases (Visible to candidate)
              </h4>

              {form.coding.sampleTestCases.map((tc, i) => (
                <div key={i} className="grid grid-cols-2 gap-4 mb-3">
                  <Textarea
                    placeholder="Input (stdin)"
                    value={tc.input}
                    onChange={(e) => {
                      const arr = [...form.coding.sampleTestCases];
                      arr[i].input = e.target.value;
                      setForm({
                        ...form,
                        coding: { ...form.coding, sampleTestCases: arr },
                      });
                    }}
                  />
                  <Textarea
                    placeholder="Output (stdout)"
                    value={tc.output}
                    onChange={(e) => {
                      const arr = [...form.coding.sampleTestCases];
                      arr[i].output = e.target.value;
                      setForm({
                        ...form,
                        coding: { ...form.coding, sampleTestCases: arr },
                      });
                    }}
                  />
                  <Textarea
                    className="col-span-2"
                    placeholder="Explanation (optional)"
                    value={tc.explanation}
                    onChange={(e) => {
                      const arr = [...form.coding.sampleTestCases];
                      arr[i].explanation = e.target.value;
                      setForm({
                        ...form,
                        coding: { ...form.coding, sampleTestCases: arr },
                      });
                    }}
                  />
                </div>
              ))}

              <Button
                variant="secondary"
                onClick={() =>
                  setForm({
                    ...form,
                    coding: {
                      ...form.coding,
                      sampleTestCases: [
                        ...form.coding.sampleTestCases,
                        { input: "", output: "", explanation: "" },
                      ],
                    },
                  })
                }
              >
                + Add Sample Test Case
              </Button>
            </div>

            <h4 className="font-bold text-white">Hidden Test Cases</h4>

            {form.coding.hiddenTestCases.map((tc, i) => (
              <div key={i} className="grid grid-cols-2 gap-4 mb-3">
                <Textarea
                  placeholder="Input"
                  value={tc.input}
                  onChange={(e) => {
                    const arr = [...form.coding.hiddenTestCases];
                    arr[i].input = e.target.value;
                    setForm({
                      ...form,
                      coding: {
                        ...form.coding,
                        hiddenTestCases: arr,
                      },
                    });
                  }}
                />
                <Textarea
                  placeholder="Expected Output"
                  value={tc.output}
                  onChange={(e) => {
                    const arr = [...form.coding.hiddenTestCases];
                    arr[i].output = e.target.value;
                    setForm({
                      ...form,
                      coding: {
                        ...form.coding,
                        hiddenTestCases: arr,
                      },
                    });
                  }}
                />
              </div>
            ))}

            <Button
              variant="secondary"
              onClick={() =>
                setForm({
                  ...form,
                  coding: {
                    ...form.coding,
                    hiddenTestCases: [
                      ...form.coding.hiddenTestCases,
                      { input: "", output: "" },
                    ],
                  },
                })
              }
            >
              + Add Test Case
            </Button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Time Limit (ms)"
            type="number"
            value={form.coding.timeLimitMs}
            onChange={(e) =>
              setForm({
                ...form,
                coding: {
                  ...form.coding,
                  timeLimitMs: Number(e.target.value),
                },
              })
            }
          />

          <Input
            label="Memory Limit (MB)"
            type="number"
            value={form.coding.memoryLimitMb}
            onChange={(e) =>
              setForm({
                ...form,
                coding: {
                  ...form.coding,
                  memoryLimitMb: Number(e.target.value),
                },
              })
            }
          />

          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Supported Languages
            </label>
            <select
              multiple
              value={form.coding.supportedLanguages}
              onChange={(e) =>
                setForm({
                  ...form,
                  coding: {
                    ...form.coding,
                    supportedLanguages: Array.from(
                      e.target.selectedOptions,
                      (o) => o.value
                    ),
                  },
                })
              }
              className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white h-24"
            >
              <option value="cpp">C++</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
            </select>
          </div>
        </div>

        <Button fullWidth size="lg" onClick={handleUpdate} disabled={loading}>
          {loading ? "Updating..." : "Update Question"}
        </Button>
      </Card>
    </div>
  );
};

export default EditQuestion;
