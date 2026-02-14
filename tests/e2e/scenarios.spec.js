import { test, expect } from '@playwright/test';

async function setupMatch(browser) {
  const hostContext = await browser.newContext();
  const joinerContext = await browser.newContext();
  await hostContext.grantPermissions(['clipboard-read', 'clipboard-write']);
  await joinerContext.grantPermissions(['clipboard-read', 'clipboard-write']);
  const hostPage = await hostContext.newPage();
  const joinerPage = await joinerContext.newPage();

  hostPage.on('console', msg => console.log('HOST:', msg.text()));
  joinerPage.on('console', msg => console.log('JOINER:', msg.text()));

  await hostPage.goto('/');
  await joinerPage.goto('/');

  await hostPage.click('#btn-host');
  await hostPage.waitForFunction(() => document.getElementById('offer-out').value.length > 0, { timeout: 20000 });
  const offer = await hostPage.inputValue('#offer-out');

  await joinerPage.click('#btn-join');
  await joinerPage.fill('#offer-in', offer);
  await joinerPage.click('#btn-create-answer');
  await joinerPage.waitForFunction(() => document.getElementById('answer-out').value.length > 0, { timeout: 20000 });
  const answer = await joinerPage.inputValue('#answer-out');

  await hostPage.fill('#answer-in', answer);
  await hostPage.click('#btn-connect-host');

  // Wait for scene transitions instead of status text which might be transient
  await hostPage.waitForFunction(() => window.game?.scene.isActive('GameScene'), { timeout: 30000 });
  await joinerPage.waitForFunction(() => window.game?.scene.isActive('GameScene'), { timeout: 30000 });

  await hostPage.waitForFunction(() => window.game?.scene.getScene('GameScene')?.simulation, { timeout: 20000 });
  return { hostPage, joinerPage };
}

const getSimState = (page) => page.evaluate(() => {
  const sim = window.game.scene.getScene('GameScene').simulation;
  return {
    tick: sim.tickCount,
    turn: sim.rules.turnNumber,
    state: sim.rules.state,
    activePlayer: sim.rules.activePlayerIndex,
    hash: sim.getStateHash(),
    winner: sim.rules.winner,
    tanks: sim.tanks.map(t => ({ alive: t.alive, health: t.health }))
  };
});

test.describe('Advanced Game Scenarios', () => {
  let hostContext, joinerContext;

  test.afterEach(async () => {
    if (hostContext) await hostContext.close();
    if (joinerContext) await joinerContext.close();
  });

  async function setupMatch(browser) {
    hostContext = await browser.newContext();
    joinerContext = await browser.newContext();
    await hostContext.grantPermissions(['clipboard-read', 'clipboard-write']);
    await joinerContext.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    const hostPage = await hostContext.newPage();
    const joinerPage = await joinerContext.newPage();
    
    // hostPage.on('console', msg => console.log('HOST:', msg.text()));
    // joinerPage.on('console', msg => console.log('JOINER:', msg.text()));

    await hostPage.goto('/');
    await joinerPage.goto('/');

    await hostPage.click('#btn-host');
    await hostPage.waitForFunction(() => document.getElementById('offer-out').value.length > 0, { timeout: 20000 });
    const offer = await hostPage.inputValue('#offer-out');

    await joinerPage.click('#btn-join');
    await joinerPage.fill('#offer-in', offer);
    await joinerPage.click('#btn-create-answer');
    await joinerPage.waitForFunction(() => document.getElementById('answer-out').value.length > 0, { timeout: 20000 });
    const answer = await joinerPage.inputValue('#answer-out');

    await hostPage.fill('#answer-in', answer);
    await hostPage.click('#btn-connect-host');

    await hostPage.waitForFunction(() => window.game?.scene.isActive('GameScene'), { timeout: 30000 });
    await joinerPage.waitForFunction(() => window.game?.scene.isActive('GameScene'), { timeout: 30000 });

    await hostPage.waitForFunction(() => window.game?.scene.getScene('GameScene')?.simulation, { timeout: 20000 });
    return { hostPage, joinerPage };
  }

  test('Auto-fire on timeout', async ({ browser }) => {
    const { hostPage, joinerPage } = await setupMatch(browser);

    // Fast forward turn timer on BOTH pages to keep them in sync
    const fastForward = () => {
        window.game.scene.getScene('GameScene').simulation.rules.turnTimer = 10;
    };
    await hostPage.evaluate(fastForward);
    await joinerPage.evaluate(fastForward);

    // Wait for auto-fire (turn increments)
    await expect.poll(async () => {
        const s = await getSimState(hostPage);
        return s.turn;
    }, { timeout: 30000 }).toBe(2);

    // Give it a few frames to settle (projectile might still be flying or exploding)
    await hostPage.waitForTimeout(500);

    const hostState = await getSimState(hostPage);
    const joinerState = await getSimState(joinerPage);
    expect(hostState.hash).toBe(joinerState.hash);
  });

  test('Out-of-bounds projectile (no explosion)', async ({ browser }) => {
    const { hostPage, joinerPage } = await setupMatch(browser);

    // Host fires at 135 degrees (up-left) with high power
    // Tank 0 is at x >= 40. Firing up-left should go out of bounds.
    await hostPage.evaluate(() => {
        const gameScene = window.game.scene.getScene('GameScene');
        const activeTank = gameScene.simulation.tanks[0];
        activeTank.aimAngle = 90;
        activeTank.aimPower = 100;
    });
    await hostPage.keyboard.press('Space');

    // Wait for turn 2
    await expect.poll(async () => {
        const s = await getSimState(hostPage);
        return s.turn;
    }, { timeout: 20000 }).toBe(2);

    // Verify no damage was taken (out of bounds should not explode)
    const state = await getSimState(hostPage);
    console.log('Out-of-bounds Test State:', JSON.stringify(state, null, 2));
    expect(state.tanks[0].health).toBe(100);
    expect(state.tanks[1].health).toBe(100);
  });

  test('Win condition (one tank destroyed)', async ({ browser }) => {
    const { hostPage, joinerPage } = await setupMatch(browser);

    // Force one tank to 0 health on both peers to simulate a kill
    await hostPage.evaluate(() => {
        const sim = window.game.scene.getScene('GameScene').simulation;
        sim.tanks[1].health = 0;
        sim.tanks[1].alive = false;
        sim.checkWinConditions();
    });
    await joinerPage.evaluate(() => {
        const sim = window.game.scene.getScene('GameScene').simulation;
        sim.tanks[1].health = 0;
        sim.tanks[1].alive = false;
        sim.checkWinConditions();
    });

    // Verify simulation state reports winner
    await expect.poll(async () => {
        const s = await getSimState(hostPage);
        return s.winner;
    }).toBe(0);

    await expect.poll(async () => {
        const s = await getSimState(joinerPage);
        return s.winner;
    }).toBe(0);

    // Verify Game Over state
    const finalState = await getSimState(hostPage);
    expect(finalState.state).toBe('GAME_OVER');
  });

  test('Security: Abort on invalid shot parameters', async ({ browser }) => {
    const { hostPage, joinerPage } = await setupMatch(browser);

    // Joiner (Player 1) sends an invalid shot to Host (Player 0's turn)
    await joinerPage.evaluate(() => {
        const gameScene = window.game.scene.getScene('GameScene');
        gameScene.networkManager.send({
            type: 'SHOT',
            turnNumber: 1,
            angle: 45.5, // Non-integer
            power: 50
        });
    });

    // Host should abort
    await expect.poll(async () => {
        const s = await getSimState(hostPage);
        return s.state;
    }, { timeout: 10000 }).toBe('GAME_OVER');

    const state = await getSimState(hostPage);
    expect(state.winner).toBe(-2);
  });
});
