import { test, expect } from '@playwright/test';

test('Play Again functionality', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const joinerContext = await browser.newContext();

  await hostContext.grantPermissions(['clipboard-read', 'clipboard-write']);
  await joinerContext.grantPermissions(['clipboard-read', 'clipboard-write']);

  const hostPage = await hostContext.newPage();
  const joinerPage = await joinerContext.newPage();

  const filterLogs = (prefix) => msg => {
    const text = msg.text();
    if (text.startsWith('[') || text.includes('RESTART')) {
        console.log(`${prefix}: ${text}`);
    }
  };

  hostPage.on('console', filterLogs('HOST'));
  joinerPage.on('console', filterLogs('JOINER'));

  await hostPage.goto('/');

  // Enable debug flags on both pages
  const enableDebug = (page) => page.evaluate(() => {
    window.DEBUG_SIM = true;
    window.DEBUG_NET = true;
    window.DEBUG_HUD = true;
  });
  await enableDebug(hostPage);
  await enableDebug(joinerPage);

  // 1. Handshake
  await hostPage.click('#btn-host');
  await expect(hostPage.locator('#status-text')).toHaveText(/Online/, { timeout: 15000 });
  await hostPage.click('#btn-copy-link');
  
  const inviteLink = await hostPage.evaluate(async () => {
    return await navigator.clipboard.readText();
  });

  await joinerPage.goto(inviteLink);

  // 2. Wait for GameScene
  await hostPage.waitForFunction(() => 
    window.game && window.game.scene.isActive('GameScene') &&
    window.game.scene.getScene('GameScene').simulation
  , { timeout: 15000 });

  await joinerPage.waitForFunction(() => 
    window.game && window.game.scene.isActive('GameScene') &&
    window.game.scene.getScene('GameScene').simulation
  , { timeout: 15000 });

  const initialSeed = await hostPage.evaluate(() => window.game.scene.getScene('GameScene').simulation.seed);

  // 3. Force Game Over
  const forceGameOver = async (page) => {
    await page.evaluate(() => {
      const sim = window.game.scene.getScene('GameScene').simulation;
      sim.tanks[1].health = 0;
      sim.rules.state = 'GAME_OVER';
      sim.rules.winner = 0; // Host wins
    });
  };
  
  await forceGameOver(hostPage);
  await forceGameOver(joinerPage);

  // Wait for Game Over overlay on both
  await expect(hostPage.locator('text=PLAYER 1 WINS!')).toBeVisible({ timeout: 10000 });
  await expect(joinerPage.locator('text=PLAYER 1 WINS!')).toBeVisible({ timeout: 10000 });

  // 4. Click Play Again on Host
  await hostPage.click('#btn-play-again');
  await expect(hostPage.locator('#play-again-status')).toHaveText('WAITING FOR OPPONENT...');
  await expect(joinerPage.locator('#play-again-status')).toHaveText('OPPONENT WANTS TO PLAY AGAIN!');

  // 5. Click Play Again on Joiner
  await joinerPage.click('#btn-play-again');

  // 6. Verify Restart
  // The seeds should change and match each other
  await expect.poll(async () => {
    const hostSeed = await hostPage.evaluate(() => window.game.scene.getScene('GameScene').simulation.seed);
    const joinerSeed = await joinerPage.evaluate(() => window.game.scene.getScene('GameScene').simulation.seed);
    return hostSeed === joinerSeed && hostSeed !== initialSeed;
  }, { timeout: 15000 }).toBe(true);

  // Verify UI reset
  await expect(hostPage.locator('text=PLAYER 1 WINS!')).not.toBeVisible();
  await expect(joinerPage.locator('text=PLAYER 1 WINS!')).not.toBeVisible();
});
