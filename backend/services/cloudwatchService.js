const { CloudWatchClient, PutMetricDataCommand } = require("@aws-sdk/client-cloudwatch");

const cwClient = new CloudWatchClient({ region: process.env.AWS_REGION || "ap-south-1" });

/**
 * Pushes the current Redis Queue waiting count to AWS CloudWatch.
 * This triggers the Auto Scaling Group instantly instead of waiting for a 1-minute timer.
 */
async function pushQueueMetric(waitingCount) {
  // If we are developing locally, do not attempt to push to AWS
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
    return;
  }

  try {
    const params = {
      MetricData: [
        {
          MetricName: "WorkspaceQueueLength",
          Dimensions: [
            { Name: "Environment", Value: process.env.NODE_ENV || "staging" }
          ],
          Unit: "Count",
          Value: waitingCount,
        },
      ],
      Namespace: "CodeGuru/LMS",
    };
    
    await cwClient.send(new PutMetricDataCommand(params));
    console.log(`[cloudwatch] Pushed QueueLength=${waitingCount} to AWS`);
  } catch (error) {
    console.error("[cloudwatch] Failed to push to AWS:", error.message);
  }
}

module.exports = {
  pushQueueMetric
};
