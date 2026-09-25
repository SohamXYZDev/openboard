const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

const CACHE_DIR = path.join(__dirname, 'cache');
const QUESTIONS_CACHE_DIR = path.join(CACHE_DIR, 'questions');
const INDEX_FILE = path.join(CACHE_DIR, 'index.json');
const ANALYTICS_FILE = path.join(CACHE_DIR, 'analytics.json');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
if (!fs.existsSync(QUESTIONS_CACHE_DIR)) fs.mkdirSync(QUESTIONS_CACHE_DIR, { recursive: true });

// --- Telemetry & Analytics State ---
let analytics = {
    totalPageViews: 0,
    totalQuestionsAnswered: 0,
    totalQuestionsSkipped: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    subjectBreakdown: { rw: 0, math: 0 },
    uniqueVisitors: {}, // { hash: timestamp }
    dailyStats: {}, // { 'YYYY-MM-DD': { views: 0, answers: 0, corrects: 0, uniques: 0 } }
    recentEvents: [],
    referrers: {}
};

try {
    if (fs.existsSync(ANALYTICS_FILE)) {
        const data = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
        analytics = { ...analytics, ...data };
    }
} catch (e) {
    console.warn('[Analytics] Starting with fresh analytics data.');
}

function saveAnalytics() {
    try {
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
    } catch (e) {}
}

// Pageview Tracker Middleware
app.use((req, res, next) => {
    if (req.method === 'GET' && (req.path === '/' || req.path.startsWith('/sat') || req.path.startsWith('/openboard') || req.path === '/index.html')) {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        const ua = req.headers['user-agent'] || '';
        const ref = req.headers['referer'] || 'Direct';
        const hash = crypto.createHash('sha256').update(`${ip}-${ua}`).digest('hex').slice(0, 16);
        const today = new Date().toISOString().slice(0, 10);

        analytics.totalPageViews++;
        analytics.uniqueVisitors[hash] = Date.now();

        if (!analytics.dailyStats[today]) {
            analytics.dailyStats[today] = { views: 0, answers: 0, corrects: 0, uniques: 0 };
        }
        analytics.dailyStats[today].views++;

        let refDomain = 'Direct';
        try {
            if (ref && ref !== 'Direct') {
                refDomain = new URL(ref).hostname || ref;
            }
        } catch (e) {}
        analytics.referrers[refDomain] = (analytics.referrers[refDomain] || 0) + 1;

        saveAnalytics();
    }
    next();
});
const staticOpts = { index: false, redirect: false };
app.use(express.static(path.join(__dirname, 'public'), staticOpts));
app.use('/sat', express.static(path.join(__dirname, 'public'), staticOpts));
app.use('/openboard/sat', express.static(path.join(__dirname, 'public'), staticOpts));
app.use('/openboard', express.static(path.join(__dirname, 'public'), staticOpts));

const LOOKUP_URL = 'https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/lookup';
const GET_QUESTIONS_URL = 'https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions';
const GET_QUESTION_URL = 'https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question';

let questionIndex = [];
let liveItemIds = new Set();
let domainInfo = {
    rw: [],
    math: []
};

function fixRelativeUrls(html) {
    if (!html || typeof html !== 'string') return html;
    return html
        .replace(/src=["'](\/[^"']+)["']/gi, 'src="https://satsuitequestionbank.collegeboard.org$1"')
        .replace(/<span[^>]*class=["'][^"']*sr-only[^"']*["'][^>]*>\s*blank\s*<\/span>/gi, '')
        .replace(/\bblank\s*(<span[^>]*>)?______/gi, '$1______')
        .replace(/______\s*(<\/span>)?\s*\bblank\b/gi, '______$1');
}

async function loadIndex() {
    try {
        if (fs.existsSync(INDEX_FILE)) {
            const cached = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
            if (cached.questions && cached.questions.length > 0) {
                console.log(`[Index] Loaded ${cached.questions.length} questions from local cache.`);
                questionIndex = cached.questions;
                liveItemIds = new Set(cached.liveItemIds || []);
                domainInfo = cached.domainInfo || domainInfo;
                return;
            }
        }
    } catch (e) {
        console.warn('[Index] Cache read error, refreshing from upstream...', e.message);
    }

    console.log('[Index] Fetching fresh question catalog from College Board...');
    try {
        const lookupRes = await fetch(LOOKUP_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const lookup = await lookupRes.json();

        const readingLive = lookup.readingLiveItems || [];
        const mathLive = lookup.mathLiveItems || [];
        liveItemIds = new Set([...readingLive, ...mathLive]);

        const rawDomains = lookup.lookupData?.domain || {};
        domainInfo.rw = (rawDomains['R&W'] || []).map(d => ({
            code: d.primaryClassCd,
            name: d.text,
            skills: (d.skill || []).map(s => s.text)
        }));
        domainInfo.math = (rawDomains['Math'] || []).map(d => ({
            code: d.primaryClassCd,
            name: d.text,
            skills: (d.skill || []).map(s => s.text)
        }));

        // Fetch RW questions
        const rwRes = await fetch(GET_QUESTIONS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
            body: JSON.stringify({ asmtEventId: 99, test: 1, domain: 'INI,CAS,EOI,SEC' })
        });
        const rwList = await rwRes.json();

        // Fetch Math questions
        const mathRes = await fetch(GET_QUESTIONS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
            body: JSON.stringify({ asmtEventId: 99, test: 2, domain: 'H,P,Q,S' })
        });
        const mathList = await mathRes.json();

        const processed = [];
        for (const q of rwList) {
            processed.push({
                external_id: q.external_id,
                questionId: q.questionId,
                subject: 'rw',
                domainCode: q.primary_class_cd,
                domainDesc: q.primary_class_cd_desc,
                skillCode: q.skill_cd,
                skillDesc: q.skill_desc,
                difficulty: q.difficulty,
                isLiveItem: liveItemIds.has(q.external_id)
            });
        }
        for (const q of mathList) {
            processed.push({
                external_id: q.external_id,
                questionId: q.questionId,
                subject: 'math',
                domainCode: q.primary_class_cd,
                domainDesc: q.primary_class_cd_desc,
                skillCode: q.skill_cd,
                skillDesc: q.skill_desc,
                difficulty: q.difficulty,
                isLiveItem: liveItemIds.has(q.external_id)
            });
        }

        questionIndex = processed;
        fs.writeFileSync(INDEX_FILE, JSON.stringify({
            updatedAt: Date.now(),
            liveItemIds: Array.from(liveItemIds),
            domainInfo,
            questions: questionIndex
        }, null, 2));

        console.log(`[Index] Successfully indexed ${questionIndex.length} questions (${rwList.length} R&W, ${mathList.length} Math).`);
    } catch (err) {
        console.error('[Index] Failed to initialize catalog:', err);
    }
}

async function getQuestionDetail(externalId) {
    const cachedPath = path.join(QUESTIONS_CACHE_DIR, `${externalId}.json`);
    if (fs.existsSync(cachedPath)) {
        try {
            return JSON.parse(fs.readFileSync(cachedPath, 'utf8'));
        } catch (e) {}
    }

    const res = await fetch(GET_QUESTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ external_id: externalId })
    });
    if (!res.ok) {
        throw new Error(`Upstream error ${res.status}`);
    }
    const data = await res.json();
    fs.writeFileSync(cachedPath, JSON.stringify(data));
    return data;
}

// --- APIs ---

// 1. Filter counts
app.get(['/api/filters', '/openboard/sat/api/filters', '/openboard/api/filters', '/sat/api/filters'], (req, res) => {
    const diffCounts = { E: 0, M: 0, H: 0 };
    const subjectCounts = { rw: 0, math: 0 };
    const formatCounts = { all: questionIndex.length, spr: 0, mcq: 0 };
    for (const q of questionIndex) {
        if (diffCounts[q.difficulty] !== undefined) diffCounts[q.difficulty]++;
        if (subjectCounts[q.subject] !== undefined) subjectCounts[q.subject]++;
        if (q.type === 'spr') formatCounts.spr++;
        else if (q.type === 'mcq') formatCounts.mcq++;
    }

    res.json({
        total: questionIndex.length,
        subjectCounts,
        diffCounts,
        formatCounts,
        domainInfo,
        activePracticeItemsCount: liveItemIds.size
    });
});

// 2. Client Telemetry
app.post(['/api/telemetry', '/openboard/sat/api/telemetry', '/openboard/api/telemetry', '/sat/api/telemetry'], (req, res) => {
    const { type, subject, correct, difficulty } = req.body || {};
    const today = new Date().toISOString().slice(0, 10);
    if (!analytics.dailyStats[today]) {
        analytics.dailyStats[today] = { views: 0, answers: 0, corrects: 0, uniques: 0 };
    }

    if (type === 'answer') {
        analytics.totalQuestionsAnswered++;
        analytics.dailyStats[today].answers = (analytics.dailyStats[today].answers || 0) + 1;
        if (correct) {
            analytics.totalCorrect++;
            analytics.dailyStats[today].corrects = (analytics.dailyStats[today].corrects || 0) + 1;
        } else {
            analytics.totalIncorrect++;
        }
        if (subject && analytics.subjectBreakdown[subject] !== undefined) {
            analytics.subjectBreakdown[subject]++;
        }
        analytics.recentEvents.unshift({
            type: 'answer',
            subject: subject || 'mixed',
            correct: !!correct,
            difficulty: difficulty || 'M',
            time: Date.now()
        });
        if (analytics.recentEvents.length > 40) analytics.recentEvents.pop();
    } else if (type === 'skip') {
        analytics.totalQuestionsSkipped++;
        analytics.recentEvents.unshift({
            type: 'skip',
            subject: subject || 'mixed',
            time: Date.now()
        });
        if (analytics.recentEvents.length > 40) analytics.recentEvents.pop();
    }

    saveAnalytics();
    res.json({ ok: true });
});

// 3. Analytics stats API
app.get(['/api/analytics', '/openboard/sat/api/analytics', '/openboard/api/analytics', '/sat/api/analytics'], (req, res) => {
    const totalUniques = Object.keys(analytics.uniqueVisitors).length;
    const today = new Date().toISOString().slice(0, 10);
    const todayStats = analytics.dailyStats[today] || { views: 0, answers: 0, corrects: 0 };
    const accuracy = analytics.totalQuestionsAnswered > 0
        ? Math.round((analytics.totalCorrect / analytics.totalQuestionsAnswered) * 100)
        : 0;

    res.json({
        totalPageViews: analytics.totalPageViews,
        totalUniqueVisitors: totalUniques,
        totalQuestionsAnswered: analytics.totalQuestionsAnswered,
        totalQuestionsSkipped: analytics.totalQuestionsSkipped,
        accuracy: `${accuracy}%`,
        subjectBreakdown: analytics.subjectBreakdown,
        today: {
            date: today,
            views: todayStats.views || 0,
            answers: todayStats.answers || 0,
            corrects: todayStats.corrects || 0
        },
        referrers: analytics.referrers,
        recentEvents: analytics.recentEvents.slice(0, 20)
    });
});

// 4. Random Question
app.get(['/api/question/random', '/openboard/sat/api/question/random', '/openboard/api/question/random', '/sat/api/question/random'], async (req, res) => {
    try {
        const { subject, domain, difficulty, format, excludeActive, excludeIds } = req.query;

        const excludeSet = new Set((excludeIds || '').split(',').map(s => s.trim()).filter(Boolean));

        const matchCandidate = (q, ignoreExclude = false) => {
            if (!ignoreExclude && excludeSet.has(q.external_id)) return false;
            if (excludeActive === 'true' && q.isLiveItem) return false;
            if (subject && subject !== 'all' && q.subject !== subject) return false;
            if (difficulty && difficulty !== 'all' && q.difficulty !== difficulty) return false;
            // Format filtering: SPR (Free Response) is Math only
            if (format === 'spr') {
                if (q.subject === 'rw') return false;
                if (q.type && q.type !== 'spr') return false;
            } else if (format === 'mcq') {
                if (q.type && q.type !== 'mcq') return false;
            }
            if (domain && domain !== 'all') {
                const domList = domain.split(',');
                if (!domList.includes(q.domainCode)) return false;
            }
            return true;
        };

        let candidates = questionIndex.filter(q => matchCandidate(q, false));

        // If candidates exhausted due to excludeIds, reset exclude set
        if (candidates.length === 0) {
            candidates = questionIndex.filter(q => matchCandidate(q, true));
        }

        if (candidates.length === 0) {
            return res.status(404).json({ error: 'No questions match the selected criteria.' });
        }

        let detail = null;
        let meta = null;
        for (let attempt = 0; attempt < 10 && candidates.length > 0; attempt++) {
            const randomIndex = Math.floor(Math.random() * candidates.length);
            meta = candidates[randomIndex];
            try {
                detail = await getQuestionDetail(meta.external_id);
                if (detail && (detail.stem || detail.stimulus)) {
                    if (format && format !== 'all' && detail.type && detail.type !== format) {
                        candidates.splice(randomIndex, 1);
                        continue;
                    }
                    break;
                }
            } catch (err) {
                console.warn(`[getQuestionDetail] Failed for ${meta.external_id}: ${err.message}. Retrying candidate...`);
                candidates.splice(randomIndex, 1);
            }
        }

        if (!detail) {
            return res.status(500).json({ error: 'Failed to retrieve question details from upstream.' });
        }

        const letters = ['A', 'B', 'C', 'D'];
        const options = (detail.answerOptions || []).map((opt, i) => ({
            id: opt.id,
            letter: letters[i] || String(i + 1),
            content: fixRelativeUrls(opt.content)
        }));

        res.json({
            meta: {
                ...meta,
                difficultyLabel: meta.difficulty === 'E' ? 'Easy' : meta.difficulty === 'M' ? 'Medium' : 'Hard',
                subjectLabel: meta.subject === 'rw' ? 'Reading & Writing' : 'Math',
                matchingCount: candidates.length,
                format: detail.type || meta.type || 'mcq'
            },
            type: detail.type || 'mcq',
            stimulus: fixRelativeUrls(detail.stimulus),
            stem: fixRelativeUrls(detail.stem),
            options,
            correctAnswer: detail.correct_answer || [],
            rationale: fixRelativeUrls(detail.rationale)
        });
    } catch (err) {
        console.error('Error fetching random question:', err);
        res.status(500).json({ error: 'Failed to retrieve question.' });
    }
});

// 5. Specific Question by external_id
app.get(['/api/question/:externalId', '/openboard/sat/api/question/:externalId', '/openboard/api/question/:externalId', '/sat/api/question/:externalId'], async (req, res) => {
    try {
        const { externalId } = req.params;
        const meta = questionIndex.find(q => q.external_id === externalId) || {};
        const detail = await getQuestionDetail(externalId);

        const letters = ['A', 'B', 'C', 'D'];
        const options = (detail.answerOptions || []).map((opt, i) => ({
            id: opt.id,
            letter: letters[i] || String(i + 1),
            content: fixRelativeUrls(opt.content)
        }));

        res.json({
            meta: {
                ...meta,
                difficultyLabel: meta.difficulty === 'E' ? 'Easy' : meta.difficulty === 'M' ? 'Medium' : 'Hard',
                subjectLabel: meta.subject === 'rw' ? 'Reading & Writing' : 'Math'
            },
            type: detail.type,
            stimulus: fixRelativeUrls(detail.stimulus),
            stem: fixRelativeUrls(detail.stem),
            options,
            correctAnswer: detail.correct_answer || [],
            rationale: fixRelativeUrls(detail.rationale)
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve question details.' });
    }
});

// 6. Stats Dashboard Route
app.get(['/stats', '/openboard/sat/stats', '/openboard/stats', '/sat/stats', '/analytics', '/sat/analytics', '/openboard/sat/analytics'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

// 7. DMCA & Copyright Policy
app.get(['/dmca', '/openboard/dmca', '/openboard/sat/dmca', '/sat/dmca'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dmca.html'));
});

// OpenBoard Selector Hub
app.get(['/', '/openboard', '/openboard/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'hub.html'));
});

// Digital SAT SPA Quizzer
app.get(['/openboard/sat', '/openboard/sat/', '/sat', '/sat/'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Default fallback
app.use((req, res) => {
    if (req.path.startsWith('/openboard/sat') || req.path.startsWith('/sat')) {
        return res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
    res.sendFile(path.join(__dirname, 'public', 'hub.html'));
});

loadIndex().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 OpenBoard (SAT) running on http://0.0.0.0:${PORT}`);
    });
});
