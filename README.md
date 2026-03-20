# MediRepo AI - Smart Medicine Repository

## Overview
MediRepo is a dynamic AI-powered assistant designed to solve a very common household problem: medicine wastage due to duplicate purchases and forgotten expiry dates. By tracking medicines neatly, you save money, save the environment from medical waste, and protect your health!

## Vertical
Healthcare & Personal Inventory Management

## Approach and Logic
We built a hyper-fast, universally accessible web application using Vanilla HTML, CSS, and Javascript. The logic strictly runs in the browser, avoiding massive build tools and backend configurations to keep it purely Client-Side driven for the prototype. This allowed us to iterate extremely fast and ensure zero latency or hosting downtime.

- **Smart Data Extraction:** We deeply integrated the brand-new Google Gemini 2.5 Flash model directly via its REST API. This allows the app to take messy, unstructured user inputs (like "I bought 2 strips of Dolo 650 expiring next Dec") and instantly parse it into structured data using clever prompt engineering.
- **Image & Voice Processing:** We securely integrated native browser APIs to support image uploads (invoices/medicine strips) and voice dictation, passing the raw transcription to Gemini.
- **Persistent Local Database:** We dynamically use the browser's native `localStorage` to save and sync inventory persistently in milliseconds without needing an authentication wall.
- **Smart Alerts:** The app automatically evaluates each item and triggers a massive red notification banner for medicines expiring in < 3 months, and features a Search/Check system to alert users before they accidentally buy duplicates.

## How the Solution Works
1. Simply double-click `index.html` to open it in any web browser.
2. Type, speak (using the microphone icon), or upload an image of your newly bought medicine in the "Smart Entry" box.
3. Click "Process via Gemini" — The AI parses all key details (Name, Dosage, Quantity, Expiry Date) instantly.
4. The medicine is logged in the grid below, beautifully color-coded by expiry range (Green = Safe, Yellow = Expiring Soon, Red = Expired).
5. Before heading to the pharmacy, type the medicine name into the top right search bar and click "Check" to see if you already have it at home!

## Assumptions Made
- The MVP targets a single user/household, thus `localStorage` is completely sufficient for storage. (Upgrading to Firebase Firestore is the immediate next step for cloud-syncing).
- Users have internet access to reach the Google Gemini API.
- If a user doesn't provide an explicit expiry date for a medicine, the API is prompted to default to an estimated 1 year safe period.

## Future Plans
- Cross-device sync via Google Firebase
- Native barcode scanner functionality
