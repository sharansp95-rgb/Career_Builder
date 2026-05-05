/**
 * Unit tests for src/lib/auth.ts
 * Tests pure functions: storeAuth, getUserProfile, getStoredToken,
 * isLoggedIn, and getRedirectForRole. No network calls involved.
 */

import { storeAuth, getUserProfile, getStoredToken, isLoggedIn, getRedirectForRole } from "@/lib/auth";

// ── localStorage mock ───────────────────────────────────────────────────────

const mockStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: mockStorage, writable: false });

beforeEach(() => {
  mockStorage.clear();
  // Reset document.cookie so storeAuth cookie writes don't bleed between tests
  Object.defineProperty(document, "cookie", { writable: true, value: "" });
});

// ── getRedirectForRole ──────────────────────────────────────────────────────

describe("getRedirectForRole", () => {
  it("routes recruiters to /recruiter", () => {
    expect(getRedirectForRole("recruiter")).toBe("/recruiter");
  });

  it("routes job_seekers to /upload", () => {
    expect(getRedirectForRole("job_seeker")).toBe("/upload");
  });

  it("routes null to /select-role", () => {
    expect(getRedirectForRole(null)).toBe("/select-role");
  });

  it("routes undefined to /select-role", () => {
    expect(getRedirectForRole(undefined)).toBe("/select-role");
  });

  it("routes unknown strings to /select-role", () => {
    expect(getRedirectForRole("admin")).toBe("/select-role");
    expect(getRedirectForRole("")).toBe("/select-role");
  });
});

// ── storeAuth / read-back ───────────────────────────────────────────────────

describe("storeAuth + getUserProfile + getStoredToken", () => {
  const profile = { name: "Alice", email: "alice@example.com", role: "job_seeker" as const };

  it("persists the JWT in localStorage", () => {
    storeAuth("tok-123", profile);
    expect(getStoredToken()).toBe("tok-123");
  });

  it("persists the profile in localStorage", () => {
    storeAuth("tok-456", profile);
    expect(getUserProfile()).toEqual(profile);
  });

  it("overwrites a previous token", () => {
    storeAuth("old-tok", profile);
    storeAuth("new-tok", profile);
    expect(getStoredToken()).toBe("new-tok");
  });

  it("overwrites a previous profile", () => {
    storeAuth("tok", profile);
    const updated = { ...profile, name: "Alicia" };
    storeAuth("tok", updated);
    expect(getUserProfile()?.name).toBe("Alicia");
  });
});

// ── getUserProfile / getStoredToken defaults ────────────────────────────────

describe("getUserProfile", () => {
  it("returns null when nothing has been stored", () => {
    expect(getUserProfile()).toBeNull();
  });

  it("returns null when localStorage contains invalid JSON", () => {
    mockStorage.setItem("user_profile", "{{bad json");
    expect(getUserProfile()).toBeNull();
  });
});

describe("getStoredToken", () => {
  it("returns null when nothing has been stored", () => {
    expect(getStoredToken()).toBeNull();
  });
});

// ── isLoggedIn ──────────────────────────────────────────────────────────────

describe("isLoggedIn", () => {
  const profile = { name: "Bob", email: "bob@example.com", role: "recruiter" as const };

  it("returns false when nothing is stored", () => {
    expect(isLoggedIn()).toBe(false);
  });

  it("returns true after a successful storeAuth", () => {
    storeAuth("valid-tok", profile);
    expect(isLoggedIn()).toBe(true);
  });

  it("returns false when profile is present but token is missing", () => {
    mockStorage.setItem("user_profile", JSON.stringify(profile));
    expect(isLoggedIn()).toBe(false);
  });

  it("returns false when token is present but profile is missing", () => {
    mockStorage.setItem("auth_jwt", "some-token");
    expect(isLoggedIn()).toBe(false);
  });
});
