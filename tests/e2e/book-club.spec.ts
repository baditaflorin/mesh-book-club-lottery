import { expect, test, type Page } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};

async function closeInitiallyOpenSettings(page: Page): Promise<void> {
  const settings = page.getByRole("dialog", { name: "Settings" });
  if (!(await settings.isVisible().catch(() => false))) return;
  const close = settings.getByRole("button", { name: "close" });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  } else {
    await page.keyboard.press("Escape");
  }
  await expect(settings).toBeHidden();
}

test("two readers share nominations and the same transparent pick", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", {
    storagePrefix: pkg.name,
  });

  try {
    await Promise.all([closeInitiallyOpenSettings(a), closeInitiallyOpenSettings(b)]);

    await a.getByLabel("Your name").fill("Ari");
    await a.getByLabel("Book title").fill("Kindred");
    await a.getByLabel("Author").fill("Octavia Butler");
    await a.getByRole("button", { name: "Add my nomination" }).click();
    await expect(a.getByText("Your title is on the list.")).toBeVisible();

    await expect(b.getByText("Kindred", { exact: true })).toBeVisible();
    await b.getByLabel("Your name").fill("Bea");
    await b.getByLabel("Book title").fill("The Left Hand of Darkness");
    await b.getByLabel("Author").fill("Ursula K. Le Guin");
    await b.getByRole("button", { name: "Add my nomination" }).click();

    await expect(a.getByText("The Left Hand of Darkness", { exact: true })).toBeVisible();
    await expect(a.getByRole("button", { name: "Reveal the room’s pick" })).toBeEnabled();
    await a.getByRole("button", { name: "Reveal the room’s pick" }).click();

    await expect(a.getByText("Tonight’s pick")).toBeVisible();
    await expect(b.getByText("Tonight’s pick")).toBeVisible();
    await expect
      .poll(async () => b.locator(".book-club-winner strong").textContent())
      .toBe(await a.locator(".book-club-winner strong").textContent());
  } finally {
    await cleanup();
  }
});

test("the first nomination action is visible and contained on phone and desktop", async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1141, height: 602 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("./", { waitUntil: "domcontentloaded" });
    await closeInitiallyOpenSettings(page);

    const action = page.getByRole("button", { name: "Add my nomination" });
    await expect(action).toBeVisible();
    const box = await action.boundingBox();
    expect(box, `primary action has no box at ${viewport.width}×${viewport.height}`).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
  }
});
