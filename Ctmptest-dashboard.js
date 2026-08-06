const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.createContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  
  // Esperar a que se cargue el dashboard
  await page.waitForSelector('.dashboard-pac', { timeout: 10000 });
  
  // Esperar a que la tabla de cumplimiento sea visible
  await page.waitForSelector('.cumplimiento-tabla', { timeout: 5000 });
  
  // Tomar una captura de pantalla
  await page.screenshot({ path: 'C:\tmp\dashboard-antes.png', fullPage: true });
  
  console.log('Screenshot 1 guardada');
  
  // Encontrar la primera fila clicable en la tabla de cumplimiento
  const primeraFila = await page.locator('.cumplimiento-tabla tbody tr').first();
  
  if (primeraFila) {
    console.log('Encontrada la primera fila de la tabla');
    
    // Obtener el texto de la dirección
    const direccionText = await primeraFila.locator('.direccion-cell').textContent();
    console.log('Dirección: ' + direccionText);
    
    // Hacer clic en la fila
    await primeraFila.click();
    
    // Esperar un poco para que se actualice el dashboard
    await page.waitForTimeout(1000);
    
    // Tomar una captura de pantalla después del filtro
    await page.screenshot({ path: 'C:\tmp\dashboard-despues.png', fullPage: true });
    
    console.log('Screenshot 2 guardada - Filtrado aplicado');
  } else {
    console.log('No se encontraron filas en la tabla');
  }
  
  await browser.close();
})();
