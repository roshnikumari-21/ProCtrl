import { exec, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";

const TEMP_DIR = path.join(process.cwd(), "src", "temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const CONTAINER_NAME = "cpp_worker_v1";

/**
 * 1. INITIALIZATION: Start a single persistent Docker container.
 * Call this ONCE when your server starts (e.g., in index.js).
 */
export const initCppWorker = async () => {
  return new Promise((resolve) => {
    // Check if container is already running
    exec(`docker ps -q -f name=${CONTAINER_NAME}`, (err, stdout) => {
      if (stdout.trim()) {
        console.log("✅ C++ Worker container is already running.");
        return resolve();
      }

      // Clean up any stopped container with same name
      exec(`docker rm -f ${CONTAINER_NAME}`, () => {
        console.log("🚀 Starting C++ Worker container...");
        // Start a container that stays alive forever (tail -f /dev/null)
        // We mount nothing. Everything happens in memory or temp storage.
        exec(
          `docker run -d --name ${CONTAINER_NAME} --cpus="1.0" --memory="512m" gcc:latest tail -f /dev/null`,
          (error) => {
            if (error) console.error("Failed to start worker:", error);
            else console.log("✅ C++ Worker ready.");
            resolve();
          }
        );
      });
    });
  });
};

/**
 * Helper: Run a command inside the persistent container
 */
const runInContainer = (cmd) => {
  return new Promise((resolve, reject) => {
    exec(
      `docker exec ${CONTAINER_NAME} bash -c "${cmd}"`,
      (error, stdout, stderr) => {
        // Note: We resolve even on error to handle compilation failures gracefully
        resolve({ error, stdout: stdout.trim(), stderr: stderr.trim() });
      }
    );
  });
};

/**
 * 2. EVALUATION: Compiles and runs code inside the existing worker.
 */
export const evaluateCppCode = async ({
  code,
  hiddenTestCases,
  timeLimitMs = 2000,
}) => {
  // Use unique ID for this specific submission to allow concurrency
  const submissionId = uuid();
  const srcName = `src_${submissionId}.cpp`;
  const binName = `bin_${submissionId}`;

  // Local path (just for initial write)
  const localSrcPath = path.join(TEMP_DIR, srcName);

  try {
    // A. Write source locally
    fs.writeFileSync(localSrcPath, code);

    // B. Copy source to container (Fast 'docker cp')
    await new Promise((resolve, reject) => {
      exec(
        `docker cp "${localSrcPath}" ${CONTAINER_NAME}:/${srcName}`,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // C. Compile (Inside container)
    // We strictly catch compilation errors here
    const compileRes = await runInContainer(
      `g++ -O2 /${srcName} -o /${binName}`
    );

    if (compileRes.error) {
      // Cleanup source
      runInContainer(`rm /${srcName}`);
      return {
        verdict: "Compilation Error",
        passed: 0,
        total: hiddenTestCases.length,
        executionTimeMs: 0,
        error: compileRes.stderr,
      };
    }

    // D. Run Test Cases
    let passed = 0;
    let maxTime = 0;
    let finalVerdict = "Accepted";
    let firstError = null;

    for (const testCase of hiddenTestCases) {
      const { input, output } = testCase;
      const inputBase64 = Buffer.from(input || "").toString("base64");

      // MEASUREMENT TRICK:
      // We wrap the execution in a shell script that measures time using `date`
      // This measures ONLY the C++ process time, excluding Docker overhead.
      const runCmd = `
        start=$(date +%s%N);
        echo "${inputBase64}" | base64 -d | timeout ${
        timeLimitMs / 1000
      }s /${binName}
        exitCode=$?;
        end=$(date +%s%N);
        duration=$(( (end - start) / 1000000 ));
        echo "===TIME: $duration";
        exit $exitCode;
      `;

      // We use spawn for running to capture stdout stream clearly
      const result = await new Promise((resolve) => {
        const child = spawn("docker", [
          "exec",
          "-i",
          CONTAINER_NAME,
          "bash",
          "-c",
          runCmd,
        ]);

        let outData = "";
        let errData = "";

        child.stdout.on("data", (d) => (outData += d.toString()));
        child.stderr.on("data", (d) => (errData += d.toString()));

        child.on("close", (code) => {
          resolve({ outData, errData, code });
        });
      });

      // Parse Internal Time
      const timeMatch = result.outData.match(/===TIME: (\d+)/);
      const executionTime = timeMatch ? parseInt(timeMatch[1], 10) : 0;

      // Clean stdout (remove our timing flag)
      const userOutput = result.outData.replace(/===TIME: \d+\n?/, "").trim();

      maxTime = Math.max(maxTime, executionTime);

      // 1. TLE Check
      if (result.code === 124) {
        if (finalVerdict === "Accepted") finalVerdict = "Time Limit Exceeded";
      }
      // 2. Runtime Error Check
      else if (result.code !== 0) {
        if (finalVerdict === "Accepted") {
          finalVerdict = "Runtime Error";
          firstError = result.errData;
        }
      }
      // 3. Logic Check
      else {
        const normalize = (str) => str.replace(/\r/g, "").trim();

        if (normalize(userOutput) === normalize(output)) {
          passed++;
        } else {
          if (finalVerdict === "Accepted") finalVerdict = "Wrong Answer";
        }
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
      // Fire and forget cleanup command inside container
      runInContainer(`rm /${srcName} /${binName}`);
      try {
        if (fs.existsSync(localSrcPath)) fs.unlinkSync(localSrcPath);
      } catch {}
    }
  } catch (err) {
    console.error(err);
    return { verdict: "System Error", error: err.message };
  }
};
