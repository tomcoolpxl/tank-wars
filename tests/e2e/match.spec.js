import { test, expect } from '@playwright/test';

test('Full match setup and gameplay (PeerJS)', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const joinerContext = await browser.newContext();

  await hostContext.grantPermissions(['clipboard-read', 'clipboard-write']);
  await joinerContext.grantPermissions(['clipboard-read', 'clipboard-write']);

  const hostPage = await hostContext.newPage();
  const joinerPage = await joinerContext.newPage();

  await hostPage.goto('/');

  // 1. Handshake
  await hostPage.click('#btn-host');
  await expect(hostPage.locator('#status-text')).toHaveText(/Online/, { timeout: 15000 });
  await hostPage.click('#btn-copy-link');
  
  const inviteLink = await hostPage.evaluate(async () => {
    return await navigator.clipboard.readText();
  });

  await joinerPage.goto(inviteLink);

  // 2. Wait for GameScene
  await expect(hostPage.locator('#status-text')).toHaveText(/CONNECTED/i, { timeout: 20000 });
  
  await hostPage.waitForFunction(() => 
    window.game && window.game.scene.isActive('GameScene') &&
    window.game.scene.getScene('GameScene').simulation
  , { timeout: 15000 });

  await joinerPage.waitForFunction(() => 
    window.game && window.game.scene.isActive('GameScene') &&
    window.game.scene.getScene('GameScene').simulation
  , { timeout: 15000 });

  // Verify seeds match
  const hostSeed = await hostPage.evaluate(() => window.game.scene.getScene('GameScene').simulation.seed);
  const joinerSeed = await joinerPage.evaluate(() => window.game.scene.getScene('GameScene').simulation.seed);
  expect(hostSeed).toBe(joinerSeed);

  // 3. Helper to get state
  const getSimState = (page) => page.evaluate(() => {
    const sim = window.game.scene.getScene('GameScene').simulation;
    return {
      tick: sim.tickCount,
      turn: sim.rules.turnNumber,
      state: sim.rules.state,
      activePlayer: sim.rules.activePlayerIndex,
      hash: sim.getStateHash()
    };
  });

  // 4. Verify initial state matches
  const hostStateInit = await getSimState(hostPage);
  const joinerStateInit = await getSimState(joinerPage);
  expect(hostStateInit.hash).toBe(joinerStateInit.hash);

  // 5. Gameplay - Host fires
  await hostPage.keyboard.press('Space');

  // Wait for Turn 2
  await expect.poll(async () => {
    const s = await getSimState(hostPage);
    return s.turn;
  }, { timeout: 20000 }).toBe(2);

  const hostStateTurn2 = await getSimState(hostPage);
  const joinerStateTurn2 = await getSimState(joinerPage);
  expect(hostStateTurn2.hash).toBe(joinerStateTurn2.hash);
  expect(hostStateTurn2.activePlayer).toBe(1);
});
