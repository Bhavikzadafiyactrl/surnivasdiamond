// const fetch = require('node-fetch');

async function test() {
    try {
        const response = await fetch('http://localhost:5000/api/diamonds/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shape: ['ROUND'],
                diameter: "13.8"
            })
        });
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
        if (data.data && data.data.length > 0) {
            console.log('Sample:', data.data[0]);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
