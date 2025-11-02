// Beer Detection Parameters and Functions

// Beer Detection Parameters
export const BEER_DETECT_CONFIG = {
    hMin: 210,    // Narrower blue hue lower bound
    hMax: 240,    // Narrower blue hue upper bound
    sMin: 60,     // Require even more saturation
    vMin: 60,     // Require even more brightness
    threshold: 0.001 // Lower threshold for small/far can
};

// RGB to HSV conversion for beer detection
export function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const v = max;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;
    let h = 0;
    if (d !== 0) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4;
        }
        h *= 60;
    }
    return [h, s * 100, v * 100];
}

// Beer detection logic
export function beerInFrame(video, ctx, canvas) {
    if (!video || video.readyState < 2) return false;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = img.data;
    const stride = 1; // More accurate sampling
    let beerPixels = 0, totalPixels = 0;
    for (let y = 0; y < canvas.height; y += stride) {
        for (let x = 0; x < canvas.width; x += stride) {
            const i = (y * canvas.width + x) * 4;
            const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2]);
            const hueInRange =
                (BEER_DETECT_CONFIG.hMin <= BEER_DETECT_CONFIG.hMax)
                    ? (h >= BEER_DETECT_CONFIG.hMin && h <= BEER_DETECT_CONFIG.hMax)
                    : (h >= BEER_DETECT_CONFIG.hMin || h <= BEER_DETECT_CONFIG.hMax);
            if (hueInRange && s >= BEER_DETECT_CONFIG.sMin && v >= BEER_DETECT_CONFIG.vMin) {
                beerPixels++;
            }
            totalPixels++;
        }
    }
    const beerRatio = beerPixels / totalPixels;
    return beerRatio >= BEER_DETECT_CONFIG.threshold;
}
