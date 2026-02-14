import { test, expect } from '@playwright/test';

test('Full match setup and gameplay (PeerJS)', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const joinerContext = await browser.newContext();

  await hostContext.grantPermissions(['clipboard-read', 'clipboard-write']);
  await joinerContext.grantPermissions(['clipboard-read', 'clipboard-write']);

  const hostPage = await hostContext.newPage();
  const joinerPage = await joinerContext.newPage();

  const filterLogs = (prefix) => msg => {
    const text = msg.text();
    if (text.startsWith('[')) {
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
    window.DEBUG_RULES = true;
    window.DEBUG_TANK = true;
    window.DEBUG_HUD = true;
    window.DEBUG_PROJ = true;
    window.DEBUG_TERRAIN = true;
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
  const connectedRegex = /CONNECTED|STARTING GAME/i;
  await expect(hostPage.locator('#status-text')).toHaveText(connectedRegex, { timeout: 20000 });
  
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
  await expect.poll(async () => {
    const hostState = await getSimState(hostPage);
    const joinerState = await getSimState(joinerPage);
    return hostState.hash === joinerState.hash;
  }, { timeout: 10000 }).toBe(true);

  const hostStateInit = await getSimState(hostPage);
  const joinerStateInit = await getSimState(joinerPage);
  expect(hostStateInit.activePlayer).toBe(0);

  // 5. Gameplay - Host fires
  await hostPage.click('canvas');
  await hostPage.keyboard.press('Space');

  // Wait for Turn 2 and state convergence
  await expect.poll(async () => {
    const s = await getSimState(hostPage);
    return s.turn;
  }, { timeout: 20000 }).toBe(2);

  // Use poll for hash to allow SYNC to arrive if there was a minor desync
  await expect.poll(async () => {
    const hostState = await getSimState(hostPage);
    const joinerState = await getSimState(joinerPage);
    return joinerState.hash === hostState.hash;
  }, { timeout: 10000 }).toBe(true);

  const hostStateTurn2 = await getSimState(hostPage);
  expect(hostStateTurn2.activePlayer).toBe(1);
});
