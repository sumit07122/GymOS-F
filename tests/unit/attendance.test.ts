import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateDynamicReceptionQr,
  verifyReceptionQr,
  generateMemberPassQr,
  verifyMemberPassQr,
} from "@/server/gyms/attendance";

describe("Smart QR Attendance Cryptographic Engine", () => {
  const gymId = "11111111-2222-3333-4444-555555555555";
  const userId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const fixedNow = new Date("2026-11-14T10:00:00.000Z");

  beforeEach(() => {
    process.env.OTP_SECRET = "02f788c8663fd4b73a135f34914afae20062cfc7147a78b1bc844036ebf748ca";
  });

  describe("Dynamic Reception QR (30-second window)", () => {
    it("generates a well-formed signed reception QR", () => {
      const qr = generateDynamicReceptionQr(gymId, fixedNow);
      expect(qr.token).toMatch(/^GYMOS:RECEPTION:[0-9a-f-]+:\d+:[0-9a-f]{16}$/);
      expect(qr.expiresInSeconds).toBeGreaterThanOrEqual(1);
      expect(qr.expiresInSeconds).toBeLessThanOrEqual(30);
    });

    it("verifies a genuine reception QR token within valid window", () => {
      const qr = generateDynamicReceptionQr(gymId, fixedNow);
      const isValid = verifyReceptionQr(gymId, qr.token, fixedNow);
      expect(isValid).toBe(true);
    });

    it("rejects token when scanned for a different gym", () => {
      const otherGymId = "99999999-8888-7777-6666-555555555555";
      const qr = generateDynamicReceptionQr(gymId, fixedNow);
      const isValid = verifyReceptionQr(otherGymId, qr.token, fixedNow);
      expect(isValid).toBe(false);
    });

    it("rejects an expired reception QR (e.g. 5 minutes later)", () => {
      const qr = generateDynamicReceptionQr(gymId, fixedNow);
      const futureNow = new Date(fixedNow.getTime() + 5 * 60_000);
      const isValid = verifyReceptionQr(gymId, qr.token, futureNow);
      expect(isValid).toBe(false);
    });

    it("rejects a tampered or forged signature", () => {
      const qr = generateDynamicReceptionQr(gymId, fixedNow);
      const tampered = qr.token.slice(0, -4) + "ffff";
      const isValid = verifyReceptionQr(gymId, tampered, fixedNow);
      expect(isValid).toBe(false);
    });
  });

  describe("Member Digital Pass QR (60-second window)", () => {
    it("generates a well-formed signed member pass QR", () => {
      const pass = generateMemberPassQr(gymId, userId, fixedNow);
      expect(pass.token).toMatch(/^GYMOS:MEMBER:[0-9a-f-]+:[0-9a-f-]+:\d+:[0-9a-f]{16}$/);
      expect(pass.expiresInSeconds).toBeGreaterThanOrEqual(1);
      expect(pass.expiresInSeconds).toBeLessThanOrEqual(60);
    });

    it("verifies a valid member pass and extracts userId", () => {
      const pass = generateMemberPassQr(gymId, userId, fixedNow);
      const res = verifyMemberPassQr(gymId, pass.token, fixedNow);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.userId).toBe(userId);
      }
    });

    it("rejects a member pass scanned for the wrong gym", () => {
      const wrongGymId = "00000000-0000-0000-0000-000000000000";
      const pass = generateMemberPassQr(gymId, userId, fixedNow);
      const res = verifyMemberPassQr(wrongGymId, pass.token, fixedNow);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe("WRONG_GYM");
    });

    it("rejects an expired member pass (e.g. screenshot shared 10 minutes later)", () => {
      const pass = generateMemberPassQr(gymId, userId, fixedNow);
      const futureNow = new Date(fixedNow.getTime() + 10 * 60_000);
      const res = verifyMemberPassQr(gymId, pass.token, futureNow);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe("EXPIRED_QR");
    });
  });
});
