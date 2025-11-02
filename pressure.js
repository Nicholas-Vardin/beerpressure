// Beer Points logic
let beerPoints = 0;
const beerPointsEl = document.getElementById('beerPoints');
/**
 * Update beer points by a (possibly fractional) value and update the UI.
 * We keep an internal float value but display rounded integer to the user.
 */
function updateBeerPoints(val) {
	beerPoints += val;
	if (beerPoints < 0) beerPoints = 0;
	if (beerPointsEl) beerPointsEl.textContent = Math.round(beerPoints);
}

// Audio files for beer detection
const beerAudioFiles = [
	'assets/Chug.mp3',
	'assets/Be a good boy.mp3',
	'assets/Chug From Roni.mp3'
];
const noBeerAudioFiles = [
	'assets/You Want It.mp3',
	'assets/Wheres Your Beer.mp3',

];

// --- Global Audio Control System ---
let currentAudio = null;        // Active audio element (null when no sound playing)
let lastAudioTime = 0;         // Timestamp of last audio start
const GLOBAL_AUDIO_COOLDOWN = 3500; // ms between ANY audio plays
let lastBeerAudioIndex = -1;   // Track last beer sound to avoid repeats
let audioUserGestureReady = false;

// --- Beer Detection State ---
let lastDetectionState = null;  // Track last beer detection state to avoid duplicate triggers
const DETECTION_COOLDOWN = 1000; // ms to wait before allowing state change
let lastStateChangeTime = 0;    // When we last changed detection state

/**
 * Check if we can play a new sound right now
 * @returns {boolean} true if audio can be played
 */
function canPlaySound() {
    // Check user interaction requirement
    if (!audioUserGestureReady) {
        console.warn('Audio not ready: waiting for user gesture');
        return false;
    }

    // Check global cooldown
    const now = Date.now();
    if (now - lastAudioTime < GLOBAL_AUDIO_COOLDOWN) {
        console.log('Audio blocked by global cooldown');
        return false;
    }

    // Stop any current audio
    if (currentAudio && !currentAudio.paused) {
        console.log('Stopping current audio');
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    return true;
}

/**
 * Play a random beer detection sound
 * Ensures only one sound plays at a time using global audio lock
 */
    

/**
 * Play a beer audio track. Options:
 *  - force: boolean -> skip canPlaySound checks (used when chaining)
 */
function playBeerAudio(options = {}) {
	const { force = false } = options;
	if (!force && !canPlaySound()) return;

	// Select next random beer sound (avoiding repeats)
	let idx;
	do {
		idx = Math.floor(Math.random() * beerAudioFiles.length);
	} while (beerAudioFiles.length > 1 && idx === lastBeerAudioIndex);
	lastBeerAudioIndex = idx;
	const file = beerAudioFiles[idx];
	const audio = new Audio(file);
	audio.volume = 0.8;

	// Set up handlers BEFORE starting playback
	audio.addEventListener('ended', () => {
		console.log('Beer audio finished:', file);
		currentAudio = null;
		// If beer is still detected, chain another beer audio immediately
		// (force=true to bypass canPlaySound which is intended for initial plays)
		if (lastDetectionState === true && audioUserGestureReady && !stopAll) {
			// small timeout to avoid edge race conditions
			setTimeout(() => playBeerAudio({ force: true }), 50);
		}
	});

	audio.addEventListener('error', (e) => {
		console.error('Beer audio error:', e);
		currentAudio = null;
	});

	// Lock the audio system BEFORE attempting playback
	currentAudio = audio;
	console.log('Starting beer audio:', file);

	audio.play()
		.then(() => {
			lastAudioTime = Date.now();
		})
		.catch(e => {
			console.error('Beer audio play error:', e);
			currentAudio = null;
		});
}
// No beer audio: use "Don't Be a Bum.mp3" only
/**
 * Play a random no-beer warning sound
 * Ensures only one sound plays at a time using global audio lock
 */
    

/**
 * Play a no-beer audio track. Options:
 *  - force: boolean -> skip canPlaySound checks (used when chaining)
 */
function playNoBeerAudio(options = {}) {
	const { force = false } = options;
	if (!force && !canPlaySound()) return;

	// Select random no-beer sound (avoid immediate repetition not needed here)
	const file = noBeerAudioFiles[Math.floor(Math.random() * noBeerAudioFiles.length)];
	const audio = new Audio(file);
	audio.volume = 0.8;

	// Set up handlers BEFORE starting playback
	audio.addEventListener('ended', () => {
		console.log('No-beer audio finished:', file);
		currentAudio = null;
		// If beer is still NOT detected, chain another no-beer audio immediately
		if (lastDetectionState === false && audioUserGestureReady && !stopAll) {
			setTimeout(() => playNoBeerAudio({ force: true }), 50);
		}
	});

	audio.addEventListener('error', (e) => {
		console.error('No-beer audio error:', e);
		currentAudio = null;
	});

	// Lock the audio system BEFORE attempting playback
	currentAudio = audio;
	console.log('Starting no-beer audio:', file);

	audio.play()
		.then(() => {
			lastAudioTime = Date.now();
		})
		.catch(e => {
			console.error('No-beer audio play error:', e);
			currentAudio = null;
		});
}

import { BEER_DETECT_CONFIG, rgbToHsv, beerInFrame } from './beerDetector.js';

// DOM Elements
const video = document.getElementById('webcam');
const startButton = document.getElementById('startCamera');
const beerContainer = document.getElementById('beerContainer');
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
let stream = null;
let speaking = false;


// Mascot popup and STOP button
const emergencyStopBtn = document.getElementById('emergencyStop');
const mascotPopup = document.getElementById('mascotPopup');
let lastCheerTime = 0;
let lastBeerState = null;
let cheerTimeout = null;
let stopAll = false;

const politeNoBeerMessages = [
	"What are you doing? Get a beer now!",
	"No beer detected! Go get one and start drinking!",
	"Stop slacking, grab a beer and drink!",
	"Unacceptable! You need a beer in your hand immediately!",
	"Why aren't you drinking? Get a beer right now!"
];
const politeBeerMessages = [
	"Enjoy your beer!",
	"Cheers!",
	"That looks tasty!",
	"Savor your drink!",
	"Perfect choice!"
];
const mascotImages = [
	'assets/mascot1.png'
];

function showMascotPopup() {
	if (!mascotPopup) return;
	const img = document.createElement('img');
	img.src = mascotImages[Math.floor(Math.random() * mascotImages.length)];
	img.style.width = '180px';
	img.style.height = '180px';
	img.style.display = 'block';
	img.style.margin = '0 auto';
	img.style.animation = 'mascot-pop 2s cubic-bezier(.4,2,.6,1)';
	mascotPopup.innerHTML = '';
	mascotPopup.appendChild(img);
	mascotPopup.style.display = 'block';
	// Position mascot on the right side, vertically centered
	mascotPopup.style.position = 'fixed';
	mascotPopup.style.left = 'auto';
	mascotPopup.style.right = '40px';
	mascotPopup.style.top = '50%';
	mascotPopup.style.transform = 'translateY(-50%)';
	mascotPopup.style.zIndex = '1000';
	setTimeout(() => {
		mascotPopup.style.display = 'none';
		mascotPopup.innerHTML = '';
	}, 2000);
}

/**
 * Speak a message using Web Speech API, but only if no audio is playing
 */
function speakPolite(msg) {
    if (!window.speechSynthesis) return;
    
    // Don't speak if audio is playing
    if (currentAudio && !currentAudio.paused) {
        console.log('Speech blocked by active audio');
        return;
    }

    const utter = new window.SpeechSynthesisUtterance(msg);
    utter.volume = 0.7;
    utter.rate = 1.05;
    utter.pitch = 1.1;
    utter.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
}

function cheer(state) {
	if (stopAll) return;
	const now = Date.now();
	if (now - lastCheerTime < 15000 && state === lastBeerState) return;
	lastCheerTime = now;
	lastBeerState = state;
	let msg;
	if (state === 'beer') {
		msg = politeBeerMessages[Math.floor(Math.random() * politeBeerMessages.length)];
	} else {
		msg = politeNoBeerMessages[Math.floor(Math.random() * politeNoBeerMessages.length)];
	}
	speakPolite(msg);
	showMascotPopup();
}

function stopCheerAll() {
	stopAll = true;
	window.speechSynthesis && window.speechSynthesis.cancel();
	if (cheerTimeout) clearTimeout(cheerTimeout);
	mascotPopup && (mascotPopup.style.display = 'none');
	mascotPopup && (mascotPopup.innerHTML = '');
	if (stream) {
		stream.getTracks().forEach(t => t.stop());
		stream = null;
	}
	if (video) {
		video.srcObject = null;
	}
	startButton && (startButton.style.display = 'block');
}

if (emergencyStopBtn) {
	emergencyStopBtn.addEventListener('click', stopCheerAll);
}

// Constants for beer animations
const NUMBER_OF_BEERS = 8; // Increased for better distribution
const ANIMATION_DURATION_MIN = 3;
const ANIMATION_DURATION_MAX = 6;

// Define zones for beer placement
const ZONES = [
	{ x: [0, 15], y: [0, 15] },     // Top-left corner
	{ x: [85, 100], y: [0, 15] },   // Top-right corner
	{ x: [0, 15], y: [85, 100] },   // Bottom-left corner
	{ x: [85, 100], y: [85, 100] }, // Bottom-right corner
	{ x: [0, 10], y: [30, 70] },    // Left edge
	{ x: [90, 100], y: [30, 70] },  // Right edge
];

// Webcam access and initialization
async function startWebcam() {
	try {
		// Always close any existing camera stream first
		if (stream) {
			stream.getTracks().forEach(t => t.stop());
			stream = null;
		}
		video.srcObject = null;

		stream = await navigator.mediaDevices.getUserMedia({ 
			video: {
				width: { ideal: 640 },
				height: { ideal: 480 }
			}
		});
		video.srcObject = stream;
		startButton.style.display = 'none';
		canvas.width = 320;
		canvas.height = 180;
		createAnimatedBeers();
		startBeerDetection();
	} catch (error) {
		console.error('Error accessing webcam:', error);
		alert('Unable to access webcam. Please make sure you have granted permission.');
	}
}

startButton.addEventListener('click', () => {
	audioUserGestureReady = true;
	startWebcam();
});

function createAnimatedBeers() {
	ZONES.forEach((zone, index) => {
		createBeerElement(zone);
		if (index === 4 || index === 5) {
			createBeerElement(zone);
		}
	});
}

function createBeerElement(zone) {
	const beer = document.createElement('img');
	beer.src = 'assets/mascot1.png';
	beer.className = 'beer-mug';
	const startX = zone.x[0] + Math.random() * (zone.x[1] - zone.x[0]);
	const startY = zone.y[0] + Math.random() * (zone.y[1] - zone.y[0]);
	beer.style.left = `${startX}%`;
	beer.style.top = `${startY}%`;
	const duration = ANIMATION_DURATION_MIN + Math.random() * (ANIMATION_DURATION_MAX - ANIMATION_DURATION_MIN);
	const delay = Math.random() * 2;
	beer.style.animation = `
		float ${duration}s ease-in-out infinite,
		wobble ${duration/2}s ease-in-out infinite
	`;
	beer.style.animationDelay = `${delay}s`;
	beerContainer.appendChild(beer);
}

let __lastFrameTimestamp = null;
// Points per second to add when beer is detected, and subtract when missing
const POINTS_PER_SECOND_WHEN_DETECTED = 1.0; // 1 point per second
const POINTS_PER_SECOND_WHEN_MISSING = 1.0;  // 1 point per second (subtracted)

function processFrame(timestamp) {
	if (stopAll) return;

	if (!__lastFrameTimestamp) __lastFrameTimestamp = timestamp || performance.now();
	const nowTs = timestamp || performance.now();
	const dt = Math.min(0.1, (nowTs - __lastFrameTimestamp) / 1000); // cap dt to avoid big jumps
	__lastFrameTimestamp = nowTs;

	if (!video.paused && video.readyState >= 2) {
		const isBeerDetected = beerInFrame(video, ctx, canvas);
		const now = Date.now();

		// Continuous scoring: add or subtract points every frame based on detection
		if (isBeerDetected) {
			updateBeerPoints(POINTS_PER_SECOND_WHEN_DETECTED * dt);
		} else {
			updateBeerPoints(-POINTS_PER_SECOND_WHEN_MISSING * dt);
		}

		// Keep audio/popups tied to state changes only (with cooldown)
		if (now - lastStateChangeTime >= DETECTION_COOLDOWN) {
			if (isBeerDetected !== lastDetectionState) {
				lastDetectionState = isBeerDetected;
				lastStateChangeTime = now;

				if (isBeerDetected) {
					showMascotPopup();
					playBeerAudio();
					// cheer('beer');
				} else {
					playNoBeerAudio();
					// cheer('nobeer'); // Automated voice removed for no beer
				}
			}
		}
	}

	requestAnimationFrame(processFrame);
}

function startBeerDetection() {
	requestAnimationFrame(processFrame);
}

// Mascot popup animation
const style = document.createElement('style');
style.innerHTML = `
@keyframes mascot-pop {
	0% { opacity: 0; transform: scale(0.5); }
	40% { opacity: 1; transform: scale(1.1); }
	70% { opacity: 1; transform: scale(1); }
	100% { opacity: 0; transform: scale(0.7); }
}`;
document.head.appendChild(style);

// --- Make the beer counter bounce around the screen (fixed position) ---
(function startBeerCounterBounce() {
	const el = document.getElementById('beerPointsBox');
	if (!el) return;

	// Initialize positioning from current layout (convert right -> left if needed)
	const rect = el.getBoundingClientRect();
	el.style.position = 'fixed';
	el.style.left = rect.left + 'px';
	el.style.top = rect.top + 'px';
	el.style.right = 'auto';
	el.style.margin = '0';
	el.style.zIndex = el.style.zIndex || 2000;

	let x = rect.left;
	let y = rect.top;

	// px per second initial velocity (randomized)
	let vx = (Math.random() * 200 + 80) * (Math.random() < 0.5 ? -1 : 1);
	let vy = (Math.random() * 160 + 60) * (Math.random() < 0.5 ? -1 : 1);

	let lastTs = performance.now();

	function step(ts) {
		const dt = Math.min(0.05, (ts - lastTs) / 1000); // cap to avoid jumps
		lastTs = ts;

		x += vx * dt;
		y += vy * dt;

		const w = el.offsetWidth;
		const h = el.offsetHeight;
		const maxX = Math.max(0, window.innerWidth - w);
		const maxY = Math.max(0, window.innerHeight - h);

		if (x <= 0) {
			x = 0;
			vx = Math.abs(vx);
		} else if (x >= maxX) {
			x = maxX;
			vx = -Math.abs(vx);
		}

		if (y <= 0) {
			y = 0;
			vy = Math.abs(vy);
		} else if (y >= maxY) {
			y = maxY;
			vy = -Math.abs(vy);
		}

		el.style.left = Math.round(x) + 'px';
		el.style.top = Math.round(y) + 'px';

		requestAnimationFrame(step);
	}

	// Resize handler to keep the counter inside the viewport
	window.addEventListener('resize', () => {
		x = Math.min(x, Math.max(0, window.innerWidth - el.offsetWidth));
		y = Math.min(y, Math.max(0, window.innerHeight - el.offsetHeight));
	});

	// Pause movement while user hovers over the counter
	el.addEventListener('mouseenter', () => {
		el.dataset._vx = vx;
		el.dataset._vy = vy;
		vx = 0; vy = 0;
	});
	el.addEventListener('mouseleave', () => {
		vx = parseFloat(el.dataset._vx) || 140;
		vy = parseFloat(el.dataset._vy) || 110;
		delete el.dataset._vx; delete el.dataset._vy;
	});

	requestAnimationFrame(step);
})();
