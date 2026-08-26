export default async function bookClubScreenshot(page) {
  await page.getByLabel("Your name").fill("Mina");
  await page.getByLabel("Book title").fill("Piranesi");
  await page.getByLabel("Author").fill("Susanna Clarke");
  await page.getByRole("button", { name: "Add my nomination" }).click();
  await page.getByRole("button", { name: "Reveal the room’s pick" }).click();
  await page.waitForTimeout(400);
}
