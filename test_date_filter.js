// Test with UTC+5:30 timezone consideration
const testCases = [
    { createdAt: "2026-01-10T18:00:00.000Z", label: "Jan 10, 6:00 PM UTC = Jan 10, 11:30 PM IST" },
    { createdAt: "2026-01-10T19:00:00.000Z", label: "Jan 10, 7:00 PM UTC = Jan 11, 12:30 AM IST" },
    { createdAt: "2026-01-10T05:00:00.000Z", label: "Jan 10, 5:00 AM UTC = Jan 10, 10:30 AM IST" }
];

const startDate = "2026-01-10";
const endDate = "2026-01-10";

testCases.forEach(test => {
    const d = new Date(test.createdAt);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const orderDate = `${year}-${month}-${day}`;

    const passes = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);

    console.log(`\n${test.label}`);
    console.log(`  Created: ${test.createdAt}`);
    console.log(`  Local Date: ${d.toLocaleDateString()}`);
    console.log(`  Order Date: ${orderDate}`);
    console.log(`  Filter: ${startDate} to ${endDate}`);
    console.log(`  Result: ${passes ? 'SHOW' : 'HIDE'}`);
});
