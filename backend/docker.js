const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const LANGUAGE_CONFIG = {
  javascript: {
    image: "playground-node-runner",
    filename: "index.js",
  },
  python: {
    image: "playground-python-runner",
    filename: "main.py",
  },
};

function runProgram(language, files) {
  return new Promise((resolve, reject) => {
    const config = LANGUAGE_CONFIG[language];
    if(!language){
      return reject(new Error(`No language provided`)) 
    }
    console.log('Selected language: ', language);
    if (!config) {
      return reject(new Error(`Unsupported language: ${language}`));
    }

    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "playground-"));

    // write all files
    for (const file of files) {
      const filePath = path.join(workspace, file.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.content);
    }

    const docker = spawn("docker", [
      "run",
      "--rm",
      "--memory=256m",
      "--cpus=0.5",
      "--network=none",
      "-v",
      `${workspace}:/workspace:ro`,
      config.image,
    ]);

    docker.on("error", reject);
    resolve(docker);
  });
}

module.exports = { runProgram };
