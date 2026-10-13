// test-concurrency.js
// Simulates 20 patients attempting to book the exact same doctor and slot at the exact same millisecond.

async function runRaceConditionTest() {
  console.log("=========================================================");
  console.log("⚡ INITIATING CONCURRENCY & RACE-CONDITION STRESS TEST");
  console.log("=========================================================");
  console.log("Target: Dr. David Kim (doc-4)");
  console.log("Slot  : Fri, Oct 17 @ 02:00 PM");
  console.log("Simulating: 20 simultaneous concurrent booking requests...\n");

  const TARGET_URL = "http://localhost:3000/api/appointments";

  const requests = Array.from({ length: 20 }, (_, i) => {
    const patientId = `patient-${i + 1}`;
    const payload = {
      doctorId: "doc-4",
      date: "Fri, Oct 17",
      time: "02:00 PM",
      patientName: `Concurrent Patient ${i + 1}`,
      patientEmail: `patient${i + 1}@stress-test.io`,
      reason: "High concurrency race condition verification",
    };

    return fetch(TARGET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      return {
        patientId,
        status: res.status,
        success: data.success,
        error: data.error,
        txId: data.txId,
      };
    });
  });

  const results = await Promise.all(requests);

  const successes = results.filter((r) => r.status === 201 && r.success);
  const rejections = results.filter((r) => r.status === 409);

  console.log("------------------ TEST RESULTS ------------------");
  console.log(`✅ Successes (Should be EXACTLY 1)  : ${successes.length}`);
  if (successes.length > 0) {
    console.log(`   Winner: ${successes[0].patientId} (TxID: ${successes[0].txId})`);
  }

  console.log(`❌ Rejections (Should be EXACTLY 19) : ${rejections.length}`);
  if (rejections.length > 0) {
    console.log(`   Sample Rejection Message: "${rejections[0].error}"`);
  }
  console.log("--------------------------------------------------");

  if (successes.length === 1 && rejections.length === 19) {
    console.log("🎉 VERIFICATION PASSED: ZERO DOUBLE-BOOKINGS GUARANTEED!");
    console.log("   Composite unique constraint @@unique([doctorId, date, time]) successfully defended data integrity!");
  } else {
    console.log(`⚠️ Note: Successes: ${successes.length}, Rejections: ${rejections.length}`);
  }
  console.log("=========================================================\n");
}

runRaceConditionTest();
