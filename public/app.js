(function () {
    // --- State Variables ---
    let currentQuestion = null;
    let selectedOption = null;
    let isSubmitted = false;
    let domainData = { rw: [], math: [] };
    let recentQuestionIds = [];

    // Session Stats
    let stats = {
        attempted: 0,
        correct: 0,
        streak: 0,
        bestStreak: 0,
        seconds: 0
    };

    // Active Filters
    let filters = {
        subject: 'all',
        difficulty: 'all',
        format: 'all',
        domain: 'all',
        excludeActive: true
    };

    // Bookmarks & Practice History
    let bookmarks = [];
    let history = [];

    // Detect base API path (works on /openboard/sat, /sat, or localhost root)
    const API_BASE = window.location.pathname.includes('/openboard')
        ? '/openboard/sat/api'
        : (window.location.pathname.includes('/sat') ? '/sat/api' : '/api');

    // Load saved settings & stats from LocalStorage
    try {
        const savedStats = localStorage.getItem('sat_quizzer_stats');
        if (savedStats) stats = { ...stats, ...JSON.parse(savedStats) };

        const savedBookmarks = localStorage.getItem('sat_quizzer_bookmarks');
        if (savedBookmarks) bookmarks = JSON.parse(savedBookmarks);

        const savedHistory = localStorage.getItem('sat_quizzer_history');
        if (savedHistory) {
            history = JSON.parse(savedHistory);
            if (!Array.isArray(history)) history = [];
        }

        const savedFilters = localStorage.getItem('sat_quizzer_filters');
        if (savedFilters) filters = { ...filters, ...JSON.parse(savedFilters) };
    } catch (e) {
        console.warn('Could not read from localStorage', e);
    }

    // --- DOM Elements ---
    // Desktop Header Stats
    const streakCounter = document.getElementById('streak-counter');
    const accuracyBox = document.getElementById('accuracy-box');
    const accuracyCounter = document.getElementById('accuracy-counter');
    const scoreCounter = document.getElementById('score-counter');
    const btnResetAccuracy = document.getElementById('btn-reset-accuracy');
    const sessionTimer = document.getElementById('session-timer');
    const bookmarksCount = document.getElementById('bookmarks-count');
    const historyCount = document.getElementById('history-count');
    const btnHistory = document.getElementById('btn-history');

    // Mobile Top Bar Elements
    const mobileStreak = document.getElementById('mobile-streak');
    const mobileAccuracy = document.getElementById('mobile-accuracy');
    const mobileAccuracyChip = document.getElementById('mobile-accuracy-chip');
    const mobileSubjectBadge = document.getElementById('mobile-subject-badge');
    const mobileBookmarksBadge = document.getElementById('mobile-bookmarks-badge');
    const mobileHistoryBadge = document.getElementById('mobile-history-badge');
    const btnMobileFilters = document.getElementById('btn-mobile-filters');
    const btnMobileHistory = document.getElementById('btn-mobile-history');
    const btnMobileBookmarks = document.getElementById('btn-mobile-bookmarks');

    // Desktop Filters
    const desktopSubjectPills = document.querySelectorAll('#desktop-subject-pills .pill');
    const filterDifficulty = document.getElementById('filter-difficulty');
    const filterFormat = document.getElementById('filter-format');
    const filterDomain = document.getElementById('filter-domain');
    const filterExcludeActive = document.getElementById('filter-exclude-active');
    const matchingCountText = document.getElementById('matching-count-text');

    // Mobile Filter Drawer
    const mobileFilterDrawer = document.getElementById('mobile-filter-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const btnApplyDrawer = document.getElementById('btn-apply-drawer');
    const mobileSubjectPills = document.querySelectorAll('#mobile-subject-pills .pill');
    const mobileFilterDifficulty = document.getElementById('mobile-filter-difficulty');
    const mobileFilterFormat = document.getElementById('mobile-filter-format');
    const mobileFilterDomain = document.getElementById('mobile-filter-domain');
    const mobileFilterExcludeActive = document.getElementById('mobile-filter-exclude-active');

    // Views
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const questionView = document.getElementById('question-view');
    const errorMessage = document.getElementById('error-message');
    const btnRetry = document.getElementById('btn-retry');

    // Meta Tags
    const metaSubject = document.getElementById('meta-subject');
    const metaFormat = document.getElementById('meta-format');
    const metaDomain = document.getElementById('meta-domain');
    const metaSkill = document.getElementById('meta-skill');
    const metaDifficulty = document.getElementById('meta-difficulty');
    const metaPracticeTag = document.getElementById('meta-practice-tag');
    const metaQid = document.getElementById('meta-qid');
    const btnCopyId = document.getElementById('btn-copy-id');
    const btnToggleBookmark = document.getElementById('btn-toggle-bookmark');

    // Panels & Content
    const questionGrid = document.getElementById('question-grid');
    const stimulusPanel = document.getElementById('stimulus-panel');
    const stimulusContent = document.getElementById('stimulus-content');
    const promptPanel = document.getElementById('prompt-panel');
    const stemContent = document.getElementById('stem-content');
    const optionsContainer = document.getElementById('options-container');

    // SPR Input
    const sprContainer = document.getElementById('spr-container');
    const sprInput = document.getElementById('spr-input');
    const btnSubmitSpr = document.getElementById('btn-submit-spr');
    const sprFeedback = document.getElementById('spr-feedback');

    // Rationale
    const rationaleCard = document.getElementById('rationale-card');
    const rationaleToggle = document.getElementById('rationale-toggle');
    const rationaleChevron = document.getElementById('rationale-chevron');
    const rationaleResultBadge = document.getElementById('rationale-result-badge');
    const rationaleContent = document.getElementById('rationale-content');

    // Desktop Footer Buttons
    const btnJumpRationale = document.getElementById('btn-jump-rationale');
    const btnSkip = document.getElementById('btn-skip');
    const btnAction = document.getElementById('btn-action');

    // Mobile Bottom Taskbar Buttons
    const btnMobileSkip = document.getElementById('btn-mobile-skip');
    const btnMobileAction = document.getElementById('btn-mobile-action');
    const btnMobileBookmark = document.getElementById('btn-mobile-bookmark');

    // Bookmarks Modal
    const bookmarksModal = document.getElementById('bookmarks-modal');
    const btnBookmarks = document.getElementById('btn-bookmarks');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const bookmarksList = document.getElementById('bookmarks-list');
    const savedCountModal = document.getElementById('saved-count-modal');

    // Practice History Modal
    const historyModal = document.getElementById('history-modal');
    const btnCloseHistory = document.getElementById('btn-close-history');
    const historyList = document.getElementById('history-list');
    const historyTotalCount = document.getElementById('history-total-count');
    const histStatAttempted = document.getElementById('hist-stat-attempted');
    const histStatAccuracy = document.getElementById('hist-stat-accuracy');
    const histStatCorrect = document.getElementById('hist-stat-correct');
    const histStatIncorrect = document.getElementById('hist-stat-incorrect');
    const histStatSkipped = document.getElementById('hist-stat-skipped');
    const histTabAllCount = document.getElementById('hist-tab-all-count');
    const histTabCorrectCount = document.getElementById('hist-tab-correct-count');
    const histTabIncorrectCount = document.getElementById('hist-tab-incorrect-count');
    const histTabSkippedCount = document.getElementById('hist-tab-skipped-count');
    const btnResetAccuracyModal = document.getElementById('btn-reset-accuracy-modal');
    const btnExportHistory = document.getElementById('btn-export-history');
    const btnClearHistory = document.getElementById('btn-clear-history');
    const historyTabs = document.querySelectorAll('.history-tab');
    let currentHistoryFilter = 'all';

    // Legal Disclaimer Modal
    const disclaimerModal = document.getElementById('disclaimer-modal');
    const btnOpenDisclaimer = document.getElementById('btn-open-disclaimer');
    const btnCloseDisclaimer = document.getElementById('btn-close-disclaimer');

    // --- Practice Test Simulation State & DOM ---
    let testSession = {
        active: false,
        preset: null,
        title: '',
        questions: [],
        currentIndex: 0,
        answers: {},       // { [index]: 'A' | '12' }
        flags: {},         // { [index]: true }
        startTime: 0,
        timeLimitSeconds: 0,
        timeRemaining: 0,
        timerInterval: null,
        timerHidden: false,
        isSubmitted: false,
        isReviewMode: false,
        results: null
    };

    // Header & HUD Elements
    const headerDrillWrap = document.getElementById('header-drill-wrap');
    const testHud = document.getElementById('test-hud');
    const testReviewHud = document.getElementById('test-review-hud');
    const btnModeDrill = document.getElementById('btn-mode-drill');
    const btnModeTest = document.getElementById('btn-mode-test');
    const testHudTitle = document.getElementById('test-hud-title');
    const btnTestFlag = document.getElementById('btn-test-flag');
    const testFlagText = document.getElementById('test-flag-text');
    const testTimerBox = document.getElementById('test-timer-box');
    const testTimerDisplay = document.getElementById('test-timer-display');
    const btnTestTimerHide = document.getElementById('btn-test-timer-hide');
    const btnOpenNav = document.getElementById('btn-open-nav');
    const testNavBtnText = document.getElementById('test-nav-btn-text');
    const btnTestExit = document.getElementById('btn-test-exit');

    // Review HUD Elements
    const reviewQuestionLabel = document.getElementById('review-question-label');
    const reviewStatusChip = document.getElementById('review-status-chip');
    const btnReviewScoreReport = document.getElementById('btn-review-score-report');
    const btnReviewExit = document.getElementById('btn-review-exit');

    // Footers
    const footerDrillWrap = document.getElementById('footer-drill-wrap');
    const footerTestWrap = document.getElementById('footer-test-wrap');
    const btnTestPrev = document.getElementById('btn-test-prev');
    const btnTestNext = document.getElementById('btn-test-next');
    const btnTestFooterNav = document.getElementById('btn-test-footer-nav');
    const testFooterQnum = document.getElementById('test-footer-qnum');
    const testFooterStatus = document.getElementById('test-footer-status');
    const btnTestOpenReview = document.getElementById('btn-test-open-review');

    // Mobile Elements
    const mobileDrillActions = document.getElementById('mobile-drill-actions');
    const mobileTestTopBar = document.getElementById('mobile-test-top-bar');
    const mobileTestTimerDisplay = document.getElementById('mobile-test-timer-display');
    const btnMobileTestFlag = document.getElementById('btn-mobile-test-flag');
    const btnMobileOpenNav = document.getElementById('btn-mobile-open-nav');
    const btnMobileTestExit = document.getElementById('btn-mobile-test-exit');
    const btnMobileTestCalc = document.getElementById('btn-mobile-test-calc');
    const btnMobileTestPad = document.getElementById('btn-mobile-test-pad');
    const btnMobileTestLaunch = document.getElementById('btn-mobile-test-launch');
    const mobileDrillTaskbar = document.getElementById('mobile-drill-taskbar');
    const mobileTestTaskbar = document.getElementById('mobile-test-taskbar');
    const btnMobileTestPrev = document.getElementById('btn-mobile-test-prev');
    const btnMobileTestNext = document.getElementById('btn-mobile-test-next');
    const btnMobileTestNavChip = document.getElementById('btn-mobile-test-nav-chip');
    const mobileTestQnum = document.getElementById('mobile-test-qnum');

    // Modals
    const testLauncherModal = document.getElementById('test-launcher-modal');
    const btnCloseLauncher = document.getElementById('btn-close-launcher');
    const testNavModal = document.getElementById('test-nav-modal');
    const btnCloseNav = document.getElementById('btn-close-nav');
    const btnNavClose = document.getElementById('btn-nav-close');
    const btnNavToReview = document.getElementById('btn-nav-to-review');
    const testNavGrid = document.getElementById('test-nav-grid');

    const testReviewModal = document.getElementById('test-review-modal');
    const btnCloseReview = document.getElementById('btn-close-review');
    const btnReturnToTest = document.getElementById('btn-return-to-test');
    const btnSubmitTestFinal = document.getElementById('btn-submit-test-final');
    const reviewStatTotal = document.getElementById('review-stat-total');
    const reviewStatAnswered = document.getElementById('review-stat-answered');
    const reviewStatUnanswered = document.getElementById('review-stat-unanswered');
    const reviewStatFlagged = document.getElementById('review-stat-flagged');
    const unansweredAlert = document.getElementById('unanswered-alert');
    const testReviewGrid = document.getElementById('test-review-grid');

    const testResultsModal = document.getElementById('test-results-modal');
    const btnCloseResults = document.getElementById('btn-close-results');
    const resultScaledScore = document.getElementById('result-scaled-score');
    const resultRawScore = document.getElementById('result-raw-score');
    const resultAccuracy = document.getElementById('result-accuracy');
    const resultTimeSpent = document.getElementById('result-time-spent');
    const resultPacing = document.getElementById('result-pacing');
    const resultDomainBars = document.getElementById('result-domain-bars');
    const resultMatrixTbody = document.getElementById('result-matrix-tbody');
    const btnExportTestReport = document.getElementById('btn-export-test-report');
    const btnReviewAllQuestions = document.getElementById('btn-review-all-questions');
    const btnRetakeNewTest = document.getElementById('btn-retake-new-test');

    // --- Stats & Timer Helpers ---
    function updateStatsDisplay() {
        const pct = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;

        // Desktop
        if (streakCounter) streakCounter.textContent = stats.streak;
        if (accuracyCounter) accuracyCounter.textContent = `${pct}%`;
        if (scoreCounter) scoreCounter.textContent = `${stats.correct}/${stats.attempted}`;
        if (bookmarksCount) bookmarksCount.textContent = bookmarks.length;
        if (historyCount) historyCount.textContent = history.length;

        // Mobile
        if (mobileStreak) mobileStreak.textContent = stats.streak;
        if (mobileAccuracy) mobileAccuracy.textContent = `${pct}%`;
        if (mobileBookmarksBadge) mobileBookmarksBadge.textContent = bookmarks.length;
        if (mobileHistoryBadge) mobileHistoryBadge.textContent = history.length;

        if (savedCountModal) savedCountModal.textContent = bookmarks.length;
        if (historyTotalCount) historyTotalCount.textContent = history.length;

        // Update mobile subject tag text
        if (mobileSubjectBadge) {
            if (filters.subject === 'rw') mobileSubjectBadge.textContent = '📖 Reading & Writing';
            else if (filters.subject === 'math') mobileSubjectBadge.textContent = '📐 Math';
            else mobileSubjectBadge.textContent = '🎯 All SAT';
        }

        try {
            localStorage.setItem('sat_quizzer_stats', JSON.stringify(stats));
        } catch (e) {}
    }

    function startTimer() {
        setInterval(() => {
            stats.seconds++;
            const mins = Math.floor(stats.seconds / 60).toString().padStart(2, '0');
            const secs = (stats.seconds % 60).toString().padStart(2, '0');
            if (sessionTimer) sessionTimer.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    // --- Domain Filter Population ---
    function populateDomainDropdowns() {
        const targets = [filterDomain, mobileFilterDomain].filter(Boolean);

        let domainsToShow = [];
        if (filters.subject === 'rw') {
            domainsToShow = domainData.rw || [];
        } else if (filters.subject === 'math') {
            domainsToShow = domainData.math || [];
        } else {
            if (domainData.rw) domainsToShow.push(...domainData.rw);
            if (domainData.math) domainsToShow.push(...domainData.math);
        }

        targets.forEach(selectEl => {
            const curVal = selectEl.value;
            selectEl.innerHTML = '<option value="all">All Domains</option>';
            domainsToShow.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.code;
                opt.textContent = d.name;
                selectEl.appendChild(opt);
            });

            if (domainsToShow.some(d => d.code === curVal)) {
                selectEl.value = curVal;
            } else {
                selectEl.value = 'all';
                filters.domain = 'all';
            }
        });
    }

    // --- MathJax Typesetting Helper ---
    function triggerMathJax() {
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([questionView]).catch(err => console.debug('MathJax error', err));
        }
    }

    // --- Utility Tool Panels: Desmos Graphing Calculator & Rough Pad ---
    const desmosPanel = document.getElementById('desmos-panel');
    const desmosIframe = document.getElementById('desmos-iframe');
    const btnToggleCalc = document.getElementById('btn-toggle-calc');
    const btnMobileCalc = document.getElementById('btn-mobile-calc');
    const btnCloseCalc = document.getElementById('btn-close-calc');
    const btnSprOpenCalc = document.getElementById('btn-spr-open-calc');
    const btnCalcSwitchPad = document.getElementById('btn-calc-switch-pad');

    const roughpadPanel = document.getElementById('roughpad-panel');
    const btnTogglePad = document.getElementById('btn-toggle-pad');
    const btnMobilePad = document.getElementById('btn-mobile-pad');
    const btnClosePad = document.getElementById('btn-close-pad');
    const btnSprOpenPad = document.getElementById('btn-spr-open-pad');
    const btnPadSwitchCalc = document.getElementById('btn-pad-switch-calc');
    const btnPadModeDraw = document.getElementById('btn-pad-mode-draw');
    const btnPadModeType = document.getElementById('btn-pad-mode-type');
    const roughpadDrawToolbar = document.getElementById('roughpad-draw-toolbar');
    const roughpadTypeToolbar = document.getElementById('roughpad-type-toolbar');
    const roughpadCanvasWrap = document.getElementById('roughpad-canvas-wrap');
    const roughCanvas = document.getElementById('rough-canvas');
    const roughpadTypeWrap = document.getElementById('roughpad-type-wrap');
    const roughTextarea = document.getElementById('rough-textarea');

    const toolPen = document.getElementById('tool-pen');
    const toolHighlighter = document.getElementById('tool-highlighter');
    const toolEraser = document.getElementById('tool-eraser');
    const toolUndo = document.getElementById('tool-undo');
    const toolClearDraw = document.getElementById('tool-clear-draw');
    const toolClearType = document.getElementById('tool-clear-type');

    const DESMOS_URL = 'https://www.desmos.com/testing/collegeboard/graphing';
    let desmosLoaded = false;

    // Drawing State
    let roughCtx = null;
    let isDrawing = false;
    let lastPoint = { x: 0, y: 0 };
    let currentTool = 'pen'; // 'pen' | 'highlighter' | 'eraser'
    let currentColor = '#f0f0f5';
    let undoStack = [];
    const MAX_UNDO = 20;

    // Helper: Hex color to RGBA
    function hexToRgba(hex, alpha) {
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // --- Desmos Controller ---
    function openDesmos() {
        if (!desmosPanel) return;
        closeRoughPad();
        if (!desmosLoaded && desmosIframe) {
            desmosIframe.src = DESMOS_URL;
            desmosLoaded = true;
        }
        desmosPanel.classList.remove('hidden');
        if (questionGrid) questionGrid.classList.add('has-desmos');
        updateDesmosButtonState(true);
    }

    function closeDesmos() {
        if (!desmosPanel) return;
        desmosPanel.classList.add('hidden');
        if (questionGrid) questionGrid.classList.remove('has-desmos');
        updateDesmosButtonState(false);
    }

    function toggleDesmos() {
        if (!desmosPanel) return;
        const isHidden = desmosPanel.classList.contains('hidden');
        if (isHidden) openDesmos();
        else closeDesmos();
    }

    function updateDesmosButtonState(isOpen) {
        if (btnToggleCalc) {
            btnToggleCalc.classList.toggle('active', isOpen);
            btnToggleCalc.innerHTML = isOpen ? '🧮 Close Calculator' : '🧮 Calculator';
        }
        if (btnMobileCalc) {
            btnMobileCalc.classList.toggle('active', isOpen);
        }
    }

    function setDesmosAvailability(isMath) {
        if (btnToggleCalc) {
            btnToggleCalc.classList.toggle('hidden', !isMath);
        }
        if (btnMobileCalc) {
            btnMobileCalc.classList.toggle('hidden', !isMath);
        }
        if (btnPadSwitchCalc) {
            btnPadSwitchCalc.classList.toggle('hidden', !isMath);
        }
        if (!isMath) {
            closeDesmos();
        }
    }

    // --- Rough Pad Controller ---
    function openRoughPad() {
        if (!roughpadPanel) return;
        closeDesmos();
        roughpadPanel.classList.remove('hidden');
        if (questionGrid) questionGrid.classList.add('has-roughpad');
        updateRoughpadButtonState(true);
        setTimeout(resizeRoughCanvas, 40);
    }

    function closeRoughPad() {
        if (!roughpadPanel) return;
        roughpadPanel.classList.add('hidden');
        if (questionGrid) questionGrid.classList.remove('has-roughpad');
        updateRoughpadButtonState(false);
    }

    function toggleRoughPad() {
        if (!roughpadPanel) return;
        const isHidden = roughpadPanel.classList.contains('hidden');
        if (isHidden) openRoughPad();
        else closeRoughPad();
    }

    function updateRoughpadButtonState(isOpen) {
        if (btnTogglePad) {
            btnTogglePad.classList.toggle('active', isOpen);
            btnTogglePad.innerHTML = isOpen ? '📝 Close Pad' : '📝 Rough Pad';
        }
        if (btnMobilePad) {
            btnMobilePad.classList.toggle('active', isOpen);
        }
    }

    function setPadMode(mode) {
        if (mode === 'draw') {
            if (btnPadModeDraw) btnPadModeDraw.classList.add('active');
            if (btnPadModeType) btnPadModeType.classList.remove('active');
            if (roughpadDrawToolbar) roughpadDrawToolbar.classList.remove('hidden');
            if (roughpadTypeToolbar) roughpadTypeToolbar.classList.add('hidden');
            if (roughpadCanvasWrap) roughpadCanvasWrap.classList.remove('hidden');
            if (roughpadTypeWrap) roughpadTypeWrap.classList.add('hidden');
            setTimeout(resizeRoughCanvas, 30);
        } else {
            if (btnPadModeType) btnPadModeType.classList.add('active');
            if (btnPadModeDraw) btnPadModeDraw.classList.remove('active');
            if (roughpadTypeToolbar) roughpadTypeToolbar.classList.remove('hidden');
            if (roughpadDrawToolbar) roughpadDrawToolbar.classList.add('hidden');
            if (roughpadTypeWrap) roughpadTypeWrap.classList.remove('hidden');
            if (roughpadCanvasWrap) roughpadCanvasWrap.classList.add('hidden');
            if (roughTextarea) roughTextarea.focus();
        }
    }

    function setDrawingTool(tool) {
        currentTool = tool;
        if (toolPen) toolPen.classList.toggle('active', tool === 'pen');
        if (toolHighlighter) toolHighlighter.classList.toggle('active', tool === 'highlighter');
        if (toolEraser) toolEraser.classList.toggle('active', tool === 'eraser');
        if (roughCanvas) {
            roughCanvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
        }
    }

    function resizeRoughCanvas() {
        if (!roughCanvas || !roughpadCanvasWrap || !roughCtx) return;
        const rect = roughpadCanvasWrap.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const dpr = window.devicePixelRatio || 1;
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);

        let savedDataUrl = null;
        if (roughCanvas.width > 0 && roughCanvas.height > 0) {
            try {
                savedDataUrl = roughCanvas.toDataURL();
            } catch (e) {}
        }

        roughCanvas.width = Math.round(w * dpr);
        roughCanvas.height = Math.round(h * dpr);
        roughCanvas.style.width = `${w}px`;
        roughCanvas.style.height = `${h}px`;

        // Reset transform matrix and scale cleanly to DPR
        roughCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (savedDataUrl) {
            const img = new Image();
            img.onload = () => {
                roughCtx.drawImage(img, 0, 0, w, h);
            };
            img.src = savedDataUrl;
        }
    }

    function getCanvasCoords(e) {
        const rect = roughCanvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function saveUndoState() {
        if (!roughCanvas || !roughCtx) return;
        try {
            if (undoStack.length >= MAX_UNDO) undoStack.shift();
            undoStack.push(roughCanvas.toDataURL());
        } catch (e) {}
    }

    function undoStroke() {
        if (!roughCanvas || !roughCtx || undoStack.length === 0) return;
        const prevState = undoStack.pop();
        const img = new Image();
        img.onload = () => {
            const dpr = window.devicePixelRatio || 1;
            roughCtx.clearRect(0, 0, roughCanvas.width / dpr, roughCanvas.height / dpr);
            roughCtx.drawImage(img, 0, 0, roughCanvas.width / dpr, roughCanvas.height / dpr);
        };
        img.src = prevState;
    }

    function clearDrawing() {
        if (!roughCanvas || !roughCtx) return;
        saveUndoState();
        const dpr = window.devicePixelRatio || 1;
        roughCtx.clearRect(0, 0, roughCanvas.width / dpr, roughCanvas.height / dpr);
    }

    function resetRoughPadForNewQuestion() {
        if (roughCanvas && roughCtx) {
            undoStack = [];
            const dpr = window.devicePixelRatio || 1;
            roughCtx.clearRect(0, 0, roughCanvas.width / dpr, roughCanvas.height / dpr);
        }
    }

    function handlePointerDown(e) {
        if (!roughCtx || !roughCanvas) return;
        roughCanvas.setPointerCapture(e.pointerId);
        saveUndoState();
        isDrawing = true;
        const pt = getCanvasCoords(e);
        lastPoint = pt;

        // Immediate dot mark on click/tap
        roughCtx.beginPath();
        if (currentTool === 'eraser') {
            roughCtx.globalCompositeOperation = 'destination-out';
            roughCtx.arc(pt.x, pt.y, 11, 0, Math.PI * 2);
            roughCtx.fill();
        } else if (currentTool === 'highlighter') {
            roughCtx.globalCompositeOperation = 'source-over';
            roughCtx.fillStyle = hexToRgba(currentColor, 0.35);
            roughCtx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
            roughCtx.fill();
        } else {
            roughCtx.globalCompositeOperation = 'source-over';
            roughCtx.fillStyle = currentColor;
            roughCtx.arc(pt.x, pt.y, 1.25, 0, Math.PI * 2);
            roughCtx.fill();
        }
    }

    function handlePointerMove(e) {
        if (!isDrawing || !roughCtx) return;
        const current = getCanvasCoords(e);

        roughCtx.beginPath();
        roughCtx.moveTo(lastPoint.x, lastPoint.y);
        roughCtx.lineTo(current.x, current.y);

        if (currentTool === 'eraser') {
            roughCtx.globalCompositeOperation = 'destination-out';
            roughCtx.lineWidth = 24;
            roughCtx.lineCap = 'round';
            roughCtx.lineJoin = 'round';
            roughCtx.stroke();
        } else if (currentTool === 'highlighter') {
            roughCtx.globalCompositeOperation = 'source-over';
            roughCtx.strokeStyle = hexToRgba(currentColor, 0.35);
            roughCtx.lineWidth = 14;
            roughCtx.lineCap = 'square';
            roughCtx.lineJoin = 'bevel';
            roughCtx.stroke();
        } else {
            roughCtx.globalCompositeOperation = 'source-over';
            roughCtx.strokeStyle = currentColor;
            roughCtx.lineWidth = 2.5;
            roughCtx.lineCap = 'round';
            roughCtx.lineJoin = 'round';
            roughCtx.stroke();
        }

        lastPoint = current;
    }

    function handlePointerUp(e) {
        if (!isDrawing) return;
        isDrawing = false;
        try {
            roughCanvas.releasePointerCapture(e.pointerId);
        } catch (err) {}
    }

    function initDesmos() {
        if (btnToggleCalc) btnToggleCalc.addEventListener('click', toggleDesmos);
        if (btnMobileCalc) btnMobileCalc.addEventListener('click', toggleDesmos);
        if (btnCloseCalc) btnCloseCalc.addEventListener('click', closeDesmos);
        if (btnSprOpenCalc) btnSprOpenCalc.addEventListener('click', openDesmos);
        if (btnCalcSwitchPad) btnCalcSwitchPad.addEventListener('click', openRoughPad);
    }

    function initRoughPad() {
        if (roughCanvas) {
            roughCtx = roughCanvas.getContext('2d', { willReadFrequently: true });
            roughCanvas.addEventListener('pointerdown', handlePointerDown);
            roughCanvas.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
            roughCanvas.addEventListener('pointercancel', handlePointerUp);
        }

        window.addEventListener('resize', () => {
            if (roughpadPanel && !roughpadPanel.classList.contains('hidden')) {
                resizeRoughCanvas();
            }
        });

        if (btnTogglePad) btnTogglePad.addEventListener('click', toggleRoughPad);
        if (btnMobilePad) btnMobilePad.addEventListener('click', toggleRoughPad);
        if (btnClosePad) btnClosePad.addEventListener('click', closeRoughPad);
        if (btnSprOpenPad) btnSprOpenPad.addEventListener('click', openRoughPad);
        if (btnPadSwitchCalc) btnPadSwitchCalc.addEventListener('click', openDesmos);

        if (btnPadModeDraw) btnPadModeDraw.addEventListener('click', () => setPadMode('draw'));
        if (btnPadModeType) btnPadModeType.addEventListener('click', () => setPadMode('type'));

        if (toolPen) toolPen.addEventListener('click', () => setDrawingTool('pen'));
        if (toolHighlighter) toolHighlighter.addEventListener('click', () => setDrawingTool('highlighter'));
        if (toolEraser) toolEraser.addEventListener('click', () => setDrawingTool('eraser'));
        if (toolUndo) toolUndo.addEventListener('click', undoStroke);
        if (toolClearDraw) toolClearDraw.addEventListener('click', clearDrawing);
        if (toolClearType) {
            toolClearType.addEventListener('click', () => {
                if (roughTextarea) {
                    roughTextarea.value = '';
                    roughTextarea.focus();
                }
            });
        }

        // Color palette buttons
        const colorDots = document.querySelectorAll('.roughpad-toolbar .color-dot');
        colorDots.forEach(dot => {
            dot.addEventListener('click', () => {
                colorDots.forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                currentColor = dot.dataset.color || '#f0f0f5';
                if (currentTool === 'eraser') setDrawingTool('pen');
            });
        });
    }

    // --- Fetch Filters Metadata ---
    async function loadFiltersCatalog() {
        try {
            const res = await fetch(`${API_BASE}/filters`);
            const data = await res.json();
            domainData = data.domainInfo || { rw: [], math: [] };
            populateDomainDropdowns();

            if (data.formatCounts) {
                const sprCount = data.formatCounts.spr || 394;
                const mcqCount = data.formatCounts.mcq || 3376;
                [filterFormat, mobileFilterFormat].filter(Boolean).forEach(el => {
                    const curVal = el.value || filters.format || 'all';
                    el.innerHTML = `
                        <option value="all">All Formats (${data.total.toLocaleString()})</option>
                        <option value="spr">✏️ No Options (Free Response) (${sprCount.toLocaleString()})</option>
                        <option value="mcq">🔘 Multiple Choice (${mcqCount.toLocaleString()})</option>
                    `;
                    el.value = curVal;
                });
            }

            if (matchingCountText) {
                matchingCountText.textContent = `${data.total.toLocaleString()} official items indexed`;
            }
        } catch (e) {
            console.error('Failed to load filter info', e);
        }
    }

    // --- Action Button State Synchronization ---
    function setActionButtonsText(text, disabled) {
        if (btnAction) {
            btnAction.textContent = text;
            btnAction.disabled = disabled;
        }
        if (btnMobileAction) {
            btnMobileAction.textContent = text;
            btnMobileAction.disabled = disabled;
        }
    }

    // --- Fetch Next Random Question ---
    async function loadNextQuestion(specificId = null) {
        isSubmitted = false;
        selectedOption = null;
        currentQuestion = null;

        loadingState.classList.remove('hidden');
        errorState.classList.add('hidden');
        questionView.classList.add('hidden');
        rationaleCard.classList.add('hidden');
        rationaleCard.classList.remove('collapsed');
        if (btnJumpRationale) btnJumpRationale.classList.add('hidden');
        optionsContainer.innerHTML = '';
        sprFeedback.classList.add('hidden');
        sprInput.value = '';

        setActionButtonsText('Check Answer', true);

        // Scroll to top on both desktop panel and window
        if (promptPanel) promptPanel.scrollTop = 0;
        if (stimulusContent) stimulusContent.scrollTop = 0;
        window.scrollTo({ top: 0, behavior: 'instant' });

        try {
            let url;
            if (specificId) {
                url = `${API_BASE}/question/${specificId}`;
            } else {
                const params = new URLSearchParams({
                    subject: filters.subject,
                    difficulty: filters.difficulty,
                    format: filters.format,
                    domain: filters.domain,
                    excludeActive: filters.excludeActive ? 'true' : 'false',
                    excludeIds: recentQuestionIds.slice(-40).join(',')
                });
                url = `${API_BASE}/question/random?${params.toString()}`;
            }

            const res = await fetch(url);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to fetch question.');
            }

            const data = await res.json();
            renderQuestion(data);
        } catch (err) {
            loadingState.classList.add('hidden');
            errorState.classList.remove('hidden');
            errorMessage.textContent = err.message || 'No questions found for the selected filters.';
        }
    }

    // --- Render Question Data ---
    function renderQuestion(data) {
        currentQuestion = data;
        const meta = data.meta || {};

        // Track recently seen
        if (meta.external_id && !recentQuestionIds.includes(meta.external_id)) {
            recentQuestionIds.push(meta.external_id);
            if (recentQuestionIds.length > 50) recentQuestionIds.shift();
        }

        // Meta tags
        metaSubject.textContent = meta.subjectLabel || (meta.subject === 'rw' ? 'Reading & Writing' : 'Math');
        metaDomain.textContent = meta.domainDesc || 'General';
        metaSkill.textContent = meta.skillDesc || '';
        
        metaDifficulty.textContent = meta.difficultyLabel || 'Medium';
        metaDifficulty.className = `badge badge-difficulty ${meta.difficulty === 'E' ? 'easy' : meta.difficulty === 'H' ? 'hard' : 'medium'}`;

        if (metaFormat) {
            if (data.type === 'spr') {
                metaFormat.textContent = '✏️ Free Response';
                metaFormat.classList.remove('hidden');
            } else {
                metaFormat.classList.add('hidden');
            }
        }

        if (meta.isLiveItem) {
            metaPracticeTag.classList.remove('hidden');
        } else {
            metaPracticeTag.classList.add('hidden');
        }

        if (metaQid) {
            metaQid.textContent = `ID: ${meta.questionId || meta.external_id.slice(0, 8)}`;
        }

        updateBookmarkButtonsState();

        if (matchingCountText && meta.matchingCount !== undefined) {
            matchingCountText.textContent = `${meta.matchingCount.toLocaleString()} items matching filters`;
        }

        // Stimulus (Passage)
        const hasStimulus = data.stimulus && data.stimulus.trim().length > 0;
        if (hasStimulus) {
            stimulusPanel.classList.remove('hidden');
            questionGrid.classList.add('has-stimulus');
            stimulusContent.innerHTML = cleanQuestionHtml(data.stimulus);
        } else {
            stimulusPanel.classList.add('hidden');
            questionGrid.classList.remove('has-stimulus');
            stimulusContent.innerHTML = '';
        }

        // Stem
        stemContent.innerHTML = cleanQuestionHtml(data.stem || '');

        // Desmos Graphing Calculator availability (Math only)
        const isMath = data.meta?.subject === 'math';
        setDesmosAvailability(isMath);
        resetRoughPadForNewQuestion();

        // Options or SPR
        if (data.type === 'spr') {
            optionsContainer.classList.add('hidden');
            sprContainer.classList.remove('hidden');
        } else {
            sprContainer.classList.add('hidden');
            optionsContainer.classList.remove('hidden');

            // Render MCQ Options
            optionsContainer.innerHTML = '';
            (data.options || []).forEach(opt => {
                const card = document.createElement('div');
                card.className = 'option-card';
                card.dataset.letter = opt.letter;

                card.innerHTML = `
                    <div class="option-letter">${opt.letter}</div>
                    <div class="option-body">${cleanQuestionHtml(opt.content)}</div>
                `;

                card.addEventListener('click', () => {
                    if (isSubmitted) return;
                    selectOption(opt.letter);
                });

                optionsContainer.appendChild(card);
            });
        }

        // Rationale
        const rawRationale = data.rationale ? data.rationale.trim() : '';
        const cleanRationale = (rawRationale.length > 10)
            ? rawRationale
            : `<p>The correct answer is <strong>${escapeHtml((data.correctAnswer || []).join(', ') || 'indicated above')}</strong>. Detailed explanation was not published by College Board for this item.</p>`;
        rationaleContent.innerHTML = cleanQuestionHtml(cleanRationale);

        loadingState.classList.add('hidden');
        questionView.classList.remove('hidden');

        triggerMathJax();
    }

    // --- Option Selection ---
    function selectOption(letter) {
        if (testSession.active && !testSession.isReviewMode) {
            testSession.answers[testSession.currentIndex] = letter;
            const allCards = optionsContainer.querySelectorAll('.option-card');
            allCards.forEach(card => {
                if (card.dataset.letter === letter) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            });
            updateTestFooterStatus();
            return;
        }

        selectedOption = letter;
        const allCards = optionsContainer.querySelectorAll('.option-card');
        allCards.forEach(card => {
            if (card.dataset.letter === letter) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        setActionButtonsText('Check Answer', false);
    }

    // --- Submit Answer Evaluation ---
    function submitAnswer() {
        if (!currentQuestion || isSubmitted) return;

        let isCorrect = false;
        const correctAnswers = currentQuestion.correctAnswer || [];

        if (currentQuestion.type === 'spr') {
            const userVal = sprInput.value.trim();
            if (!userVal) {
                sprInput.focus();
                return;
            }

            isCorrect = checkSprAnswer(userVal, correctAnswers);

            sprFeedback.classList.remove('hidden');
            if (isCorrect) {
                sprFeedback.className = 'spr-feedback correct';
                sprFeedback.innerHTML = `<strong>✓ Correct!</strong> You answered: <code>${escapeHtml(userVal)}</code>`;
            } else {
                sprFeedback.className = 'spr-feedback wrong';
                sprFeedback.innerHTML = `<strong>✗ Incorrect.</strong> Accepted answers: <code>${correctAnswers.join(', ')}</code>`;
            }
        } else {
            // MCQ
            if (!selectedOption) return;

            const primaryCorrect = correctAnswers[0] || '';
            isCorrect = selectedOption.toUpperCase() === primaryCorrect.toUpperCase();

            const allCards = optionsContainer.querySelectorAll('.option-card');
            allCards.forEach(card => {
                card.classList.add('submitted');
                const cardLetter = card.dataset.letter;

                if (cardLetter.toUpperCase() === primaryCorrect.toUpperCase()) {
                    card.classList.add('correct');
                    const badge = document.createElement('span');
                    badge.className = 'option-status-badge';
                    badge.textContent = '✓ Correct';
                    card.appendChild(badge);
                } else if (cardLetter === selectedOption && !isCorrect) {
                    card.classList.add('wrong');
                    const badge = document.createElement('span');
                    badge.className = 'option-status-badge';
                    badge.textContent = '✗ Your Answer';
                    card.appendChild(badge);
                }
            });
        }

        isSubmitted = true;

        // Update stats
        stats.attempted++;
        if (isCorrect) {
            stats.correct++;
            stats.streak++;
            if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
            rationaleResultBadge.textContent = '✓ Correct (+1)';
            rationaleResultBadge.className = 'rationale-badge correct';
        } else {
            stats.streak = 0;
            rationaleResultBadge.textContent = '✗ Incorrect';
            rationaleResultBadge.className = 'rationale-badge wrong';
        }

        // Record Practice History
        const userAnswerVal = currentQuestion.type === 'spr' ? sprInput.value.trim() : (selectedOption || '');
        const acceptedAnswerVal = Array.isArray(correctAnswers) ? correctAnswers.join(', ') : String(correctAnswers || '');
        recordHistory('answer', {
            isCorrect,
            userAnswer: userAnswerVal,
            correctAnswer: acceptedAnswerVal
        });

        updateStatsDisplay();

        // Dispatch telemetry & Google Analytics
        sendTelemetry('answer', {
            subject: currentQuestion.meta?.subject,
            difficulty: currentQuestion.meta?.difficulty,
            correct: isCorrect
        });

        // Reveal Rationale
        rationaleCard.classList.remove('hidden');
        rationaleCard.classList.remove('collapsed');
        if (btnJumpRationale) btnJumpRationale.classList.remove('hidden');
        triggerMathJax();

        // Smooth auto-scroll to bring the full explanation directly into view on PC & mobile
        setTimeout(() => {
            if (promptPanel && promptPanel.scrollHeight > promptPanel.clientHeight) {
                const panelRect = promptPanel.getBoundingClientRect();
                const cardRect = rationaleCard.getBoundingClientRect();
                const targetScrollTop = promptPanel.scrollTop + (cardRect.top - panelRect.top) - 16;
                promptPanel.scrollTop = Math.max(0, targetScrollTop);
            } else {
                rationaleCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);

        // Switch Action Button to "Next"
        setActionButtonsText('Next Question →', false);
    }

    // --- SPR Numeric & Fraction Evaluation ---
    function checkSprAnswer(userInput, acceptedList) {
        const cleanUser = userInput.trim().toLowerCase();

        // 1. Direct string match
        if (acceptedList.some(ans => ans.trim().toLowerCase() === cleanUser)) {
            return true;
        }

        // 2. Numeric evaluation (for fractions vs decimals, e.g. 3/4 == 0.75)
        const parseValue = (str) => {
            if (str.includes('/')) {
                const parts = str.split('/');
                if (parts.length === 2) {
                    const num = parseFloat(parts[0]);
                    const den = parseFloat(parts[1]);
                    if (den !== 0 && !isNaN(num) && !isNaN(den)) return num / den;
                }
            }
            const val = parseFloat(str);
            return isNaN(val) ? null : val;
        };

        const userNum = parseValue(cleanUser);
        if (userNum !== null) {
            for (const acc of acceptedList) {
                const accNum = parseValue(acc);
                if (accNum !== null && Math.abs(userNum - accNum) < 0.001) {
                    return true;
                }
            }
        }

        return false;
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }

    function cleanQuestionHtml(html) {
        if (!html || typeof html !== 'string') return '';
        return html
            .replace(/<span[^>]*class=["'][^"']*sr-only[^"']*["'][^>]*>\s*blank\s*<\/span>/gi, '')
            .replace(/\bblank\s*(<span[^>]*>)?______/gi, '$1______')
            .replace(/______\s*(<\/span>)?\s*\bblank\b/gi, '______$1');
    }

    // --- Bookmarks Helpers ---
    function isCurrentBookmarked() {
        if (!currentQuestion) return false;
        const id = currentQuestion.meta?.external_id;
        return bookmarks.some(b => b.external_id === id);
    }

    function updateBookmarkButtonsState() {
        const bookmarked = isCurrentBookmarked();

        if (btnToggleBookmark) {
            if (bookmarked) {
                btnToggleBookmark.classList.add('active');
                btnToggleBookmark.title = 'Remove bookmark';
            } else {
                btnToggleBookmark.classList.remove('active');
                btnToggleBookmark.title = 'Save this question';
            }
        }

        if (btnMobileBookmark) {
            if (bookmarked) {
                btnMobileBookmark.classList.add('active');
            } else {
                btnMobileBookmark.classList.remove('active');
            }
        }
    }

    function toggleBookmark() {
        if (!currentQuestion) return;
        const id = currentQuestion.meta?.external_id;
        const idx = bookmarks.findIndex(b => b.external_id === id);

        if (idx >= 0) {
            bookmarks.splice(idx, 1);
        } else {
            bookmarks.push({
                external_id: id,
                questionId: currentQuestion.meta?.questionId,
                subject: currentQuestion.meta?.subjectLabel,
                domain: currentQuestion.meta?.domainDesc,
                difficulty: currentQuestion.meta?.difficultyLabel,
                savedAt: Date.now()
            });
        }

        try {
            localStorage.setItem('sat_quizzer_bookmarks', JSON.stringify(bookmarks));
        } catch (e) {}

        updateStatsDisplay();
        updateBookmarkButtonsState();
        renderBookmarksList();
    }

    function renderBookmarksList() {
        if (bookmarks.length === 0) {
            bookmarksList.innerHTML = '<p class="empty-state">No questions saved yet. Click the bookmark icon 🔖 on any question to review it later.</p>';
            return;
        }

        bookmarksList.innerHTML = '';
        bookmarks.slice().reverse().forEach(item => {
            const row = document.createElement('div');
            row.className = 'bookmark-item';
            row.innerHTML = `
                <div class="bookmark-info">
                    <span class="bookmark-title">ID: ${item.questionId || item.external_id.slice(0, 8)} (${item.subject || 'SAT'})</span>
                    <span class="bookmark-meta">${item.domain || ''} &bull; ${item.difficulty || ''}</span>
                </div>
                <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;">Open</button>
            `;

            row.addEventListener('click', () => {
                bookmarksModal.classList.add('hidden');
                loadNextQuestion(item.external_id);
            });

            bookmarksList.appendChild(row);
        });
    }

    // --- Practice History Helpers ---
    function recordHistory(type, data) {
        if (!currentQuestion || !currentQuestion.meta) return;
        const meta = currentQuestion.meta;
        const id = meta.external_id;
        if (!id) return;

        const entry = {
            external_id: id,
            questionId: meta.questionId || id.slice(0, 8),
            subject: meta.subject || 'rw',
            subjectLabel: meta.subjectLabel || (meta.subject === 'math' ? 'Math' : 'Reading & Writing'),
            domain: meta.domainDesc || meta.domainCode || 'General',
            difficulty: meta.difficultyLabel || (meta.difficulty === 'H' ? 'Hard' : (meta.difficulty === 'M' ? 'Medium' : 'Easy')),
            difficultyCode: meta.difficulty || 'M',
            format: currentQuestion.type || meta.format || 'mcq',
            isSkipped: type === 'skip',
            isCorrect: Boolean(data.isCorrect),
            userAnswer: data.userAnswer || (type === 'skip' ? 'Skipped' : ''),
            correctAnswer: data.correctAnswer || '',
            timestamp: Date.now()
        };

        // Add to beginning of history array (newest first)
        history.unshift(entry);

        // Cap at 200 items max (~25 KB)
        if (history.length > 200) {
            history = history.slice(0, 200);
        }

        try {
            localStorage.setItem('sat_quizzer_history', JSON.stringify(history));
        } catch (e) {}

        updateStatsDisplay();
    }

    function formatRelativeTime(ts) {
        if (!ts) return '';
        const diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        const d = new Date(ts);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    function renderHistoryList() {
        if (!historyList) return;

        // Calculate counts
        const total = history.length;
        const correctCount = history.filter(h => h.isCorrect).length;
        const skippedCount = history.filter(h => h.isSkipped).length;
        const incorrectCount = history.filter(h => !h.isCorrect && !h.isSkipped).length;
        const answeredCount = correctCount + incorrectCount;
        const accuracyPct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

        // Update summary bar
        if (histStatAttempted) histStatAttempted.textContent = total;
        if (histStatAccuracy) histStatAccuracy.textContent = `${accuracyPct}%`;
        if (histStatCorrect) histStatCorrect.textContent = correctCount;
        if (histStatIncorrect) histStatIncorrect.textContent = incorrectCount;
        if (histStatSkipped) histStatSkipped.textContent = skippedCount;

        // Update tab count badges
        if (histTabAllCount) histTabAllCount.textContent = total;
        if (histTabCorrectCount) histTabCorrectCount.textContent = correctCount;
        if (histTabIncorrectCount) histTabIncorrectCount.textContent = incorrectCount;
        if (histTabSkippedCount) histTabSkippedCount.textContent = skippedCount;
        if (historyTotalCount) historyTotalCount.textContent = total;

        // Filter items
        let filtered = history;
        if (currentHistoryFilter === 'correct') {
            filtered = history.filter(h => h.isCorrect);
        } else if (currentHistoryFilter === 'incorrect') {
            filtered = history.filter(h => !h.isCorrect && !h.isSkipped);
        } else if (currentHistoryFilter === 'skipped') {
            filtered = history.filter(h => h.isSkipped);
        }

        if (filtered.length === 0) {
            const emptyMsgs = {
                all: 'No questions answered yet. As you solve questions, your history and rationales will appear here.',
                correct: 'No correct answers recorded yet in this filter.',
                incorrect: 'No incorrect answers recorded yet in this filter.',
                skipped: 'No skipped questions recorded yet in this filter.'
            };
            historyList.innerHTML = `<p class="empty-state">${emptyMsgs[currentHistoryFilter] || 'No items found.'}</p>`;
            return;
        }

        historyList.innerHTML = '';
        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'history-item';

            let statusClass = 'status-correct';
            let statusText = '✓ Correct';
            if (item.isSkipped) {
                statusClass = 'status-skipped';
                statusText = '⏭️ Skipped';
            } else if (!item.isCorrect) {
                statusClass = 'status-incorrect';
                statusText = '✗ Incorrect';
            }

            const diffCode = (item.difficultyCode || 'M').toLowerCase();

            card.innerHTML = `
                <div class="history-item-left">
                    <div class="history-top-row">
                        <span class="history-status-pill ${statusClass}">${statusText}</span>
                        <span class="history-q-id">ID: ${escapeHtml(item.questionId || '')}</span>
                        <span class="history-diff-badge diff-${diffCode}">${escapeHtml(item.difficulty || '')}</span>
                    </div>
                    <div class="history-meta">
                        <span>${escapeHtml(item.subjectLabel || '')}</span>
                        <span class="history-sep">•</span>
                        <span>${escapeHtml(item.domain || '')}</span>
                    </div>
                    <div class="history-answers">
                        <span>Your: <strong class="${item.isCorrect ? 'text-green' : (item.isSkipped ? 'text-muted' : 'text-danger')}">${escapeHtml(item.userAnswer || '-')}</strong></span>
                        ${!item.isCorrect && !item.isSkipped ? `<span class="history-sep">•</span><span>Correct: <strong class="text-green">${escapeHtml(item.correctAnswer || '-')}</strong></span>` : ''}
                    </div>
                </div>
                <div class="history-item-right">
                    <span class="history-time">${formatRelativeTime(item.timestamp)}</span>
                    <button class="btn btn-secondary history-review-btn">Review ↗</button>
                </div>
            `;

            card.addEventListener('click', () => {
                if (historyModal) historyModal.classList.add('hidden');
                loadNextQuestion(item.external_id);
            });

            historyList.appendChild(card);
        });
    }

    // --- Subject Filter Sync ---
    function setSubjectFilter(subj) {
        filters.subject = subj;

        // Sync Desktop Pills
        desktopSubjectPills.forEach(p => {
            if (p.dataset.subject === subj) p.classList.add('active');
            else p.classList.remove('active');
        });

        // Sync Mobile Pills
        mobileSubjectPills.forEach(p => {
            if (p.dataset.subject === subj) p.classList.add('active');
            else p.classList.remove('active');
        });

        populateDomainDropdowns();
        saveFilterPrefs();
        updateStatsDisplay();
    }

    function saveFilterPrefs() {
        try {
            localStorage.setItem('sat_quizzer_filters', JSON.stringify(filters));
        } catch (e) {}
    }

    // --- Event Listeners ---

    // Desktop Subject Pills
    desktopSubjectPills.forEach(pill => {
        pill.addEventListener('click', () => {
            setSubjectFilter(pill.dataset.subject);
            loadNextQuestion();
        });
    });

    // Mobile Subject Pills
    mobileSubjectPills.forEach(pill => {
        pill.addEventListener('click', () => {
            setSubjectFilter(pill.dataset.subject);
        });
    });

    // Desktop Filters
    if (filterDifficulty) {
        filterDifficulty.addEventListener('change', () => {
            filters.difficulty = filterDifficulty.value;
            if (mobileFilterDifficulty) mobileFilterDifficulty.value = filters.difficulty;
            saveFilterPrefs();
            loadNextQuestion();
        });
    }

    if (filterFormat) {
        filterFormat.addEventListener('change', () => {
            filters.format = filterFormat.value;
            if (mobileFilterFormat) mobileFilterFormat.value = filters.format;
            if (filters.format === 'spr' && filters.subject === 'rw') {
                setSubjectFilter('math');
            }
            saveFilterPrefs();
            loadNextQuestion();
        });
    }

    if (filterDomain) {
        filterDomain.addEventListener('change', () => {
            filters.domain = filterDomain.value;
            if (mobileFilterDomain) mobileFilterDomain.value = filters.domain;
            saveFilterPrefs();
            loadNextQuestion();
        });
    }

    if (filterExcludeActive) {
        filterExcludeActive.addEventListener('change', () => {
            filters.excludeActive = filterExcludeActive.checked;
            if (mobileFilterExcludeActive) mobileFilterExcludeActive.checked = filters.excludeActive;
            saveFilterPrefs();
            loadNextQuestion();
        });
    }

    // Mobile Filter Drawer Controls
    if (btnMobileFilters) {
        btnMobileFilters.addEventListener('click', () => {
            mobileFilterDrawer.classList.remove('hidden');
        });
    }

    if (btnCloseDrawer) {
        btnCloseDrawer.addEventListener('click', () => {
            mobileFilterDrawer.classList.add('hidden');
        });
    }

    if (mobileFilterDrawer) {
        mobileFilterDrawer.addEventListener('click', (e) => {
            if (e.target === mobileFilterDrawer) {
                mobileFilterDrawer.classList.add('hidden');
            }
        });
    }

    if (btnApplyDrawer) {
        btnApplyDrawer.addEventListener('click', () => {
            if (mobileFilterDifficulty) filters.difficulty = mobileFilterDifficulty.value;
            if (mobileFilterFormat) filters.format = mobileFilterFormat.value;
            if (mobileFilterDomain) filters.domain = mobileFilterDomain.value;
            if (mobileFilterExcludeActive) filters.excludeActive = mobileFilterExcludeActive.checked;

            if (filters.format === 'spr' && filters.subject === 'rw') {
                setSubjectFilter('math');
            }

            if (filterDifficulty) filterDifficulty.value = filters.difficulty;
            if (filterFormat) filterFormat.value = filters.format;
            if (filterDomain) filterDomain.value = filters.domain;
            if (filterExcludeActive) filterExcludeActive.checked = filters.excludeActive;

            saveFilterPrefs();
            mobileFilterDrawer.classList.add('hidden');
            loadNextQuestion();
        });
    }

    function sendTelemetry(type, data = {}) {
        try {
            fetch(`${API_BASE}/telemetry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, ...data })
            }).catch(() => {});

            if (typeof window.gtag === 'function') {
                if (type === 'answer') {
                    window.gtag('event', 'sat_question_answered', {
                        subject: data.subject || 'mixed',
                        difficulty: data.difficulty || 'M',
                        is_correct: data.correct
                    });
                } else if (type === 'skip') {
                    window.gtag('event', 'sat_question_skipped', {
                        subject: data.subject || 'mixed'
                    });
                }
            }
        } catch (e) {}
    }

    function handleSkip() {
        if (currentQuestion && !isSubmitted) {
            const correctAnswers = currentQuestion.correctAnswer || [];
            const acceptedAnswerVal = Array.isArray(correctAnswers) ? correctAnswers.join(', ') : String(correctAnswers || '');
            recordHistory('skip', {
                isCorrect: false,
                userAnswer: 'Skipped',
                correctAnswer: acceptedAnswerVal
            });
        }
        sendTelemetry('skip', { subject: currentQuestion?.meta?.subject });
        loadNextQuestion();
    }

    // Action Handlers
    function handleMainAction() {
        if (!isSubmitted) {
            submitAnswer();
        } else {
            loadNextQuestion();
        }
    }

    // Desktop Buttons
    if (btnAction) btnAction.addEventListener('click', handleMainAction);
    if (btnSkip) btnSkip.addEventListener('click', handleSkip);
    if (btnJumpRationale) {
        btnJumpRationale.addEventListener('click', () => {
            rationaleCard.classList.remove('collapsed');
            if (promptPanel && promptPanel.scrollHeight > promptPanel.clientHeight) {
                const panelRect = promptPanel.getBoundingClientRect();
                const cardRect = rationaleCard.getBoundingClientRect();
                const targetScrollTop = promptPanel.scrollTop + (cardRect.top - panelRect.top) - 16;
                promptPanel.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
            } else {
                rationaleCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
    if (rationaleToggle) {
        rationaleToggle.addEventListener('click', () => {
            rationaleCard.classList.toggle('collapsed');
        });
    }

    // Mobile Bottom Taskbar Buttons
    if (btnMobileAction) btnMobileAction.addEventListener('click', handleMainAction);
    if (btnMobileSkip) btnMobileSkip.addEventListener('click', handleSkip);
    if (btnMobileBookmark) btnMobileBookmark.addEventListener('click', toggleBookmark);

    // SPR Input
    if (btnSubmitSpr) btnSubmitSpr.addEventListener('click', submitAnswer);
    if (sprInput) {
        sprInput.addEventListener('input', () => {
            if (testSession.active && !testSession.isReviewMode) {
                testSession.answers[testSession.currentIndex] = sprInput.value.trim();
                updateTestFooterStatus();
                return;
            }
            const hasText = sprInput.value.trim().length > 0;
            setActionButtonsText('Check Answer', !hasText);
        });
        sprInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (!isSubmitted) submitAnswer();
                else loadNextQuestion();
            }
        });
    }

    if (btnRetry) btnRetry.addEventListener('click', () => loadNextQuestion());

    // Copy Question ID
    if (btnCopyId) {
        btnCopyId.addEventListener('click', () => {
            if (currentQuestion?.meta?.external_id) {
                navigator.clipboard.writeText(currentQuestion.meta.external_id).then(() => {
                    btnCopyId.textContent = '✓';
                    setTimeout(() => btnCopyId.textContent = '📋', 1200);
                });
            }
        });
    }

    // Bookmark Toggle
    if (btnToggleBookmark) btnToggleBookmark.addEventListener('click', toggleBookmark);

    // Bookmarks Modal
    if (btnBookmarks) {
        btnBookmarks.addEventListener('click', () => {
            renderBookmarksList();
            bookmarksModal.classList.remove('hidden');
        });
    }
    if (btnMobileBookmarks) {
        btnMobileBookmarks.addEventListener('click', () => {
            renderBookmarksList();
            bookmarksModal.classList.remove('hidden');
        });
    }
    if (btnCloseModal) btnCloseModal.addEventListener('click', () => bookmarksModal.classList.add('hidden'));
    if (bookmarksModal) {
        bookmarksModal.addEventListener('click', (e) => {
            if (e.target === bookmarksModal) bookmarksModal.classList.add('hidden');
        });
    }

    // Practice History Modal Listeners
    if (btnHistory) {
        btnHistory.addEventListener('click', () => {
            renderHistoryList();
            if (historyModal) historyModal.classList.remove('hidden');
        });
    }
    if (btnMobileHistory) {
        btnMobileHistory.addEventListener('click', () => {
            renderHistoryList();
            if (historyModal) historyModal.classList.remove('hidden');
        });
    }
    if (btnCloseHistory) {
        btnCloseHistory.addEventListener('click', () => {
            if (historyModal) historyModal.classList.add('hidden');
        });
    }
    if (historyModal) {
        historyModal.addEventListener('click', (e) => {
            if (e.target === historyModal) historyModal.classList.add('hidden');
        });
    }

    // History Filter Tabs
    if (historyTabs) {
        historyTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                historyTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentHistoryFilter = tab.dataset.filter || 'all';
                renderHistoryList();
            });
        });
    }

    // Export History
    if (btnExportHistory) {
        btnExportHistory.addEventListener('click', () => {
            if (history.length === 0) {
                alert('No practice history to export yet.');
                return;
            }
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
            const downloadAnchor = document.createElement('a');
            const dateStr = new Date().toISOString().slice(0, 10);
            downloadAnchor.setAttribute('href', dataStr);
            downloadAnchor.setAttribute('download', `openboard-sat-history-${dateStr}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });
    }

    // Reset Accuracy & Session Score (Start from 0/0)
    function resetAccuracyScore() {
        if (stats.attempted === 0 && stats.correct === 0) {
            alert('Session score is already at 0/0 (0%).');
            return;
        }

        if (confirm(`Reset session accuracy and score counter (${stats.correct}/${stats.attempted}) back to 0/0?`)) {
            stats.attempted = 0;
            stats.correct = 0;
            try {
                localStorage.setItem('sat_quizzer_stats', JSON.stringify(stats));
            } catch (e) {}
            updateStatsDisplay();
        }
    }

    if (btnResetAccuracy) {
        btnResetAccuracy.addEventListener('click', (e) => {
            e.stopPropagation();
            resetAccuracyScore();
        });
    }
    if (accuracyBox) {
        accuracyBox.addEventListener('click', resetAccuracyScore);
    }
    if (mobileAccuracyChip) {
        mobileAccuracyChip.addEventListener('click', resetAccuracyScore);
    }
    if (btnResetAccuracyModal) {
        btnResetAccuracyModal.addEventListener('click', resetAccuracyScore);
    }

    // Clear History
    if (btnClearHistory) {
        btnClearHistory.addEventListener('click', () => {
            if (history.length === 0 && stats.attempted === 0) return;
            if (confirm('Clear your entire practice history and reset your session score back to 0/0? This cannot be undone.')) {
                history = [];
                stats.attempted = 0;
                stats.correct = 0;
                stats.streak = 0;
                try {
                    localStorage.removeItem('sat_quizzer_history');
                    localStorage.setItem('sat_quizzer_stats', JSON.stringify(stats));
                } catch (e) {}
                renderHistoryList();
                updateStatsDisplay();
            }
        });
    }

    // Legal Disclaimer Modal
    if (btnOpenDisclaimer && disclaimerModal) {
        btnOpenDisclaimer.addEventListener('click', () => disclaimerModal.classList.remove('hidden'));
    }
    if (btnCloseDisclaimer && disclaimerModal) {
        btnCloseDisclaimer.addEventListener('click', () => disclaimerModal.classList.add('hidden'));
    }
    if (disclaimerModal) {
        disclaimerModal.addEventListener('click', (e) => {
            if (e.target === disclaimerModal) disclaimerModal.classList.add('hidden');
        });
    }

    // ══════════════════════════════════════════════════════════════
    // PRACTICE TEST SIMULATION & BLUEBOOK ENVIRONMENT ENGINE
    // ══════════════════════════════════════════════════════════════

    function closeAllModals() {
        const modals = [
            bookmarksModal,
            historyModal,
            disclaimerModal,
            mobileFilterDrawer,
            testLauncherModal,
            testNavModal,
            testReviewModal,
            testResultsModal
        ];
        modals.forEach(m => {
            if (m) m.classList.add('hidden');
        });
    }

    function openTestLauncher() {
        if (testSession.active && !testSession.isSubmitted) {
            activateTestUI();
            return;
        }
        closeAllModals();
        if (testLauncherModal) testLauncherModal.classList.remove('hidden');
    }

    function calculateScaledScore(preset, rawScore, totalQuestions) {
        if (totalQuestions <= 0) return 200;
        const pct = rawScore / totalQuestions;

        // Reading & Writing 27 Questions (College Board conversion curve)
        if (preset === 'rw_module' && totalQuestions === 27) {
            const rwCurve = [
                200, 220, 240, 260, 280, 310, 330, 350, 370, 400,
                420, 440, 470, 490, 520, 540, 570, 590, 620, 640,
                670, 690, 710, 740, 760, 780, 790, 800
            ];
            return rwCurve[rawScore] !== undefined ? rwCurve[rawScore] : Math.round(pct * 600 + 200);
        }

        // Math 22 Questions (College Board conversion curve)
        if (preset === 'math_module' && totalQuestions === 22) {
            const mathCurve = [
                200, 220, 240, 270, 300, 330, 360, 390, 420, 450,
                480, 510, 540, 570, 600, 630, 660, 690, 720, 750,
                770, 790, 800
            ];
            return mathCurve[rawScore] !== undefined ? mathCurve[rawScore] : Math.round(pct * 600 + 200);
        }

        // Generic / Custom Module (scaled 200 to 800 in 10-point increments)
        const scaled = 200 + Math.round(pct * 60) * 10;
        return Math.min(800, Math.max(200, scaled));
    }

    async function startPracticeTest(preset, options = {}) {
        loadingState.classList.remove('hidden');
        errorState.classList.add('hidden');
        questionView.classList.add('hidden');
        closeAllModals();

        let url = `${API_BASE}/test/generate?preset=${encodeURIComponent(preset)}`;
        if (options.subject) url += `&subject=${encodeURIComponent(options.subject)}`;
        if (options.count) url += `&count=${encodeURIComponent(options.count)}`;
        if (options.timeMinutes !== undefined) url += `&timeMinutes=${encodeURIComponent(options.timeMinutes)}`;
        if (options.difficulty) url += `&difficulty=${encodeURIComponent(options.difficulty)}`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to generate practice test.');
            const data = await res.json();

            if (!data.questions || data.questions.length === 0) {
                throw new Error('No questions received for test module.');
            }

            testSession = {
                active: true,
                preset: data.preset || preset,
                title: data.title || 'Digital SAT Practice Module',
                questions: data.questions,
                currentIndex: 0,
                answers: {},
                flags: {},
                startTime: Date.now(),
                timeLimitSeconds: data.timeLimitSeconds || 0,
                timeRemaining: data.timeLimitSeconds || 0,
                timerInterval: null,
                timerHidden: false,
                isSubmitted: false,
                isReviewMode: false,
                results: null
            };

            activateTestUI();
            startTestCountdown();
            renderTestQuestion(0);
        } catch (err) {
            loadingState.classList.add('hidden');
            errorState.classList.remove('hidden');
            errorMessage.textContent = err.message || 'Error generating test. Please try again.';
        }
    }

    function activateTestUI() {
        document.body.classList.add('test-mode-active');
        if (headerDrillWrap) headerDrillWrap.classList.add('hidden');
        if (testHud) testHud.classList.remove('hidden');
        if (testReviewHud) testReviewHud.classList.add('hidden');
        document.querySelectorAll('.filter-bar').forEach(el => el.classList.add('hidden'));

        if (footerDrillWrap) footerDrillWrap.classList.add('hidden');
        if (footerTestWrap) footerTestWrap.classList.remove('hidden');

        // Mobile
        if (document.getElementById('mobile-top-bar')) document.getElementById('mobile-top-bar').classList.add('hidden');
        if (mobileTestTopBar) mobileTestTopBar.classList.remove('hidden');
        if (mobileDrillTaskbar) mobileDrillTaskbar.classList.add('hidden');
        if (mobileTestTaskbar) mobileTestTaskbar.classList.remove('hidden');

        if (btnModeDrill) btnModeDrill.classList.remove('active');
        if (btnModeTest) btnModeTest.classList.add('active');

        if (testHudTitle) testHudTitle.textContent = testSession.title || 'SAT Practice Module';
    }

    function exitTestToDrillMode(force = false) {
        if (!force && testSession.active && !testSession.isSubmitted) {
            const ok = confirm('Exit this practice test? Your current progress and unanswered questions will be discarded.');
            if (!ok) return;
        }

        stopTestCountdown();
        testSession.active = false;
        testSession.isReviewMode = false;
        document.body.classList.remove('test-mode-active');

        if (headerDrillWrap) headerDrillWrap.classList.remove('hidden');
        if (testHud) testHud.classList.add('hidden');
        if (testReviewHud) testReviewHud.classList.add('hidden');
        document.querySelectorAll('.filter-bar').forEach(el => el.classList.remove('hidden'));

        if (footerDrillWrap) footerDrillWrap.classList.remove('hidden');
        if (footerTestWrap) footerTestWrap.classList.add('hidden');

        // Mobile
        if (document.getElementById('mobile-top-bar')) document.getElementById('mobile-top-bar').classList.remove('hidden');
        if (mobileTestTopBar) mobileTestTopBar.classList.add('hidden');
        if (mobileDrillTaskbar) mobileDrillTaskbar.classList.remove('hidden');
        if (mobileTestTaskbar) mobileTestTaskbar.classList.add('hidden');

        if (btnModeDrill) btnModeDrill.classList.add('active');
        if (btnModeTest) btnModeTest.classList.remove('active');

        closeAllModals();
        loadNextQuestion();
    }

    function startTestCountdown() {
        stopTestCountdown();
        if (testSession.timeLimitSeconds <= 0) {
            if (testTimerDisplay) testTimerDisplay.textContent = 'Untimed';
            if (mobileTestTimerDisplay) mobileTestTimerDisplay.textContent = 'Untimed';
            return;
        }

        updateTestTimerDisplay();
        testSession.timerInterval = setInterval(() => {
            if (testSession.timeRemaining > 0) {
                testSession.timeRemaining--;
                updateTestTimerDisplay();

                if (testSession.timeRemaining === 300) {
                    alert('⏱️ 5 Minutes Remaining in this module.');
                }

                if (testSession.timeRemaining === 0) {
                    stopTestCountdown();
                    alert('⏱️ Time is up! Your module answers are now being submitted and scored.');
                    submitPracticeTest();
                }
            } else {
                stopTestCountdown();
            }
        }, 1000);
    }

    function stopTestCountdown() {
        if (testSession.timerInterval) {
            clearInterval(testSession.timerInterval);
            testSession.timerInterval = null;
        }
    }

    function updateTestTimerDisplay() {
        if (testSession.timeLimitSeconds <= 0) return;
        const totalSecs = Math.max(0, testSession.timeRemaining);
        const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
        const secs = (totalSecs % 60).toString().padStart(2, '0');
        const formatted = `${mins}:${secs}`;

        const displayText = testSession.timerHidden ? '--:--' : formatted;

        if (testTimerDisplay) testTimerDisplay.textContent = displayText;
        if (mobileTestTimerDisplay) mobileTestTimerDisplay.textContent = displayText;

        if (testTimerBox) {
            testTimerBox.classList.toggle('timer-warning', totalSecs <= 300 && totalSecs > 60);
            testTimerBox.classList.toggle('timer-critical', totalSecs <= 60);
        }
    }

    function toggleTestTimerVisibility() {
        testSession.timerHidden = !testSession.timerHidden;
        if (btnTestTimerHide) {
            btnTestTimerHide.textContent = testSession.timerHidden ? 'Show' : 'Hide';
        }
        updateTestTimerDisplay();
    }

    function toggleTestFlag() {
        if (!testSession.active && !testSession.isReviewMode) return;
        const idx = testSession.currentIndex;
        testSession.flags[idx] = !testSession.flags[idx];

        const isFlagged = Boolean(testSession.flags[idx]);
        if (btnTestFlag) {
            btnTestFlag.classList.toggle('flagged', isFlagged);
            if (testFlagText) testFlagText.textContent = isFlagged ? 'Flagged 🚩' : 'Mark for Review';
        }
        if (btnMobileTestFlag) {
            btnMobileTestFlag.classList.toggle('flagged', isFlagged);
        }
        updateTestFooterStatus();
    }

    function renderTestQuestion(index) {
        if (!testSession.active && !testSession.isReviewMode) return;
        if (index < 0 || index >= testSession.questions.length) return;

        testSession.currentIndex = index;
        const q = testSession.questions[index];
        currentQuestion = q;

        if (promptPanel) promptPanel.scrollTop = 0;
        if (stimulusContent) stimulusContent.scrollTop = 0;
        window.scrollTo({ top: 0, behavior: 'instant' });

        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');
        questionView.classList.remove('hidden');

        if (metaSubject) metaSubject.textContent = q.subjectLabel || (q.subject === 'rw' ? 'Reading & Writing' : 'Math');
        if (metaDomain) metaDomain.textContent = q.domainDesc || 'General';
        if (metaSkill) metaSkill.textContent = q.skillDesc || '';
        if (metaDifficulty) {
            metaDifficulty.textContent = q.difficultyLabel || 'Medium';
            metaDifficulty.className = `badge badge-difficulty ${q.difficulty === 'E' ? 'easy' : q.difficulty === 'H' ? 'hard' : 'medium'}`;
        }
        if (metaFormat) {
            if (q.type === 'spr') {
                metaFormat.textContent = '✏️ Free Response';
                metaFormat.classList.remove('hidden');
            } else {
                metaFormat.classList.add('hidden');
            }
        }
        if (metaPracticeTag) metaPracticeTag.classList.add('hidden');
        if (metaQid) metaQid.textContent = `ID: ${q.questionId || (q.external_id ? q.external_id.slice(0, 8) : '----')}`;

        const hasStimulus = q.stimulus && q.stimulus.trim().length > 0;
        if (hasStimulus) {
            stimulusPanel.classList.remove('hidden');
            questionGrid.classList.add('has-stimulus');
            stimulusContent.innerHTML = cleanQuestionHtml(q.stimulus);
        } else {
            stimulusPanel.classList.add('hidden');
            questionGrid.classList.remove('has-stimulus');
            stimulusContent.innerHTML = '';
        }

        stemContent.innerHTML = cleanQuestionHtml(q.stem || '');

        const isMath = q.subject === 'math';
        setDesmosAvailability(isMath);
        if (btnMobileTestCalc) btnMobileTestCalc.classList.toggle('hidden', !isMath);
        resetRoughPadForNewQuestion();

        const isFlagged = Boolean(testSession.flags[index]);
        if (btnTestFlag) {
            btnTestFlag.classList.toggle('flagged', isFlagged);
            if (testFlagText) testFlagText.textContent = isFlagged ? 'Flagged 🚩' : 'Mark for Review';
        }
        if (btnMobileTestFlag) {
            btnMobileTestFlag.classList.toggle('flagged', isFlagged);
        }

        if (testSession.isReviewMode) {
            renderReviewQuestionContent(q, index);
        } else {
            renderActiveTestQuestionContent(q, index);
        }

        updateTestNavigationState(index);
        triggerMathJax();
    }

    function renderActiveTestQuestionContent(q, index) {
        rationaleCard.classList.add('hidden');
        if (btnJumpRationale) btnJumpRationale.classList.add('hidden');

        if (q.type === 'spr') {
            optionsContainer.classList.add('hidden');
            sprContainer.classList.remove('hidden');
            sprFeedback.classList.add('hidden');
            sprInput.value = testSession.answers[index] || '';
            sprInput.disabled = false;
        } else {
            sprContainer.classList.add('hidden');
            optionsContainer.classList.remove('hidden');
            optionsContainer.innerHTML = '';

            const currentAns = testSession.answers[index] || null;

            (q.options || []).forEach(opt => {
                const card = document.createElement('div');
                card.className = 'option-card';
                if (currentAns === opt.letter) {
                    card.classList.add('selected');
                }
                card.dataset.letter = opt.letter;
                card.innerHTML = `
                    <div class="option-letter">${opt.letter}</div>
                    <div class="option-body">${cleanQuestionHtml(opt.content)}</div>
                `;

                card.addEventListener('click', () => {
                    selectOption(opt.letter);
                });

                optionsContainer.appendChild(card);
            });
        }
    }

    function renderReviewQuestionContent(q, index) {
        const studentAns = testSession.answers[index] || '';
        const correctAnswers = q.correctAnswer || [];
        const primaryCorrect = correctAnswers[0] || '';

        let isCorrect = false;
        if (q.type === 'spr') {
            isCorrect = checkSprAnswer(studentAns, correctAnswers);
            optionsContainer.classList.add('hidden');
            sprContainer.classList.remove('hidden');
            sprInput.value = studentAns;
            sprInput.disabled = true;

            sprFeedback.classList.remove('hidden');
            if (!studentAns) {
                sprFeedback.className = 'spr-feedback wrong';
                sprFeedback.innerHTML = `<strong>⚪ Unanswered.</strong> Accepted answers: <code>${correctAnswers.join(', ')}</code>`;
            } else if (isCorrect) {
                sprFeedback.className = 'spr-feedback correct';
                sprFeedback.innerHTML = `<strong>✓ Correct!</strong> You answered: <code>${escapeHtml(studentAns)}</code>`;
            } else {
                sprFeedback.className = 'spr-feedback wrong';
                sprFeedback.innerHTML = `<strong>✗ Incorrect.</strong> You answered: <code>${escapeHtml(studentAns)}</code> &bull; Accepted: <code>${correctAnswers.join(', ')}</code>`;
            }
        } else {
            isCorrect = Boolean(studentAns && studentAns.toUpperCase() === primaryCorrect.toUpperCase());
            sprContainer.classList.add('hidden');
            optionsContainer.classList.remove('hidden');
            optionsContainer.innerHTML = '';

            (q.options || []).forEach(opt => {
                const card = document.createElement('div');
                card.className = 'option-card submitted';

                if (opt.letter.toUpperCase() === primaryCorrect.toUpperCase()) {
                    card.classList.add('correct');
                    card.innerHTML = `
                        <div class="option-letter">${opt.letter}</div>
                        <div class="option-body">${cleanQuestionHtml(opt.content)}</div>
                        <span class="option-status-badge">✓ Correct</span>
                    `;
                } else if (opt.letter === studentAns && !isCorrect) {
                    card.classList.add('wrong');
                    card.innerHTML = `
                        <div class="option-letter">${opt.letter}</div>
                        <div class="option-body">${cleanQuestionHtml(opt.content)}</div>
                        <span class="option-status-badge">✗ Your Answer</span>
                    `;
                } else {
                    card.innerHTML = `
                        <div class="option-letter">${opt.letter}</div>
                        <div class="option-body">${cleanQuestionHtml(opt.content)}</div>
                    `;
                }

                optionsContainer.appendChild(card);
            });
        }

        if (reviewQuestionLabel) reviewQuestionLabel.textContent = `Question ${index + 1} of ${testSession.questions.length}`;
        if (reviewStatusChip) {
            if (!studentAns) {
                reviewStatusChip.className = 'review-status-chip unanswered';
                reviewStatusChip.textContent = '⚪ Unanswered';
            } else if (isCorrect) {
                reviewStatusChip.className = 'review-status-chip correct';
                reviewStatusChip.textContent = '✓ Correct';
            } else {
                reviewStatusChip.className = 'review-status-chip wrong';
                reviewStatusChip.textContent = '✗ Incorrect';
            }
        }

        rationaleCard.classList.remove('hidden');
        rationaleCard.classList.remove('collapsed');
        if (rationaleResultBadge) {
            rationaleResultBadge.className = `rationale-badge ${isCorrect ? 'correct' : 'wrong'}`;
            rationaleResultBadge.textContent = isCorrect ? '✓ Correct' : (!studentAns ? '⚪ Unanswered' : '✗ Incorrect');
        }
        const rawRationale = q.rationale ? q.rationale.trim() : '';
        const cleanRationale = (rawRationale.length > 10)
            ? rawRationale
            : `<p>The correct answer is <strong>${escapeHtml(correctAnswers.join(', ') || 'indicated above')}</strong>. Detailed explanation was not published by College Board for this item.</p>`;
        rationaleContent.innerHTML = cleanQuestionHtml(cleanRationale);
        if (btnJumpRationale) btnJumpRationale.classList.remove('hidden');
    }

    function updateTestNavigationState(index) {
        const total = testSession.questions.length;
        const currentNum = index + 1;

        if (testNavBtnText) testNavBtnText.textContent = `Question ${currentNum} of ${total}`;
        if (testFooterQnum) testFooterQnum.textContent = `Question ${currentNum} of ${total}`;
        if (mobileTestQnum) mobileTestQnum.textContent = `${currentNum} / ${total}`;

        if (btnTestPrev) btnTestPrev.disabled = (index === 0);
        if (btnMobileTestPrev) btnMobileTestPrev.disabled = (index === 0);

        const isLast = (index === total - 1);
        if (btnTestNext) {
            btnTestNext.textContent = isLast ? 'Review Module →' : 'Next →';
        }
        if (btnMobileTestNext) {
            btnMobileTestNext.textContent = isLast ? 'Review →' : 'Next →';
        }

        updateTestFooterStatus();
    }

    function updateTestFooterStatus() {
        if (!testSession.active && !testSession.isReviewMode) return;
        const idx = testSession.currentIndex;
        const hasAnswer = testSession.answers[idx] !== undefined && testSession.answers[idx] !== '';
        const isFlagged = Boolean(testSession.flags[idx]);

        if (testFooterStatus) {
            if (isFlagged && hasAnswer) testFooterStatus.textContent = 'Answered (Flagged 🚩)';
            else if (isFlagged) testFooterStatus.textContent = 'Flagged 🚩';
            else if (hasAnswer) testFooterStatus.textContent = 'Answered ✓';
            else testFooterStatus.textContent = 'Unanswered';
        }
    }

    function openTestNavigator() {
        if (!testSession.active && !testSession.isReviewMode) return;
        if (!testNavGrid) return;
        testNavGrid.innerHTML = '';

        testSession.questions.forEach((q, i) => {
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = 'nav-grid-pill';
            pill.textContent = String(i + 1);

            if (i === testSession.currentIndex) pill.classList.add('current');
            if (testSession.answers[i] !== undefined && testSession.answers[i] !== '') pill.classList.add('answered');
            if (testSession.flags[i]) pill.classList.add('flagged');

            pill.addEventListener('click', () => {
                testNavModal.classList.add('hidden');
                renderTestQuestion(i);
            });

            testNavGrid.appendChild(pill);
        });

        testNavModal.classList.remove('hidden');
    }

    function openTestReviewModal() {
        if (!testSession.active || testSession.isSubmitted) return;
        const total = testSession.questions.length;
        const answeredCount = Object.keys(testSession.answers).filter(k => testSession.answers[k] !== undefined && testSession.answers[k] !== '').length;
        const unansweredCount = total - answeredCount;
        const flaggedCount = Object.keys(testSession.flags).filter(k => testSession.flags[k]).length;

        if (reviewStatTotal) reviewStatTotal.textContent = total;
        if (reviewStatAnswered) reviewStatAnswered.textContent = answeredCount;
        if (reviewStatUnanswered) reviewStatUnanswered.textContent = unansweredCount;
        if (reviewStatFlagged) reviewStatFlagged.textContent = flaggedCount;

        if (unansweredAlert) {
            unansweredAlert.classList.toggle('hidden', unansweredCount === 0);
        }

        if (testReviewGrid) {
            testReviewGrid.innerHTML = '';
            testSession.questions.forEach((q, i) => {
                const pill = document.createElement('button');
                pill.type = 'button';
                pill.className = 'nav-grid-pill';
                pill.textContent = String(i + 1);

                if (i === testSession.currentIndex) pill.classList.add('current');
                if (testSession.answers[i] !== undefined && testSession.answers[i] !== '') pill.classList.add('answered');
                if (testSession.flags[i]) pill.classList.add('flagged');

                pill.addEventListener('click', () => {
                    testReviewModal.classList.add('hidden');
                    renderTestQuestion(i);
                });

                testReviewGrid.appendChild(pill);
            });
        }

        testReviewModal.classList.remove('hidden');
    }

    function submitPracticeTest() {
        stopTestCountdown();
        testSession.isSubmitted = true;
        closeAllModals();

        let rawScore = 0;
        const total = testSession.questions.length;
        const questionResults = [];
        const domainStats = {};

        testSession.questions.forEach((q, i) => {
            const studentAns = testSession.answers[i] || '';
            const correctAnswers = q.correctAnswer || [];
            let isCorrect = false;

            if (q.type === 'spr') {
                isCorrect = checkSprAnswer(studentAns, correctAnswers);
            } else {
                const primaryCorrect = (correctAnswers[0] || '').toUpperCase();
                isCorrect = Boolean(studentAns && studentAns.toUpperCase() === primaryCorrect);
            }

            if (isCorrect) rawScore++;

            const dCode = q.domainCode || 'OTHER';
            const dName = q.domainDesc || 'General';
            if (!domainStats[dCode]) {
                domainStats[dCode] = { code: dCode, name: dName, total: 0, correct: 0 };
            }
            domainStats[dCode].total++;
            if (isCorrect) domainStats[dCode].correct++;

            questionResults.push({
                index: i + 1,
                external_id: q.external_id,
                questionId: q.questionId,
                subject: q.subject,
                subjectLabel: q.subjectLabel,
                domainCode: q.domainCode,
                domainDesc: q.domainDesc,
                skillDesc: q.skillDesc,
                difficulty: q.difficulty,
                difficultyLabel: q.difficultyLabel,
                type: q.type,
                userAnswer: studentAns,
                correctAnswer: correctAnswers.join(', '),
                isCorrect,
                isUnanswered: !studentAns
            });
        });

        const accuracyPct = total > 0 ? Math.round((rawScore / total) * 100) : 0;
        const timeSpent = testSession.timeLimitSeconds > 0
            ? Math.max(1, testSession.timeLimitSeconds - testSession.timeRemaining)
            : Math.max(1, Math.round((Date.now() - testSession.startTime) / 1000));
        const avgSeconds = Math.round(timeSpent / total);
        const scaledScore = calculateScaledScore(testSession.preset, rawScore, total);

        const resultsData = {
            id: `test_result_${Date.now()}`,
            title: testSession.title,
            preset: testSession.preset,
            scaledScore,
            rawScore,
            total,
            accuracyPct,
            timeSpentSeconds: timeSpent,
            avgSecondsPerQ: avgSeconds,
            domainBreakdown: Object.values(domainStats).map(d => ({
                ...d,
                pct: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0
            })),
            questionResults,
            completedAt: Date.now()
        };

        testSession.results = resultsData;

        try {
            let saved = JSON.parse(localStorage.getItem('sat_practice_tests') || '[]');
            if (!Array.isArray(saved)) saved = [];
            saved.unshift(resultsData);
            if (saved.length > 50) saved = saved.slice(0, 50);
            localStorage.setItem('sat_practice_tests', JSON.stringify(saved));
        } catch (e) {}

        displayTestResults(resultsData);
    }

    function displayTestResults(r) {
        if (resultScaledScore) resultScaledScore.textContent = r.scaledScore;
        if (resultRawScore) resultRawScore.textContent = `${r.rawScore} / ${r.total}`;
        if (resultAccuracy) resultAccuracy.textContent = `${r.accuracyPct}%`;
        if (resultTimeSpent) {
            const m = Math.floor(r.timeSpentSeconds / 60);
            const s = r.timeSpentSeconds % 60;
            resultTimeSpent.textContent = `${m}m ${s < 10 ? '0' : ''}${s}s`;
        }
        if (resultPacing) resultPacing.textContent = `${r.avgSecondsPerQ}s`;

        if (resultDomainBars) {
            resultDomainBars.innerHTML = '';
            r.domainBreakdown.forEach(d => {
                const row = document.createElement('div');
                row.className = 'domain-bar-row';
                row.innerHTML = `
                    <div class="domain-bar-header">
                        <span class="domain-bar-name">${escapeHtml(d.name)} (${d.code})</span>
                        <span class="domain-bar-stat">${d.correct}/${d.total} (${d.pct}%)</span>
                    </div>
                    <div class="domain-bar-track">
                        <div class="domain-bar-fill" style="width: ${d.pct}%;"></div>
                    </div>
                `;
                resultDomainBars.appendChild(row);
            });
        }

        if (resultMatrixTbody) {
            resultMatrixTbody.innerHTML = '';
            r.questionResults.forEach((q, idx) => {
                const tr = document.createElement('tr');
                let statusBadge = '';
                if (q.isUnanswered) {
                    statusBadge = '<span class="review-status-chip unanswered">⚪ Unanswered</span>';
                } else if (q.isCorrect) {
                    statusBadge = '<span class="review-status-chip correct">✓ Correct</span>';
                } else {
                    statusBadge = '<span class="review-status-chip wrong">✗ Incorrect</span>';
                }

                tr.innerHTML = `
                    <td><strong>#${q.index}</strong></td>
                    <td>${statusBadge}</td>
                    <td><strong class="${q.isCorrect ? 'text-green' : (q.isUnanswered ? 'text-muted' : 'text-danger')}">${escapeHtml(q.userAnswer || '-')}</strong></td>
                    <td><strong class="text-green">${escapeHtml(q.correctAnswer)}</strong></td>
                    <td>${escapeHtml(q.domainDesc || q.domainCode)}</td>
                    <td><span class="badge badge-difficulty ${q.difficulty === 'E' ? 'easy' : q.difficulty === 'H' ? 'hard' : 'medium'}">${escapeHtml(q.difficultyLabel)}</span></td>
                    <td><button type="button" class="matrix-row-btn" data-qidx="${idx}">Inspect Solution ↗</button></td>
                `;

                tr.querySelector('.matrix-row-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    enterReviewMode(idx);
                });

                resultMatrixTbody.appendChild(tr);
            });
        }

        testResultsModal.classList.remove('hidden');
    }

    function enterReviewMode(questionIndex = 0) {
        testResultsModal.classList.add('hidden');
        testSession.isReviewMode = true;

        if (headerDrillWrap) headerDrillWrap.classList.add('hidden');
        if (testHud) testHud.classList.add('hidden');
        if (testReviewHud) testReviewHud.classList.remove('hidden');

        renderTestQuestion(questionIndex);
    }

    function exportTestResultsJSON() {
        if (!testSession.results) return;
        const blob = new Blob([JSON.stringify(testSession.results, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `openboard-sat-test-score-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // --- Practice Test Event Listeners ---
    if (btnModeDrill) {
        btnModeDrill.addEventListener('click', () => {
            if (testSession.active && !testSession.isSubmitted) {
                exitTestToDrillMode();
            } else {
                exitTestToDrillMode(true);
            }
        });
    }

    if (btnModeTest) {
        btnModeTest.addEventListener('click', openTestLauncher);
    }

    if (btnMobileTestLaunch) {
        btnMobileTestLaunch.addEventListener('click', openTestLauncher);
    }

    if (btnCloseLauncher && testLauncherModal) {
        btnCloseLauncher.addEventListener('click', () => testLauncherModal.classList.add('hidden'));
    }

    if (testLauncherModal) {
        testLauncherModal.addEventListener('click', (e) => {
            if (e.target === testLauncherModal) testLauncherModal.classList.add('hidden');
        });
    }

    let miniSelectedSubj = 'all';
    const miniPills = document.querySelectorAll('.pill-mini');
    miniPills.forEach(p => {
        p.addEventListener('click', () => {
            miniPills.forEach(el => el.classList.remove('active'));
            p.classList.add('active');
            miniSelectedSubj = p.dataset.miniSubj || 'all';
        });
    });

    document.querySelectorAll('.btn-start-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            if (preset === 'rw_module') {
                startPracticeTest('rw_module');
            } else if (preset === 'math_module') {
                startPracticeTest('math_module');
            } else if (preset === 'mini') {
                startPracticeTest('mini', { subject: miniSelectedSubj });
            } else if (preset === 'custom') {
                const s = document.getElementById('custom-test-subject')?.value || 'all';
                const c = document.getElementById('custom-test-count')?.value || '20';
                const t = document.getElementById('custom-test-time')?.value || '30';
                const d = document.getElementById('custom-test-diff')?.value || 'all';
                startPracticeTest('custom', { subject: s, count: c, timeMinutes: t, difficulty: d });
            }
        });
    });

    if (btnTestFlag) btnTestFlag.addEventListener('click', toggleTestFlag);
    if (btnMobileTestFlag) btnMobileTestFlag.addEventListener('click', toggleTestFlag);
    if (btnTestTimerHide) btnTestTimerHide.addEventListener('click', toggleTestTimerVisibility);
    if (btnOpenNav) btnOpenNav.addEventListener('click', openTestNavigator);
    if (btnMobileOpenNav) btnMobileOpenNav.addEventListener('click', openTestNavigator);
    if (btnTestExit) btnTestExit.addEventListener('click', () => exitTestToDrillMode());
    if (btnMobileTestExit) btnMobileTestExit.addEventListener('click', () => exitTestToDrillMode());

    if (btnTestPrev) {
        btnTestPrev.addEventListener('click', () => {
            if (testSession.currentIndex > 0) renderTestQuestion(testSession.currentIndex - 1);
        });
    }
    if (btnMobileTestPrev) {
        btnMobileTestPrev.addEventListener('click', () => {
            if (testSession.currentIndex > 0) renderTestQuestion(testSession.currentIndex - 1);
        });
    }

    if (btnTestNext) {
        btnTestNext.addEventListener('click', () => {
            if (testSession.currentIndex < testSession.questions.length - 1) {
                renderTestQuestion(testSession.currentIndex + 1);
            } else {
                openTestReviewModal();
            }
        });
    }
    if (btnMobileTestNext) {
        btnMobileTestNext.addEventListener('click', () => {
            if (testSession.currentIndex < testSession.questions.length - 1) {
                renderTestQuestion(testSession.currentIndex + 1);
            } else {
                openTestReviewModal();
            }
        });
    }

    if (btnTestFooterNav) btnTestFooterNav.addEventListener('click', openTestNavigator);
    if (btnMobileTestNavChip) btnMobileTestNavChip.addEventListener('click', openTestNavigator);
    if (btnTestOpenReview) btnTestOpenReview.addEventListener('click', openTestReviewModal);

    if (btnCloseNav && testNavModal) btnCloseNav.addEventListener('click', () => testNavModal.classList.add('hidden'));
    if (btnNavClose && testNavModal) btnNavClose.addEventListener('click', () => testNavModal.classList.add('hidden'));
    if (btnNavToReview) {
        btnNavToReview.addEventListener('click', () => {
            if (testNavModal) testNavModal.classList.add('hidden');
            openTestReviewModal();
        });
    }
    if (testNavModal) {
        testNavModal.addEventListener('click', (e) => {
            if (e.target === testNavModal) testNavModal.classList.add('hidden');
        });
    }

    if (btnCloseReview && testReviewModal) btnCloseReview.addEventListener('click', () => testReviewModal.classList.add('hidden'));
    if (btnReturnToTest && testReviewModal) btnReturnToTest.addEventListener('click', () => testReviewModal.classList.add('hidden'));
    if (btnSubmitTestFinal) btnSubmitTestFinal.addEventListener('click', submitPracticeTest);
    if (testReviewModal) {
        testReviewModal.addEventListener('click', (e) => {
            if (e.target === testReviewModal) testReviewModal.classList.add('hidden');
        });
    }

    if (btnCloseResults && testResultsModal) btnCloseResults.addEventListener('click', () => testResultsModal.classList.add('hidden'));
    if (testResultsModal) {
        testResultsModal.addEventListener('click', (e) => {
            if (e.target === testResultsModal) testResultsModal.classList.add('hidden');
        });
    }
    if (btnExportTestReport) btnExportTestReport.addEventListener('click', exportTestResultsJSON);
    if (btnReviewAllQuestions) btnReviewAllQuestions.addEventListener('click', () => enterReviewMode(0));
    if (btnRetakeNewTest) {
        btnRetakeNewTest.addEventListener('click', () => {
            testResultsModal.classList.add('hidden');
            openTestLauncher();
        });
    }

    if (btnReviewScoreReport) {
        btnReviewScoreReport.addEventListener('click', () => {
            if (testSession.results) displayTestResults(testSession.results);
        });
    }
    if (btnReviewExit) {
        btnReviewExit.addEventListener('click', () => exitTestToDrillMode(true));
    }

    if (btnMobileTestCalc) btnMobileTestCalc.addEventListener('click', toggleDesmos);
    if (btnMobileTestPad) btnMobileTestPad.addEventListener('click', toggleRoughPad);

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        const isInputActive = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

        // Allow Enter in SPR input to submit or proceed
        if (document.activeElement === sprInput && e.key === 'Enter') {
            e.preventDefault();
            if (testSession.active && !testSession.isReviewMode) {
                if (testSession.currentIndex < testSession.questions.length - 1) {
                    renderTestQuestion(testSession.currentIndex + 1);
                } else {
                    openTestReviewModal();
                }
            } else {
                handleMainAction();
            }
            return;
        }

        // If user is typing in any input, ignore global shortcuts
        if (isInputActive) return;

        const key = e.key.toUpperCase();

        // Active Test Mode Shortcuts
        if (testSession.active) {
            if (['A', 'B', 'C', 'D'].includes(key) && currentQuestion?.type !== 'spr') {
                selectOption(key);
                return;
            }

            if (key === 'M' || key === 'F') {
                toggleTestFlag();
                return;
            }

            if (e.key === 'ArrowRight') {
                if (testSession.currentIndex < testSession.questions.length - 1) {
                    renderTestQuestion(testSession.currentIndex + 1);
                } else if (!testSession.isReviewMode) {
                    openTestReviewModal();
                }
                return;
            }

            if (e.key === 'ArrowLeft') {
                if (testSession.currentIndex > 0) {
                    renderTestQuestion(testSession.currentIndex - 1);
                }
                return;
            }

            if (key === 'N' || key === 'G') {
                openTestNavigator();
                return;
            }

            if (e.key === 'Escape') {
                closeAllModals();
                closeDesmos();
                closeRoughPad();
                return;
            }

            return;
        }

        // Drill Mode Shortcuts
        if (['A', 'B', 'C', 'D'].includes(key) && !isSubmitted && currentQuestion?.type !== 'spr') {
            selectOption(key);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            handleMainAction();
            return;
        }

        if (key === 'S' && !isSubmitted) {
            handleSkip();
            return;
        }

        if (key === 'F' || key === 'B') {
            toggleBookmark();
            return;
        }

        if (key === 'H') {
            renderHistoryList();
            if (historyModal) historyModal.classList.toggle('hidden');
            return;
        }

        if (e.key === 'Escape') {
            closeAllModals();
            closeDesmos();
            closeRoughPad();
        }
    });

    // --- Init App ---
    function init() {
        const urlParams = new URLSearchParams(window.location.search);
        const qidParam = urlParams.get('qid') || urlParams.get('id');
        const modeParam = urlParams.get('mode');
        const formatParam = urlParams.get('format') || urlParams.get('type');
        if (formatParam && ['spr', 'mcq', 'all'].includes(formatParam.toLowerCase())) {
            filters.format = formatParam.toLowerCase();
            if (filters.format === 'spr' && filters.subject === 'rw') {
                filters.subject = 'math';
            }
        }
        const subjParam = urlParams.get('subject');
        if (subjParam && ['all', 'rw', 'math'].includes(subjParam.toLowerCase())) {
            filters.subject = subjParam.toLowerCase();
        }

        setSubjectFilter(filters.subject || 'all');

        if (filterDifficulty) filterDifficulty.value = filters.difficulty || 'all';
        if (mobileFilterDifficulty) mobileFilterDifficulty.value = filters.difficulty || 'all';

        if (filterFormat) filterFormat.value = filters.format || 'all';
        if (mobileFilterFormat) mobileFilterFormat.value = filters.format || 'all';

        if (filterExcludeActive) filterExcludeActive.checked = filters.excludeActive !== false;
        if (mobileFilterExcludeActive) mobileFilterExcludeActive.checked = filters.excludeActive !== false;

        updateStatsDisplay();
        startTimer();
        initDesmos();
        initRoughPad();

        loadFiltersCatalog().then(() => {
            if (modeParam === 'test') {
                openTestLauncher();
            } else {
                loadNextQuestion(qidParam);
            }
        });
    }

    init();
})();
