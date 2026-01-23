const { exec } = require('child_process');

exports.previewController = (req, res) => {
  const { userId, projectId, port } = req.params;
  const container = `workspace-${userId}-${projectId}`;

  const path = req.originalUrl.replace(
    `/preview/${userId}/${projectId}/${port}`,
    ''
  );

  const cmd = `
      docker exec ${container} sh -c "
        curl -s -i http://localhost:${port}${path}
      "
    `;

  exec(cmd, (err, stdout) => {
    if (err) {
      return res.status(502).send('Preview not available');
    }

    // Split headers + body
    const [rawHeaders, ...bodyParts] = stdout.split('\r\n\r\n');
    const body = bodyParts.join('\r\n\r\n');

    rawHeaders.split('\r\n').forEach((line) => {
      const [key, value] = line.split(': ');
      if (!key || !value) return;

      // Avoid breaking iframe
      if (key.toLowerCase() === 'content-length') return;
      if (key.toLowerCase() === 'connection') return;

      res.setHeader(key, value);
    });

    res.send(body);
  });
};
