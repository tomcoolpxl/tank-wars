import { test, expect } from '@playwright/test';

test('Full match setup, two shots, and determinism check', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const joinerContext = await browser.newContext();

  // Enable clipboard permissions
  await hostContext.grantPermissions(['clipboard-read', 'clipboard-write']);
  await joinerContext.grantPermissions(['clipboard-read', 'clipboard-write']);

  const hostPage = await hostContext.newPage();
  const joinerPage = await joinerContext.newPage();

  await hostPage.goto('/');
  await joinerPage.goto('/');

  // 1. Handshake
  await hostPage.click('#btn-host');
  await hostPage.waitForFunction(() => {
    const el = document.getElementById('offer-out');
    return el && el.value && el.value.length > 0;
  }, { timeout: 15000 });
  const offer = await hostPage.inputValue('#offer-out');

  await joinerPage.click('#btn-join');
  await joinerPage.fill('#offer-in', offer);
  await joinerPage.click('#btn-create-answer');
  await joinerPage.waitForFunction(() => {
    const el = document.getElementById('answer-out');
    return el && el.value && el.value.length > 0;
  }, { timeout: 15000 });
  const answer = await joinerPage.inputValue('#answer-out');

  await hostPage.fill('#answer-in', answer);
  await hostPage.click('#btn-connect-host');

  // 2. Wait for GameScene
  await expect(hostPage.locator('#status-text')).toHaveText(/CONNECTED/, { timeout: 15000 });
  await expect(joinerPage.locator('#status-text')).toHaveText(/CONNECTED/, { timeout: 15000 });
  
  // Give it a moment to transition scenes and start sim
  await hostPage.waitForFunction(() => 
    window.game && 
    window.game.scene.getScene('GameScene') && 
    window.game.scene.getScene('GameScene').simulation
  , { timeout: 10000 });

  // 3. Helper to get state
  const getSimState = (page) => page.evaluate(() => {
    const sim = window.game.scene.getScene('GameScene').simulation;
    return {
      tick: sim.tickCount,
      turn: sim.rules.turnNumber,
      state: sim.rules.state,
      activePlayer: sim.rules.activePlayerIndex,
      wind: sim.rules.wind,
      timer: sim.rules.turnTimer,
      hash: sim.getStateHash()
    };
  });

  // 4. Verify initial state matches
  const hostStateInit = await getSimState(hostPage);
  const joinerStateInit = await getSimState(joinerPage);
  
  expect(hostStateInit.hash).toBe(joinerStateInit.hash);
  expect(hostStateInit.activePlayer).toBe(0);

  // 5. Host (Player 1) fires
  // We'll use the space key. We might need to wait for turn timer or just fire immediately.
  await hostPage.keyboard.press('Space');

  // 6. Wait for flight to end and stabilization
  // We'll wait until state is TURN_AIM again (Turn 2)
  await expect.poll(async () => {
    const s = await getSimState(hostPage);
    return s.turn;
  }, { timeout: 15000 }).toBe(2); // turn number increments at the end of stabilization

  // 7. Verify Turn 2 (Player 2's turn)
  const hostStateTurn2 = await getSimState(hostPage);
  const joinerStateTurn2 = await getSimState(joinerPage);

  expect(hostStateTurn2.turn).toBe(2);
  expect(hostStateTurn2.activePlayer).toBe(1);
  expect(hostStateTurn2.hash).toBe(joinerStateTurn2.hash);

  // 8. Joiner (Player 2) fires
  await joinerPage.keyboard.press('ArrowUp'); // Adjust power slightly
  await joinerPage.keyboard.press('Space');

  // 9. Wait for Turn 3
  await expect.poll(async () => {
    const s = await getSimState(joinerPage);
    return s.turn;
  }, { timeout: 15000 }).toBe(3);

  const hostStateTurn3 = await getSimState(hostPage);
  const joinerStateTurn3 = await getSimState(joinerPage);

  expect(hostStateTurn3.turn).toBe(3);
  expect(hostStateTurn3.hash).toBe(joinerStateTurn3.hash);
});
