# 🎯 OpenBoard

> **Free, non-commercial, open-source multi-exam practice platform equipped with official test-maker items, integrated digital testing tools, and step-by-step rationales. Zero paywalls.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/Status-Active%20Development-purple.svg)](https://sohamxyz.com/openboard)
[![Open Source](https://img.shields.io/badge/Open%20Source-100%25%20Free-orange.svg)](https://github.com/SohamXYZDev/openboard)

🌐 **Live Platform Hub:** [sohamxyz.com/openboard](https://sohamxyz.com/openboard)  
🎯 **Digital SAT® Practice Module (Live):** [sohamxyz.com/openboard/sat](https://sohamxyz.com/openboard/sat)

---

## 📖 About OpenBoard

Standardized test preparation is overwhelmingly locked behind expensive paywalls, forced subscriptions, pay-per-test models, and intrusive ad-trackers.

**OpenBoard** was created to democratize exam preparation by building an open, distraction-free, zero-friction testing suite. It pairs official test-maker items with authentic test-day digital tools (like the embedded Desmos graphing calculator and digital scratchpads) so students worldwide can practice under real test conditions without financial barriers.

While starting with the **Digital SAT®**, OpenBoard is architected from the ground up as a unified multi-exam hub for college admissions, Advanced Placement (AP®), and graduate testing.

---

## 📚 Exam Modules & Roadmap

| Module | Category | Test Maker | Status | Key Features |
|---|---|---|---|---|
| **Digital SAT®** | College Admissions | College Board | 🟢 **Active / Live** | 3,770+ official questions, Reading & Writing + Math, official Desmos Graphing Calculator, Bluebook spoiler protection, local history & bookmarks |
| **ACT®** | College Admissions | ACT, Inc. | 🟡 **Coming Soon** | English, Math, Reading, and Science sections with timing benchmarks and passage-based analytics |
| **AP® Calculus (AB / BC)** | Advanced Placement | College Board | 🟡 **Coming Soon** | Unit-by-unit practice (Limits, Derivatives, Integrals, Series), calculator-active items, and Free-Response Question (FRQ) rubrics |
| **GRE® General** | Graduate Admissions | ETS | ⚪ **Planned** | Quantitative and Verbal reasoning practice banks with high-frequency vocabulary drills |

---

## ✨ Platform Core Features

Universal testing capabilities across OpenBoard modules:

- **100% Free & Frictionless:** No credit cards, no subscriptions, no forced account signups, and zero third-party ads.
- **Official Digital Testing Parity:** Direct Bluebook testing environment parity, including the official [Desmos Graphing Calculator API](https://www.desmos.com/api) engine.
- **Native Dual-Mode Rough Scratchpad:** Multi-color freehand drawing canvas and typed formula scratchpad side-by-side with questions.
- **Instant Scoring & Step-by-Step Rationales:** Immediate explanations, mathematical derivations, and option breakdown upon submission.
- **Local-First Privacy & History:** All practice history, question bookmarks, and custom filter configurations are stored locally on your device in `localStorage`. Includes full **JSON history export**.
- **Keyboard-Driven Workflow:** Fast desktop shortcuts (`A`/`B`/`C`/`D` to select, `Enter` to submit/advance, `S` to skip, `H` for history modal, `F` for filters).
- **Distraction-Free Engineering:** Pure vanilla JavaScript frontend with zero heavy framework bloat (no React/Next.js/Vue overhead), sub-100ms load times, and fluid mobile responsiveness.
- **Mathematical Rendering:** Powered by [MathJax 3](https://www.mathjax.org/) for crisp LaTeX and MathML formulas.

---

## 🛠️ Tech Stack & Architecture

- **Backend:** Node.js, Express (API proxies, telemetry, runtime upstream fetching)
- **Frontend:** Vanilla JavaScript (ES6+), Semantic HTML5, CSS3 Custom Properties (Dark theme design system)
- **Mathematical Formatting:** [MathJax 3](https://www.mathjax.org/) (LaTeX & MathML)
- **Graphing Calculator:** [Desmos API](https://www.desmos.com/api) (College Board configuration)
- **Data Architecture:** Local-first browser storage; dynamic proxy caching for seamless online practice

---

## 🚀 Getting Started (Running Locally)

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SohamXYZDev/openboard.git
   cd openboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application server:**
   ```bash
   npm start
   ```

4. **Open in your browser:**
   - **Platform Directory Hub:** [http://localhost:5050/openboard](http://localhost:5050/openboard)
   - **Digital SAT Practice Module:** [http://localhost:5050/openboard/sat](http://localhost:5050/openboard/sat)

---

## 📁 Repository Structure

```
openboard/
├── public/
│   ├── hub.html          # OpenBoard exam directory & module selector
│   ├── index.html        # Digital SAT practice application SPA
│   ├── dmca.html         # DMCA & copyright compliance policy page
│   ├── stats.html        # Telemetry & practice analytics dashboard
│   ├── app.js            # Client application logic, Desmos & Canvas integration
│   └── style.css         # Design system & dark theme stylesheets
├── server.js             # Express API server, proxy routing, and telemetry
├── package.json
├── LICENSE               # MIT License
└── README.md
```

---

## 🗺️ Project Roadmap

- [x] **Phase 1: Digital SAT® Engine**
  - [x] 3,770+ official question bank integration
  - [x] Embedded Desmos Graphing Calculator
  - [x] Freehand rough canvas & formula notes
  - [x] Local practice history tracking & review modal
  - [x] JSON history export
  - [x] Screen-reader (.sr-only) sanitization & formatting
- [ ] **Phase 2: ACT® Module**
  - [ ] Four-section breakdown (English, Math, Reading, Science)
  - [ ] Timed test simulation mode
- [ ] **Phase 3: AP® Calculus (AB & BC)**
  - [ ] Unit-by-unit progression
  - [ ] Free-Response Question (FRQ) grading guidelines & scoring rubrics
- [ ] **Phase 4: Additional AP® STEM Modules**
  - [ ] AP Physics & AP Chemistry practice sets
- [ ] **Phase 5: GRE® Practice Bank**
  - [ ] Quantitative Comparison & Vocabulary builder

---

## ⚖️ Non-Commercial, DMCA & Copyright Policy

**OpenBoard** is an independent, 100% free, non-commercial, open-source educational project developed by **Soham Mitra** for personal learning, research, and non-profit educational study.

- **No Commercial Activity:** OpenBoard does not charge fees, require paid subscriptions, run advertisements, or commercialize any services or user data.
- **Repository Scope & Safe Harbor:** This public GitHub repository contains **only original application source code** (web UI, styling, and server proxy routing utilities). **No question bank databases, proprietary test materials, or copyrighted question files are stored, hosted, or redistributed within this repository.** The application client and server proxy interact dynamically with publicly available endpoints at runtime.
- **DMCA Takedown Compliance (17 U.S.C. § 512):** OpenBoard strictly respects the intellectual property rights of copyright holders. If you are a copyright owner or authorized agent (e.g., College Board, ACT, Inc., ETS) and wish to request removal of any material rendered on OpenBoard, please contact our designated agent:
  - **Designated Agent:** Soham Mitra
  - **Email:** [`soham@sohamxyz.com`](mailto:soham@sohamxyz.com?subject=DMCA%20Notice%20-%20OpenBoard)
  - **Full Policy:** [sohamxyz.com/openboard/dmca](https://sohamxyz.com/openboard/dmca)
  - **Resolution Time:** We review and remove contested items within **24 business hours**.
- **Intellectual Property & Trademarks:** All official test questions, passages, answer options, and scoring rationales are the copyrighted property of their respective test makers. *SAT® and AP® are registered trademarks of the College Board, which was not involved in the production of, and does not endorse or sponsor, this project. ACT® is a registered trademark of ACT, Inc. GRE® is a registered trademark of ETS. Desmos is a registered trademark of Desmos Studio PBC.*

---

## 👤 Author

Developed by **Soham Mitra** ([@SohamXYZDev](https://github.com/SohamXYZDev) / [sohamxyz.com](https://sohamxyz.com)).

---

## 📄 License

This project is open-source under the [MIT License](https://opensource.org/licenses/MIT).
