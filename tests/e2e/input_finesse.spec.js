import { test, expect } from '@playwright/test';

test.describe('Input Finesse - Fine-tuning buttons', () => {
    test('should modify angle and power via HUD buttons', async ({ page }) => {
        page.on('console', msg => {
            const text = msg.text();
            if (text.startsWith('[SIM]') || text.startsWith('[NET]') || text.startsWith('[TEST]') || 
                text.startsWith('[RULES]') || text.startsWith('[TANK') || text.startsWith('[HUD]')) {
                console.log('PAGE:', text);
            }
        });

        await page.goto('http://localhost:5173');

        // Enable ALL debug flags
        await page.evaluate(() => {
            window.DEBUG_SIM = true;
            window.DEBUG_NET = true;
            window.DEBUG_RULES = true;
            window.DEBUG_TANK = true;
            window.DEBUG_HUD = true;
            window.DEBUG_PROJ = true;
        });

        // Host a game
        await page.click('#btn-host');
        await expect(page.locator('#room-id-display')).not.toHaveText('--------', { timeout: 10000 });
        const roomId = await page.textContent('#room-id-display');

        // Open second player
        const browser = page.context().browser();
        const page2 = await browser.newPage();
        await page2.goto(`http://localhost:5173#join=${roomId}`);
        
        await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
        await expect(page2.locator('canvas')).toBeVisible({ timeout: 10000 });

        // Wait for GameScene to be ready and DISABLE AUTOFIRE
        await expect(async () => {
            const ready = await page.evaluate(() => {
                const gs = window.game?.scene?.keys?.GameScene;
                if (gs?.simulation) {
                    gs.simulation.autoFireEnabled = false;
                    console.log('[TEST] Simulation found, autoFireEnabled set to false');
                    return true;
                }
                return false;
            });
            expect(ready).toBe(true);
        }).toPass({ timeout: 10000 });

        const getSimState = () => page.evaluate(() => {
            const sim = window.game.scene.keys.GameScene.simulation;
            return {
                angle: sim.tanks[0].aimAngle,
                power: sim.tanks[0].aimPower,
                activePlayer: sim.rules.activePlayerIndex,
                state: sim.rules.state,
                timer: sim.rules.turnTimer
            };
        });

        // Wait for it to be Player 1's turn and in AIM state
        await expect(async () => {
            const s = await getSimState();
            expect(s.activePlayer).toBe(0);
            expect(s.state).toBe('TURN_AIM');
        }).toPass({ timeout: 15000 });

        const state = await getSimState();
        const initialAngle = state.angle;
        const initialPower = state.power;

        const angleUp = page.getByTestId('angle-up');
        const angleDown = page.getByTestId('angle-down');
        const powerUp = page.getByTestId('power-up');
        const powerDown = page.getByTestId('power-down');

        await expect(angleUp).toBeVisible();

        // Use mousedown/mouseup with a small delay instead of click() to ensure simulation sees it
        const clickFinesse = async (locator) => {
            await locator.dispatchEvent('mousedown');
            await page.waitForTimeout(100); // Wait ~6 ticks
            await locator.dispatchEvent('mouseup');
        };

        // Test single clicks
        await clickFinesse(angleUp);
        await expect(async () => {
            const s = await getSimState();
            expect(s.angle).toBe(initialAngle + 1);
        }).toPass();

        await clickFinesse(angleDown);
        await expect(async () => {
            const s = await getSimState();
            expect(s.angle).toBe(initialAngle);
        }).toPass();

        await clickFinesse(powerUp);
        await expect(async () => {
            const s = await getSimState();
            expect(s.power).toBe(initialPower + 1);
        }).toPass();

        await clickFinesse(powerDown);
        await expect(async () => {
            const s = await getSimState();
            expect(s.power).toBe(initialPower);
        }).toPass();

        // Test long press (repetition)
        await angleUp.dispatchEvent('mousedown');
        await page.waitForTimeout(1000);
        await angleUp.dispatchEvent('mouseup');

        await expect(async () => {
            const s = await getSimState();
            expect(s.angle).toBeGreaterThan(initialAngle + 5);
        }).toPass();

        await page2.close();
    });
});
