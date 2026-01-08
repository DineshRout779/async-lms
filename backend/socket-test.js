const { io } = require("socket.io-client");

// connect to backend
const socket = io("http://localhost:3001");

socket.on("connect", () => {
  console.log("Connected to backend");

  // send code to run
  socket.emit("program:run", {
    code: `
console.log("Hello from program runner");
console.log("2 + 2 =", 2 + 2);
`,
  });
});

// receive program output
socket.on("terminal:output", (data) => {
  process.stdout.write(data);
});

// receive status updates
socket.on("program:status", (status) => {
  console.log("\\nSTATUS:", status);

  if (status === "finished" || status === "failed") {
    socket.disconnect();
  }
});

socket.on("disconnect", () => {
  console.log("Disconnected");
});
