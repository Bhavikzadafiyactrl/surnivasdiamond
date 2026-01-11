require('dotenv').config();

async function testConfig() {
    console.log("--- Starting Turnstile Diagnostic ---");

    // 1. Check Node Version
    console.log(`Node Version: ${process.version}`);

    // 2. Check Environment Variable
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
        console.error("❌ ERROR: TURNSTILE_SECRET_KEY is NOT defined in process.env");
        console.log("Please check your .env file.");
    } else {
        console.log("✅ TURNSTILE_SECRET_KEY is present.");
        const visiblePart = secretKey.substring(0, 4) + '...' + secretKey.substring(secretKey.length - 4);
        console.log(`   Value: ${visiblePart} (Length: ${secretKey.length})`);

        // Common format check (Cloudflare keys usually start with 0x4 or similar, verify docs if needed, but length checks are good)
        if (secretKey.startsWith('0x4')) {
            console.log("   Format: Looks like a valid secret key format (starts with 0x4).");
        } else {
            console.warn("   ⚠️ WARNING: Key does not start with '0x4AAAA...'. Usually Secret Keys start with 0x4. Site Keys start with 0x4 too but might be different. Ensure this is the SECRET key, not Site key.");
        }
    }

    // 3. Test Connectivity to Cloudflare
    console.log("\n--- Testing Cloudflare Connectivity ---");
    try {
        const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        console.log(`Sending POST request to ${url} with dummy token...`);

        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                secret: secretKey || 'dummy_secret',
                response: 'dummy_token_test'
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log("Cloudflare Response:", JSON.stringify(data, null, 2));

        if (data.success === false) {
            console.log("✅ Expected failure (success: false) for dummy token.");

            if (data['error-codes']) {
                if (data['error-codes'].includes('invalid-input-secret')) {
                    console.error("❌ CRITICAL: Cloudflare reports 'invalid-input-secret'. Your TURNSTILE_SECRET_KEY is likely incorrect.");
                } else if (data['error-codes'].includes('missing-input-secret')) {
                    console.error("❌ CRITICAL: Cloudflare reports 'missing-input-secret'.");
                } else {
                    console.log("   Error codes are standard for dummy token (likely invalid-input-response). This means the API connection IS working and the Secret Key MIGHT be valid (or at least not immediately rejected if not checked first).");
                }
            }
        } else {
            console.log("⚠️ Unexpected success? Did you use a special test key?");
        }

    } catch (error) {
        console.error("❌ NETWORK/CODE ERROR:", error.message);
        if (error.message.includes("fetch is not defined")) {
            console.error("   Hint: You might be on an older Node version. server.js uses 'fetch'. If this script fails, server.js might also be failing.");
        }
    }
    console.log("--- End Diagnostic ---");
}

testConfig();
