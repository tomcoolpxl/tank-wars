import { test, expect } from '@playwright/test';

test('Invite link handshake (PeerJS)', async ({ browser }) => {
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
  
  // Wait for "Online" status
  await expect(hostPage.locator('#status-text')).toHaveText(/Online/, { timeout: 15000 });
  
  await hostPage.click('#btn-copy-link');
  
  // Get link from clipboard
  const inviteLink = await hostPage.evaluate(async () => {
    return await navigator.clipboard.readText();
  });
  
  expect(inviteLink).toContain('#join=');

  // 2. Joiner opens link
  await joinerPage.goto(inviteLink);
  
  // Verify automated connection
  await expect(joinerPage.locator('#status-text')).toHaveText(/CONNECTED/i, { timeout: 20000 });
  await expect(hostPage.locator('#status-text')).toHaveText(/CONNECTED/i, { timeout: 20000 });

  // 3. Verify scene transition
  await hostPage.waitForFunction(() => 
    window.game && 
    window.game.scene.isActive('GameScene')
  , { timeout: 15000 });

  await joinerPage.waitForFunction(() => 
    window.game && 
    window.game.scene.isActive('GameScene')
  , { timeout: 15000 });
});
