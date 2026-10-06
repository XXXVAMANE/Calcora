import { test, expect } from '@playwright/test';

test('reduced motion leaves every product accessible without loading the 3D bundle',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const requests:string[]=[];page.on('request',request=>requests.push(request.url()));
 await page.goto('/');await page.locator('#catalog').scrollIntoViewIfNeeded();
 await expect(page.locator('.product-card').first()).toHaveCSS('opacity','1');
 await expect(page.locator('.hero-glow')).toHaveCSS('animation-name','none');
 expect(requests.some(url=>url.includes('/device-scene.'))).toBe(false);
 await page.locator('[data-shop-filter="scientific"]').click();await expect(page.locator('[data-product-card]:visible')).toHaveCount(1);
 await page.locator('[data-product-card]:visible [data-add-product]').click();await expect(page.locator('[data-bag-count]')).toHaveText('1');
});
test('a browser without WebGL retains the illustration, filters and working bag',async({page})=>{
 await page.addInitScript(()=>{
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:unknown[]) { if(type==='webgl2')return null;return (original as Function).call(this,type,...args); } as typeof original;
 });
 await page.goto('/');await expect(page.locator('[data-immersive-scene]')).toHaveAttribute('data-webgl','fallback',{timeout:15000});
 await expect(page.locator('.hero-device>.device-svg')).toHaveCSS('opacity','1');
 await page.locator('[data-add-product="casio-fx-300es-plus"]').click();await page.locator('[data-open-bag]').click();await expect(page.locator('#bag-dialog')).toBeVisible();await expect(page.locator('[data-bag-total]')).toHaveText('$24.99');
});
test('the WebGL scene renders, supports keyboard rotation and recovers to an image after context loss',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');const scene=page.locator('[data-immersive-scene]');
 await expect(scene).toHaveAttribute('data-webgl','ready',{timeout:20000});
 await expect(scene.locator('canvas')).toHaveCSS('opacity','1');
 await scene.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Escape');await expect(scene).toBeFocused();
 const info=await scene.locator('canvas').evaluate((canvas:HTMLCanvasElement)=>{const gl=canvas.getContext('webgl2')!;return {width:canvas.width,height:canvas.height,error:gl.getError()};});
 expect(info.width).toBeGreaterThan(200);expect(info.height).toBeGreaterThan(200);expect(info.error).toBe(0);
 await scene.locator('canvas').evaluate((canvas:HTMLCanvasElement)=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await expect(scene).toHaveAttribute('data-webgl','fallback');await expect(scene.locator('.device-svg')).toHaveCSS('opacity','1');
 expect(errors).toEqual([]);
});
