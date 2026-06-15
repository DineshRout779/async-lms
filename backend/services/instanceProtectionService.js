const { AutoScalingClient, SetInstanceProtectionCommand } = require("@aws-sdk/client-auto-scaling");
const axios = require('axios');

const asgClient = new AutoScalingClient({ region: process.env.AWS_REGION || "ap-south-1" });

let myInstanceId = null;
let isProtected = false;

async function getEc2InstanceId() {
  if (myInstanceId) return myInstanceId;
  
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
    return 'local-instance';
  }

  try {
    // 1. Get IMDSv2 Token
    const tokenRes = await axios.put('http://169.254.169.254/latest/api/token', null, {
      headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '21600' },
      timeout: 2000
    });
    const token = tokenRes.data;

    // 2. Get Instance ID
    const idRes = await axios.get('http://169.254.169.254/latest/meta-data/instance-id', {
      headers: { 'X-aws-ec2-metadata-token': token },
      timeout: 2000
    });
    myInstanceId = idRes.data;
    console.log(`[protection] Fetched EC2 Instance ID: ${myInstanceId}`);
    return myInstanceId;
  } catch (error) {
    console.error(`[protection] Failed to fetch EC2 Instance ID: ${error.message}`);
    return null;
  }
}

/**
 * Locks or Unlocks the EC2 Instance from Auto Scaling Termination.
 * @param {boolean} protect - True to lock the doors, False to unlock.
 */
async function setInstanceProtection(protect) {
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
    return;
  }

  if (isProtected === protect) return; // No state change needed

  const instanceId = await getEc2InstanceId();
  if (!instanceId || !process.env.ASG_NAME) {
    if (!process.env.ASG_NAME) {
      console.warn(`[protection] Cannot set protection: ASG_NAME environment variable is not defined.`);
    }
    return;
  }

  try {
    const params = {
      InstanceIds: [instanceId],
      AutoScalingGroupName: process.env.ASG_NAME,
      ProtectedFromScaleIn: protect
    };

    await asgClient.send(new SetInstanceProtectionCommand(params));
    isProtected = protect;
    console.log(`[protection] Instance ${instanceId} protection set to: ${protect}`);
  } catch (error) {
    console.error(`[protection] Failed to set instance protection:`, error.message);
  }
}

module.exports = {
  setInstanceProtection
};
