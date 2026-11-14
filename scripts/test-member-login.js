require("./dns-preload.cjs");
require("dotenv").config();

async function testMemberLogin() {
  const baseUrl = "http://localhost:3000";

  // 1. Check health
  const healthRes = await fetch(`${baseUrl}/api/health`);
  console.log("Health:", await healthRes.json());

  // 2. We can test member login using the server function or via smoke test Browser helper
  const { loginMemberWithPassword } = require("../src/server/auth/member-auth.ts");
  
  const result = await loginMemberWithPassword({
    phone: "98765 43210",
    password: "MatrixGym2026!#",
    ip: "127.0.0.1",
    userAgent: "TestAgent/1.0"
  });

  console.log("loginMemberWithPassword result:", result);

  if (result.ok) {
    const memberPageRes = await fetch(`${baseUrl}/member`, {
      headers: {
        cookie: `gymos_session=${result.token}`
      }
    });
    console.log("Member Page HTTP Status:", memberPageRes.status);
    const text = await memberPageRes.text();
    console.log("Rendered Member Page Title:", text.includes("Hi, John!") || text.includes("Member Portal"));
    console.log("Left Sidebar Rendered:", text.includes("Official Digital Gym Pass") || text.includes("Digital Pass"));
  }
}

testMemberLogin().catch(console.error);
