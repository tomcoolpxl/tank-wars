import { test, expect } from '@playwright/test';

async function setupMatch(browser) {
  const hostContext = await browser.newContext();
  const joinerContext = await browser.newContext();
  await hostContext.grantPermissions(['clipboard-read', 'clipboard-write']);
  await joinerContext.grantPermissions(['clipboard-read', 'clipboard-write']);
  
  const hostPage = await hostContext.newPage();
  const joinerPage = await joinerContext.newPage();

  await hostPage.goto('/');
  await hostPage.click('#btn-host');
  await expect(hostPage.locator('#status-text')).toHaveText(/Online/, { timeout: 15000 });
  await hostPage.click('#btn-copy-link');
  
  const inviteLink = await hostPage.evaluate(async () => {
    return await navigator.clipboard.readText();
  });

  await joinerPage.goto(inviteLink);
  await expect(hostPage.locator('#status-text')).toHaveText(/CONNECTED/i, { timeout: 20000 });

  await hostPage.waitForFunction(() => window.game?.scene.isActive('GameScene'), { timeout: 30000 });
  await joinerPage.waitForFunction(() => window.game?.scene.isActive('GameScene'), { timeout: 30000 });
  
  await hostPage.waitForFunction(() => window.game?.scene.getScene('GameScene')?.simulation, { timeout: 20000 });
  await joinerPage.waitForFunction(() => window.game?.scene.getScene('GameScene')?.simulation, { timeout: 20000 });

  // Verify seeds match
  const hostSeed = await hostPage.evaluate(() => window.game.scene.getScene('GameScene').simulation.seed);
  const joinerSeed = await joinerPage.evaluate(() => window.game.scene.getScene('GameScene').simulation.seed);
  if (hostSeed !== joinerSeed) {
    throw new Error(`Seed mismatch! Host: ${hostSeed}, Joiner: ${joinerSeed}`);
  }
  
  return { hostPage, joinerPage, hostContext, joinerContext };
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
  let contexts = [];

  test.afterEach(async () => {
    for (const ctx of contexts) {
        await ctx.close();
    }
    contexts = [];
  });

  test('Auto-fire on timeout', async ({ browser }) => {
    const { hostPage, joinerPage, hostContext, joinerContext } = await setupMatch(browser);
    contexts = [hostContext, joinerContext];

    const fastForward = () => {
        window.game.scene.getScene('GameScene').simulation.rules.turnTimer = 10;
    };
    await hostPage.evaluate(fastForward);
    await joinerPage.evaluate(fastForward);

    await expect.poll(async () => {
        const s = await getSimState(hostPage);
        return s.turn;
    }, { timeout: 30000 }).toBe(2);

    await hostPage.waitForTimeout(500);

    const hostState = await getSimState(hostPage);
    const joinerState = await getSimState(joinerPage);
    expect(hostState.hash).toBe(joinerState.hash);
  });

  test('Out-of-bounds projectile (no explosion)', async ({ browser }) => {
    const { hostPage, joinerPage, hostContext, joinerContext } = await setupMatch(browser);
    contexts = [hostContext, joinerContext];

    await hostPage.evaluate(() => {
        const gameScene = window.game.scene.getScene('GameScene');
        const activeTank = gameScene.simulation.tanks[0];
        activeTank.aimAngle = 90;
        activeTank.aimPower = 100;
    });
    await hostPage.keyboard.press('Space');

    await expect.poll(async () => {
        const s = await getSimState(hostPage);
        return s.turn;
    }, { timeout: 20000 }).toBe(2);

    const state = await getSimState(hostPage);
    expect(state.tanks[0].health).toBe(100);
    expect(state.tanks[1].health).toBe(100);
  });

  test('Win condition (one tank destroyed)', async ({ browser }) => {
    const { hostPage, joinerPage, hostContext, joinerContext } = await setupMatch(browser);
    contexts = [hostContext, joinerContext];

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

    await expect.poll(async () => {
        const s = await getSimState(hostPage);
        return s.winner;
    }).toBe(0);

    const finalState = await getSimState(hostPage);
    expect(finalState.state).toBe('GAME_OVER');
  });

  test('Security: Abort on invalid shot parameters', async ({ browser }) => {
    const { hostPage, joinerPage, hostContext, joinerContext } = await setupMatch(browser);
    contexts = [hostContext, joinerContext];

    await joinerPage.evaluate(() => {
        const gameScene = window.game.scene.getScene('GameScene');
        gameScene.networkManager.send({
            type: 'SHOT',
            turnNumber: 1,
            angle: 45.5,
            power: 50
        });
    });

    await expect.poll(async () => {
        const s = await getSimState(hostPage);
        return s.state;
    }, { timeout: 10000 }).toBe('GAME_OVER');

    const state = await getSimState(hostPage);
    expect(state.winner).toBe(-2);
  });
});
