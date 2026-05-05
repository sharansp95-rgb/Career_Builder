/**
 * Unit tests for src/lib/auth.ts utility functions.
 * Runs in jsdom environment so localStorage and document.cookie are available.
 */
import { storeAuth, getUserProfile, isLoggedIn, logout } from "./auth";

// Stub fetch for the logout backend call
global.fetch = jest.fn().mockResolvedValue({ ok: true });

// Prevent window.location.href assignment from throwing in jsdom
Object.defineProperty(window, "location", {
  value: { href: "" },
  writable: true,
});

beforeEach(() => {
  localStorage.clear();
  document.cookie = "user_profile=; max-age=0; path=/";
  (global.fetch as jest.Mock).mockClear();
});

test("storeAuth saves the user profile to localStorage", () => {
  storeAuth("fake-token", { name: "Alice", email: "alice@example.com", role: "job_seeker" });
  const stored = localStorage.getItem("user_profile");
  expect(stored).not.toBeNull();
  const parsed = JSON.parse(stored!);
  expect(parsed.name).toBe("Alice");
  expect(parsed.email).toBe("alice@example.com");
});

test("getUserProfile returns null when nothing is stored", () => {
  expect(getUserProfile()).toBeNull();
});

test("isLoggedIn returns false when no profile exists", () => {
  expect(isLoggedIn()).toBe(false);
});

test("logout clears the user profile from localStorage", async () => {
  storeAuth("fake-token", { name: "Bob", email: "bob@example.com", role: "recruiter" });
  expect(localStorage.getItem("user_profile")).not.toBeNull();

  await logout();

  expect(localStorage.getItem("user_profile")).toBeNull();
});
