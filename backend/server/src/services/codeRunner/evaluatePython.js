import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";

const TEMP_DIR = path.join(process.cwd(), "src", "temp");
const CONTAINER_NAME = "python_worker_v1";

const runInContainer = (cmd) => {
  return new Promise((resolve) => {
    exec(
      `docker exec ${CONTAINER_NAME} bash -c "${cmd}"`,
      (error, stdout, stderr) => {
        resolve({ error, stdout: stdout.trim(), stderr: stderr.trim() });
      }
    );
  });
};

export const evaluatePythonCode = async ({
  code,
  hiddenTestCases,
  timeLimitMs = 2000,
}) => {
  const submissionId = uuid();
  const srcName = `script_${submissionId}.py`;
  const localSrcPath = path.join(TEMP_DIR, srcName);

  try {
    fs.writeFileSync(localSrcPath, code);

    // Copy file
    await new Promise((resolve, reject) => {
      exec(`docker cp "${localSrcPath}" ${CONTAINER_NAME}:/${srcName}`, (err) =>
        err ? reject(err) : resolve()
      );
    });

    // Optional: Check syntax errors before running logic
    const syntaxCheck = await runInContainer(
      `python3 -m py_compile /${srcName}`
    );
    if (syntaxCheck.error) {
      runInContainer(`rm /${srcName}`);
      return {
        verdict: "Syntax Error",
        passed: 0,
        total: hiddenTestCases.length,
        executionTimeMs: 0,
        error: syntaxCheck.stderr,
      };
    }

    let passed = 0;
    let maxTime = 0;
    let finalVerdict = "Accepted";
    let firstError = null;

    for (const testCase of hiddenTestCases) {
      const { input, output } = testCase;

      const runCmd = `
        start=$(date +%s%N);
        timeout ${timeLimitMs / 1000}s python3 /${srcName} << 'EOF'
${input}
EOF
        exitCode=$?;
        end=$(date +%s%N);
        duration=$(( (end - start) / 1000000 ));
        echo "===TIME: $duration";
        exit $exitCode;
      `;

      const result = await new Promise((resolve) => {
        const child = spawn("docker", [
          "exec",
          "-i",
          CONTAINER_NAME,
          "bash",
          "-c",
          runCmd,
        ]);
        let outData = "",
          errData = "";
        child.stdout.on("data", (d) => (outData += d.toString()));
        child.stderr.on("data", (d) => (errData += d.toString()));
        child.on("close", (code) => resolve({ outData, errData, code }));
      });

      const timeMatch = result.outData.match(/===TIME: (\d+)/);
      const executionTime = timeMatch ? parseInt(timeMatch[1], 10) : 0;
      const userOutput = result.outData.replace(/===TIME: \d+\n?/, "").trim();

      maxTime = Math.max(maxTime, executionTime);

      if (result.code === 124) {
        if (finalVerdict === "Accepted") finalVerdict = "Time Limit Exceeded";
      } else if (result.code !== 0) {
        if (finalVerdict === "Accepted") {
          finalVerdict = "Runtime Error";
          firstError = result.errData;
        }
      } else if (userOutput === output.trim()) {
        passed++;
      } else {
        if (finalVerdict === "Accepted") finalVerdict = "Wrong Answer";
      }
    }

    cleanup();
    return {
      verdict: finalVerdict,
      passed,
      total: hiddenTestCases.length,
      executionTimeMs: maxTime,
      error: firstError,
    };

    function cleanup() {
      runInContainer(`rm /${srcName}`);
      try {
        if (fs.existsSync(localSrcPath)) fs.unlinkSync(localSrcPath);
      } catch {}
    }
  } catch (err) {
    return { verdict: "System Error", error: err.message };
  }
};
