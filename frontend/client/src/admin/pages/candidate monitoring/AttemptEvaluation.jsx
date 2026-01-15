const AttemptEvaluation = ({ attempt }) => {
  const answersMap = new Map(
    attempt.answers.map((a) => [a.question._id, a])
  );

  return (
    <div className="space-y-6">
      {attempt.test.questions.map((q, index) => {
        const ans = answersMap.get(q._id);

        return (
          <div key={q._id} className="border border-slate-800 rounded-xl p-5">
            <div className="flex justify-between">
              <h3 className="font-bold">
                Q{index + 1}. {q.questionText}
              </h3>
              <span className="text-sm text-slate-400">
                {ans?.marksAwarded ?? 0} / {q.marks}
              </span>
            </div>

            {/* MCQ */}
            {q.type === "mcq" && (
              <div className="mt-3 space-y-1">
                {q.mcq.options.map((opt, i) => (
                  <p
                    key={i}
                    className={`text-sm ${
                      i === q.mcq.correctAnswer
                        ? "text-green-400"
                        : i === ans?.mcqAnswer
                        ? "text-red-400"
                        : "text-slate-400"
                    }`}
                  >
                    {opt}
                  </p>
                ))}
              </div>
            )}

            {/* DESCRIPTIVE */}
            {q.type === "descriptive" && (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-slate-400">Candidate Answer:</p>
                <p className="bg-slate-900 p-3 rounded">
                  {ans?.descriptiveAnswer || "—"}
                </p>

                <p className="text-slate-400">Sample Answer:</p>
                <p className="bg-slate-900 p-3 rounded">
                  {q.descriptive.sampleAnswer}
                </p>
              </div>
            )}

            {/* CODING */}
            {q.type === "coding" && (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-slate-400">
                  Verdict:{" "}
                  <span
                    className={
                      ans?.codingAnswer?.verdict === "Accepted"
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {ans?.codingAnswer?.verdict}
                  </span>
                </p>

                <pre className="bg-black p-3 rounded overflow-x-auto text-xs">
                  {ans?.codingAnswer?.code}
                </pre>

                <p className="text-slate-400">
                  Passed: {ans?.codingAnswer?.passedTestCases} /{" "}
                  {ans?.codingAnswer?.totalTestCases}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AttemptEvaluation;
