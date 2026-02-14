import { test, expect } from '@playwright/test';

test('Invite link handshake', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const joinerContext = await browser.newContext();

  // Enable clipboard permissions
  await hostContext.grantPermissions(['clipboard-read', 'clipboard-write']);
  await joinerContext.grantPermissions(['clipboard-read', 'clipboard-write']);

  const hostPage = await hostContext.newPage();
  const joinerPage = await joinerContext.newPage();

  await hostPage.goto('/');

  // 1. Host generates link
  await hostPage.click('#btn-host');
  await hostPage.waitForFunction(() => {
    const el = document.getElementById('offer-out');
    return el && el.value && el.value.length > 0;
  }, { timeout: 15000 });
  
  await hostPage.click('#btn-copy-link');
  
  // Get link from clipboard
  const inviteLink = await hostPage.evaluate(async () => {
    return await navigator.clipboard.readText();
  });
  
  expect(inviteLink).toContain('#offer=');

  // 2. Joiner opens link
  await joinerPage.goto(inviteLink);
  
  // Check if offer is populated
  await expect(joinerPage.locator('#offer-in')).not.toHaveValue('', { timeout: 10000 });
  await expect(joinerPage.locator('#status-text')).toHaveText(/Offer loaded from link/);

  // 2b. Test hashchange while page is open
  await joinerPage.goto('/');
  await expect(joinerPage.locator('#offer-in')).toHaveValue('');
  await joinerPage.evaluate((link) => {
    window.location.hash = link.split('#')[1];
  }, inviteLink);
  
  await expect(joinerPage.locator('#offer-in')).not.toHaveValue('', { timeout: 5000 });
  const populatedOffer = await joinerPage.inputValue('#offer-in');
  expect(populatedOffer).toContain('"type":"offer"');
  await joinerPage.click('#btn-create-answer');
  await joinerPage.waitForFunction(() => {
    const el = document.getElementById('answer-out');
    return el && el.value && el.value.length > 0;
  }, { timeout: 15000 });
  const answer = await joinerPage.inputValue('#answer-out');

  await hostPage.fill('#answer-in', answer);
  await hostPage.click('#btn-connect-host');

  // 4. Verify connection
  // Host stays on LobbyScene for 500ms after connection
  await expect(hostPage.locator('#status-text')).toHaveText(/CONNECTED/, { timeout: 15000 });
  
  // Joiner might transition to GameScene immediately, so we check for either status text or GameScene presence
  await hostPage.waitForFunction(() => 
    window.game && 
    window.game.scene.getScene('GameScene') && 
    window.game.scene.getScene('GameScene').simulation
  , { timeout: 15000 });

  await joinerPage.waitForFunction(() => 
    window.game && 
    window.game.scene.getScene('GameScene') && 
    window.game.scene.getScene('GameScene').simulation
  , { timeout: 15000 });
});
