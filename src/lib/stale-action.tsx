"use client";

import { useEffect } from "react";
import { unstable_isUnrecognizedActionError } from "next/navigation";
import { isStaleServerActionMessage } from "@/lib/stale-action-message";

const GUARD_KEY = "cedar-stale-action-reload";
const RELOAD_MESSAGE = "The app was updated, reloading...";

export function isStaleServerAction(error: unknown) {
  if (unstable_isUnrecognizedActionError(error)) return true;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return isStaleServerActionMessage(message);
}

export function reloadForStaleAction() {
  if (typeof window === "undefined") return;
  const blocked = reloadGuardIsSet();
  showReloadNotice(blocked);
  if (blocked) return;
  try {
    sessionStorage.setItem(GUARD_KEY, "1");
  } catch {
    // Private mode can block storage. Reload once anyway.
  }
  window.location.reload();
}

export function clearStaleActionReload() {
  try {
    sessionStorage.removeItem(GUARD_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export async function callServerAction<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isNavigationError(error)) throw error;
    if (isStaleServerAction(error)) {
      reloadForStaleAction();
      return new Promise<T>(() => {});
    }
    throw error;
  }
}

export function bindServerAction<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
) {
  return (...args: Args) => callServerAction(() => action(...args));
}

/** Clears the one-reload guard after a page stays up, so a later deploy can reload once. */
export function StaleActionReset() {
  useEffect(() => {
    const timeout = window.setTimeout(() => clearStaleActionReload(), 2000);
    return () => window.clearTimeout(timeout);
  }, []);
  return null;
}

export function useRecoverStaleAction(error: Error) {
  const stale = isStaleServerAction(error);
  useEffect(() => {
    if (!stale) return;
    reloadForStaleAction();
  }, [stale]);
  return stale;
}

function reloadGuardIsSet() {
  try {
    return sessionStorage.getItem(GUARD_KEY) === "1";
  } catch {
    return false;
  }
}

function showReloadNotice(blocked: boolean) {
  if (document.getElementById("stale-action-notice")) return;
  const notice = document.createElement("div");
  notice.id = "stale-action-notice";
  notice.setAttribute("role", "status");
  notice.style.cssText =
    "position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:1.5rem;background:#f3ecdf;color:#1c241f;text-align:center;font:600 1.25rem Georgia,serif;";
  notice.textContent = RELOAD_MESSAGE;
  if (blocked) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Reload";
    button.style.cssText =
      "display:block;margin:1rem auto 0;min-height:2.75rem;padding:0 1rem;border:0;border-radius:999px;background:#1f5c45;color:#fff;font:600 0.875rem sans-serif;";
    button.addEventListener("click", () => {
      clearStaleActionReload();
      window.location.reload();
    });
    notice.appendChild(button);
  }
  document.body.appendChild(notice);
}

function isNavigationError(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = String((error as { digest?: unknown }).digest ?? "");
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK");
}
