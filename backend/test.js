const axios = require('axios');
const crypto = require('crypto');
const https = require('https');
const Sha = (checkSumdata, key) => {
  try {
    const byteKey = Buffer.from(key, 'utf-8');
    const hmac = crypto.createHmac('sha512', byteKey);
    hmac.update(checkSumdata, 'utf-8');
    const result = hmac.digest('hex');
    // console.log(result);
    return result;
  } catch (e) {
    console.error(e);
    return null;
  }
};

const data = {
  batch_id: '1130108',
  vendor_id: 'iserveu',
  vendorData: [
    {
      channel: 'api',
      request_id: 'QR_02911_270822_6633188',
      branch_code: 'DP001',
      merchant_name: 'Tested User',
      merchant_delivery_address: 'Patia',
      merchant_delivery_pincode: '751003',
      state: 'Odisha',
      merchant_mobile: '9090121212',
      merchant_email: 'test30@gmail.com',
      mcc: '0743',
      vpa_id: 'test30@cnrb',
      requested_on: '2023-01-21 19:30:13',
      qr_string:
        'upi://pay?pa=test30@cnrb&pn=TestMerchant_2701_0001&mc=0743&tr=1234567887654321&tn=Pay to Merchant&am=0&mam=0&cu=INR&refUrl=http://npci.org/upi6633188/schema/',
      bank_name: 'Canara Bank',
    },
  ],
};

const bankey = '5723020cb3ec317831c503cb6a595c4a';
var checkSumString =
  data.batch_id +
  '|' +
  data.vendor_id +
  '|' +
  bankey +
  '|' +
  data.vendorData.map((item) => item.request_id).join('|') +
  '|';
const generatedChecksum = Sha(checkSumString, 'N$@T^%@$@@!*');
data.checksum = generatedChecksum;

const encryptData = async (data) => {
  try {
    const res = await axios.post(
      'https://services.iserveu.online/bankEnc/canara/soundbox/encrypt',
      { data },
    );
    console.log('ENCRY: ', res.data);
    return res.data.data;
  } catch (error) {
    console.log('Error while encr: ', error);
    return null;
  }
};

const decryptData = async (encryptedData) => {
  try {
    const res = await axios.post(
      'https://services.iserveu.online/bankEnc/canara/soundbox/decrypt',
      encryptedData,
    );
    return res.data;
  } catch (error) {
    console.log('Error while decr: ', error);
    return null;
  }
};

(async () => {
  try {
    // test encryption
    const encryptedData = await encryptData(JSON.stringify(data));
    console.log('Encrypted Data: ', encryptedData);
    const res = await axios.post(
      'https://canara.isupay.in/canara_onboarding/merchant/bulk-onboard',
      {
        data: encryptedData,
      },
      {
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      },
    );

    console.log('res status: ', res.status);
    console.log(res.data);

    // test decryption
    const decryptedData = await decryptData({ data: res.data.data });
    console.log('Decrypted Data: ', decryptedData);
  } catch (error) {
    console.log('Error:', error.message);
  }
})();
