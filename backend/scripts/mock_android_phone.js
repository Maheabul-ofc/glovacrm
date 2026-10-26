const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

// Set your login credentials here to test
const EMAIL = 'admin@glovadev.com'; // Use the user email that clicks the call button
const PASSWORD = 'password123'; // Their password

async function runMockPhone() {
  console.log('📱 Mock Android Phone booting up...');
  
  try {
    // 1. Login to get Auth Token
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    });
    const token = loginRes.data.token;
    console.log('✅ Authenticated successfully. Waiting for calls...\n');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Poll the mobile-sync endpoint
    setInterval(async () => {
      try {
        const syncRes = await axios.get(`${API_URL}/calls/mobile-sync`, { headers });
        const pendingCalls = syncRes.data.data;

        if (pendingCalls.length > 0) {
          for (const call of pendingCalls) {
            console.log(`\n🔔 RING RING! CRM wants you to call: ${call.lead.phone}`);
            console.log(`🧑‍🦱 Name: ${call.lead.firstName} ${call.lead.lastName || ''}`);
            console.log(`⚙️ Automatically dialing now using Android Intent...`);

            // 3. Simulate a 5-second phone conversation
            await new Promise(resolve => setTimeout(resolve, 5000));
            const duration = Math.floor(Math.random() * 100) + 10;

            console.log(`📞 Call finished. Duration: ${duration}s. Syncing to CRM...`);

            // 4. Report back to CRM
            await axios.post(`${API_URL}/calls/mobile-sync`, {
              callId: call.id,
              status: 'COMPLETED',
              duration: duration
            }, { headers });

            console.log('✅ Sync complete.\n');
          }
        }
      } catch (err) {
        console.error('Error polling sync endpoint:', err.message);
      }
    }, 3000); // Check every 3 seconds

  } catch (error) {
    console.error('❌ Failed to login. Please check email/password in script.', error.message);
  }
}

runMockPhone();
