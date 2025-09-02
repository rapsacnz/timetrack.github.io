// Default settings
const DEFAULT_SETTINGS = {
    dayStart: "09:00:00",
    numGames: 5,
    playTimes: [1, 1, 10, 10],
    breakTimes: [1, 2, 2],
    downTime: 2,
    warnBellTime: 0.5
};

const SECONDS_IN_MINUTE = 60;
const TIMER_MILLISECONDS = 200;

// State management
let settings = { ...DEFAULT_SETTINGS };
let timelineActive = false;
let paused = false;
let currentSegment = { type: "Not Started", timeLeft: 0 };
let gameProgress = { current: 1, total: settings.numGames };
let warnings = [];
let adjustments = [];
let resetCountdown = 0;
let timerInterval = null;
let resetInterval = null;
let timeline = [];
let timeLineIndex = 0;

// DOM elements
const startPauseBtn = document.getElementById('startPauseBtn');
const pauseStatus = document.getElementById('pauseStatus');
const timerSegment = document.getElementById('timerSegment');
const timerTime = document.getElementById('timerTime');
const warningIcons = document.getElementById('warningIcons');

const addTenSecondsBtn = document.getElementById('addTenSecondsBtn');
const subtractTenSecondsBtn = document.getElementById('subtractTenSecondsBtn');
const addThirtySecondsBtn = document.getElementById('addThirtySecondsBtn');
const subtractThirtySecondsBtn = document.getElementById('subtractThirtySecondsBtn');

const currentGameEl = document.getElementById('currentGame');
const totalGamesEl = document.getElementById('totalGames');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
const discardChangesBtn = document.getElementById('discardChangesBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const resetTimelineBtn = document.getElementById('resetTimelineBtn');
const toastNotification = document.getElementById('toastNotification');
const toastMessage = document.getElementById('toastMessage');
const undoBtn = document.getElementById('undoBtn');
const closeToastBtn = document.getElementById('closeToastBtn');
const resetCountdownEl = document.getElementById('resetCountdown');
const countdownNumber = document.getElementById('countdownNumber');
const cancelResetBtn = document.getElementById('cancelResetBtn');

// Settings form elements
const numGamesInput = document.getElementById('numGames');
const quartersPerGameInput = document.getElementById('quartersPerGame');
const dayStartTimeInput = document.getElementById('dayStartTime');
const quarterLengthInput = document.getElementById('quarterLength');
const breakTimesInput = document.getElementById('breakTimes');
const downtimeInput = document.getElementById('downtime');
const warningBellInput = document.getElementById('warningBell');
const bellButton = document.getElementById('bellButton');

const warningSection = document.getElementById('warningSection');
const warningText = document.getElementById('warningText');

const startFromSelect = document.getElementById('startFrom');

// Check if the Web Audio API is supported
const AudioContext = window.AudioContext || window.webkitAudioContext;
if (!AudioContext) {
    alert("Web Audio API is not supported in this browser.");
}

const audioContext = new AudioContext();


// Initialize
function init() {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('scheduleDefaults');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        updateSettingsForm();
    }
    timeline = generateTimeline(settings);
    console.log(generateTimeline(settings));
    
    // Set up event listeners
    startPauseBtn.addEventListener('click', toggleStartPause);

    addTenSecondsBtn.addEventListener('click', addTenSeconds);
    subtractTenSecondsBtn.addEventListener('click', subtractTenSeconds);
    addThirtySecondsBtn.addEventListener('click', addThirtySeconds);
    subtractThirtySecondsBtn.addEventListener('click', subtractThirtySeconds);

    settingsBtn.addEventListener('click', openSettingsModal);
    closeModalBtn.addEventListener('click', closeSettingsModal);
    resetDefaultsBtn.addEventListener('click', resetToDefaults);
    discardChangesBtn.addEventListener('click', closeSettingsModal);
    saveSettingsBtn.addEventListener('click', saveSettings);
    resetTimelineBtn.addEventListener('click', resetTimeline);
    undoBtn.addEventListener('click', undoAdjustment);
    closeToastBtn.addEventListener('click', hideToast);
    cancelResetBtn.addEventListener('click', cancelReset);
    bellButton.addEventListener('click', playBellSound);
    startFromSelect.addEventListener('change',handleStartFromChange);
    
    // Close modal when clicking outside
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });

    const optionList = startFromSelect.options;
    timeline.forEach( (option,index) =>
      optionList.add(
        new Option(option.fullName, option.fullName, index == 0)
      )
    );
    
    // Update UI
    updateUI();
}

// Toggle start/pause
function toggleStartPause() {
    if (!timelineActive) {
        startTimeline();
    } else if (paused) {
        resumeTimeline();
    } else {
        pauseTimeline();
    }
}

function handleStartFromChange(event) {
    const selectedValue = event.target.value;
    timeLineIndex = timeline.findIndex( ( item => selectedValue === item.fullName));
    currentSegment = timeline[timeLineIndex];
}


// Start the timeline
function startTimeline() {
    // Validate settings
    if (!settings.dayStart || settings.numGames < 1) {
        showToast("⚠️ Set schedule parameters first", "error");
        return;
    }
    
    timelineActive = true;
    paused = false;
    gameProgress = { current: 1, total: settings.numGames };
    currentSegment = timeline[timeLineIndex];
    
    startTimer();
    updateUI();
}

// Pause the timeline
function pauseTimeline() {
    paused = true;
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    updateUI();
}

// Resume the timeline
function resumeTimeline() {
    paused = false;
    startTimer();
    updateUI();
}

// Start the timer
function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        currentSegment.timeLeft--;
        
        // Check for warnings
        if (currentSegment.timeLeft <= settings.warnBellTime * SECONDS_IN_MINUTE && currentSegment.timeLeft > 0) {
            if (!warnings.includes(currentSegment.type)) {
                warnings.push(currentSegment.type);
                console.log(JSON.stringify(warnings));
                playWarningBell();
                showWarningBar();
            }
        } else if (warnings.includes(currentSegment.type) && currentSegment.timeLeft > settings.warnBellTime * SECONDS_IN_MINUTE) {
            // Remove warning if time goes back up (due to adjustment)
            warnings = warnings.filter(w => w !== currentSegment.type);
        }
        
        // When segment ends
        if (currentSegment.timeLeft <= 0) {
            // Move to next segment (simplified for this example)
            currentSegment = { type: "Next Segment", timeLeft: SECONDS_IN_MINUTE };
            timeLineIndex ++;
            currentSegment = timeline[timeLineIndex];
            hideWarningBar();
        }
        
        updateUI();

    }, TIMER_MILLISECONDS);
}



// Reset the timeline
function resetTimeline() {
    timelineActive = false;
    paused = false;
    currentSegment = { type: "Not Started", timeLeft: 0 };
    timeLineIndex = 0;
    gameProgress = { current: 0, total: settings.numGames };
    warnings = [];
    adjustments = [];
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    showToast("✅ Timeline reset", "success");
    setTimeout(() => hideToast(), 1000);
    setTimeout(() => hideWarningBar(), 1000);
    
    updateUI();
}

// Cancel reset
function cancelReset() {
    if (resetInterval) {
        clearInterval(resetInterval);
    }
    resetCountdownEl.classList.add('hidden');
    resetCountdown = 0;
}

// Show toast notification
function showToast(message, type = "info", showUndo = false) {
    toastMessage.textContent = message;
    toastNotification.className = `toast toast-${type}`;
    
    if (showUndo) {
        undoBtn.classList.remove('hidden');
    } else {
        undoBtn.classList.add('hidden');
    }
    
    toastNotification.classList.remove('hidden');
    // Add animation class
    toastNotification.classList.add('animate-fadeInOut');
    
    // Remove animation class after animation completes
    setTimeout(() => {
        toastNotification.classList.remove('animate-fadeInOut');
    }, 5000);
}

function hideToast() {
    toastNotification.classList.add('hidden');
}

function playWarningBell() {
    bellButton.click();
}

function showWarningBar() {
    warningText.textContent = currentSegment.warnBellMessage;
    warningSection.classList.remove('hidden');
    // Add animation class
    warningSection.classList.add('animate-fadeInOut');
        // Remove animation class after animation completes
    setTimeout(() => {
        warningSection.classList.remove('animate-fadeInOut');
    }, 5000);

    bellButton.click();
}

function hideWarningBar() {
    warningSection.classList.add('hidden');
}

function openSettingsModal() {
    if (timelineActive && !paused) return;
    
    updateSettingsForm();
    settingsModal.classList.remove('hidden');
    
    // Show reset button if timeline is active but paused
    if (timelineActive && paused) {
        resetTimelineBtn.classList.remove('hidden');
    } else {
        resetTimelineBtn.classList.add('hidden');
    }
}

// Close settings modal
function closeSettingsModal() {
    settingsModal.classList.add('hidden');
}

// Update settings form with current settings
function updateSettingsForm() {
    numGamesInput.value = settings.numGames;
    quartersPerGameInput.value = settings.playTimes.length;
    dayStartTimeInput.value = settings.dayStart.substring(0, 5); // Remove seconds
    quarterLengthInput.value = settings.playTimes[0];
    breakTimesInput.value = settings.breakTimes.join(',');
    downtimeInput.value = settings.downTime;
    warningBellInput.value = settings.warnBellTime;
}

// Reset to factory defaults
function resetToDefaults() {
    settings = { ...DEFAULT_SETTINGS };
    updateSettingsForm();
}

// Save settings
function saveSettings() {
    // Get values from form
    const numGames = parseInt(numGamesInput.value) || 1;
    const quartersPerGame = parseInt(quartersPerGameInput.value) || 1;
    const dayStartTime = dayStartTimeInput.value + ":00"; // Add seconds
    const quarterLength = parseInt(quarterLengthInput.value) || 1;
    const breakTimes = breakTimesInput.value
        .split(',')
        .map(val => parseInt(val.trim()) || 0)
        .filter(val => val > 0);
    const downtime = parseInt(downtimeInput.value) || 1;
    const warningBell = parseFloat(warningBellInput.value) || 0.5;
    
    // Update settings
    settings = {
        dayStart: dayStartTime,
        numGames: numGames,
        playTimes: Array(quartersPerGame).fill(quarterLength),
        breakTimes: breakTimes,
        downTime: downtime,
        warnBellTime: warningBell
    };
    
    // Save to localStorage
    localStorage.setItem('scheduleDefaults', JSON.stringify(settings));
    
    // Show confirmation
    showToast("✅ Settings saved. Reset timeline to apply changes.", "success");
    
    // Close modal
    closeSettingsModal();
    
    // Update UI
    updateUI();
}

// Update UI elements
function updateUI() {
    // Update start/pause button
    if (!timelineActive) {
        startPauseBtn.textContent = "▶️ START DAY";
        startPauseBtn.className = "btn btn-start";
        pauseStatus.classList.add('hidden');
    } else if (paused) {
        startPauseBtn.textContent = "▶️ RESUME";
        startPauseBtn.className = "btn btn-resume";
        pauseStatus.classList.remove('hidden');
    } else {
        startPauseBtn.textContent = "⏸️ PAUSE";
        startPauseBtn.className = "btn btn-pause";
        pauseStatus.classList.add('hidden');
    }
        
    // Update game progress
    currentGameEl.textContent = currentSegment?.gameNumber ?? 1;
    totalGamesEl.textContent = gameProgress.total;
    
    // Update timer display
    timerSegment.textContent = (currentSegment.sectionName ?? 'Not Started');
    timerTime.textContent = formatTime(currentSegment.timeLeft);

    startFromSelect.value = currentSegment.fullName;

    // addTenSecondsBtn.disabled = paused || !timelineActive || currentSegment.type.startsWith('Q');
    startFromSelect.disabled = timelineActive && !paused;
   
    // Update settings button
    settingsBtn.disabled = timelineActive && !paused;
}


// Format time as MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function generateTimeline(settings){
  let timeline = [];
  for (let i = 0; i<settings.numGames; i++ ){

    settings.playTimes.forEach( (playTime,index) => {
      
      timeline.push(
        {
          type: 'Gametime',
          gameNumber:i+1,
          sectionName:`Q ${index +1}`,
          fullName:`Game ${i+1} Q ${index +1}`,
          seconds: playTime * SECONDS_IN_MINUTE,
          timeLeft: playTime * SECONDS_IN_MINUTE,
          warnBellTime: settings.warnBellTime * SECONDS_IN_MINUTE,
          warnBellMessage: `${(index+1 == settings.playTimes.length) ? '🔔 Game' : '🔔 Quarter'} ending soon!!!`
        }
      );
      if (!(index > settings.breakTimes.length-1)){
        timeline.push(
          {
            type: 'Breaktime',
            gameNumber:i+1,
            sectionName:`Break ${index +1}`,
            fullName:`Game ${i+1} Break ${index +1}`,
            seconds: settings.breakTimes[index] * SECONDS_IN_MINUTE,
            timeLeft: settings.breakTimes[index] * SECONDS_IN_MINUTE,
            warnBellTime: settings.warnBellTime * SECONDS_IN_MINUTE,
            warnBellMessage: '🔔 Next quarter starting soon!!!'
          }
        );
      } 
    });

    if (!(i > settings.numGames.length-2)){ 
      timeline.push(
        { type: 'Downtime',
          nextGame:i+2,
          sectionName:`Downtime ${i +1}`,
          fullName:`Downtime ${i +1}`,
          seconds: settings.downTime * SECONDS_IN_MINUTE,
          timeLeft: settings.downTime * SECONDS_IN_MINUTE,
          warnBellTime: settings.warnBellTime * SECONDS_IN_MINUTE,
          warnBellMessage: '🔔 Next game starting soon!!!'
        }
      );
    }
  }
  return timeline;
}

function addTenSeconds() {
  addNSeconds(10);
}
function addThirtySeconds() {
  addNSeconds(30);
}
function subtractTenSeconds() {
  addNSeconds(-10);
}
function subtractThirtySeconds() {
  addNSeconds(-30);
}

function addNSeconds(seconds) {
    if (paused || !timelineActive || currentSegment.type.startsWith('Q')) return;
    // Add adjustment to stack
    adjustments.push(seconds);
    // Update current segment
    currentSegment.timeLeft += seconds;
    // Show toast with undo
    showToast(`✅ Added ${seconds}s to timeline`, "success", true);
    // Hide toast after 5 seconds
    setTimeout(() => {
        if (toastNotification.classList.contains('toast-success')) {
          hideToast();
        }
    }, 5000);
    updateUI();
}

// Undo the last adjustment
function undoAdjustment() {
    if (adjustments.length === 0) return;
    
    const lastAdjustment = adjustments.pop();
    
    // Update current segment
    currentSegment.timeLeft -= lastAdjustment;
    
    // Show confirmation
    showToast("↩️ Timeline adjustment reverted", "info");
    setTimeout(() => hideToast(), 2000);
    
    updateUI();
}

function playBellSound() {
    // Create an oscillator node to generate the sound wave
    const oscillator = audioContext.createOscillator();
    // Create a gain node to control the volume
    const gainNode = audioContext.createGain();

    // Connect the oscillator to the gain node, and the gain node to the speakers
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set the type of wave and its frequency (a common bell tone is around 1000 Hz)
    oscillator.type = 'sine';
    oscillator.frequency.value = 1000;

    // --- Create the "ring" and fade out effect ---
    const now = audioContext.currentTime;
    
    // Set the initial volume (gain)
    gainNode.gain.setValueAtTime(1, now);
    
    // Schedule a fade-out over a short period (e.g., 0.5 seconds)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    // Start the oscillator
    oscillator.start();
    
    // Stop the oscillator after the sound has faded out to prevent it from running indefinitely
    oscillator.stop(now + 0.5);
}


// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);