const { runProgram } = require("./runnerService");
const { ensureWorkspaceContainer } = require("./workspaceRuntime");
const { createTerminal } = require("./terminalService");

const PROFILE_RULES = {
  javascript: { timeout: 5000, maxOutput: 64 * 1024 },
  python: { timeout: 5000, maxOutput: 64 * 1024 },
  mern: { timeout: null, maxOutput: 5 * 1024 * 1024 }
};

let terminals = new Map();

module.exports = function setupSocket(io) {
  io.on("connection", (socket) => {
    let currentProcess = null;
    let timeoutHandle = null;
    let outputBytes = 0;
    let currentProfile = null;

    socket.workspace = null;

    const clearExecution = () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      currentProcess = null;
      outputBytes = 0;
      currentProfile = null;
    };

    socket.on("program:run", async ({ userId, projectId, profile, files }) => {
      try {
        if (profile === "mern") {
          throw new Error("MERN must use workspace runtime");
        }

        const proc = runProgram({ userId, projectId, profile, files });
        currentProcess = proc;
        currentProfile = profile;

        socket.emit("program:status", "running");

        proc.stdout.on("data", (d) => socket.emit("program:stdout", d.toString()));
        proc.stderr.on("data", (d) => socket.emit("program:stderr", d.toString()));

        proc.on("close", () => {
          socket.emit("program:status", "finished");
          clearExecution();
        });

      } catch (err) {
        socket.emit("program:stderr", String(err));
        socket.emit("program:status", "failed");
        clearExecution();
      }
    });

    socket.on("workspace:start", async ({ userId, projectId, image }) => {
      socket.workspace = { userId, projectId };
      await ensureWorkspaceContainer({ userId, projectId, image });
      socket.emit("workspace:ready");
    });

    socket.on("terminal:start", () => {
      const { userId, projectId } = socket.workspace;
      const term = createTerminal({ userId, projectId });

      terminals.set(socket.id, term);

      term.onData((data) => {
        socket.emit("terminal:output", data);
      });
    });

    socket.on("terminal:input", (data) => {
      const term = terminals.get(socket.id);
      if (term) term.write(data);
    });

    socket.on("disconnect", () => {
      const term = terminals.get(socket.id);
      if (term) term.kill();
      if (currentProcess) currentProcess.kill();
    });
  });
};
