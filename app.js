// app.js

const GEMINI_API_KEY = "AIzaSyD7pHX2zQlQMSHWwrL0cskVGyTQ5II7VwM";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// --- Database Layer (LocalStorage) ---
function getMedicines() {
    const data = localStorage.getItem('medicines');
    return data ? JSON.parse(data) : [];
}

function saveMedicine(med) {
    const medicines = getMedicines();
    med.id = Date.now().toString();
    med.addedAt = new Date().toISOString();
    medicines.push(med);
    localStorage.setItem('medicines', JSON.stringify(medicines));
    renderMedicines(medicines);
}

window.deleteMedicine = function(id) {
    if (confirm('Are you sure you want to delete this medicine?')) {
        const medicines = getMedicines();
        const updated = medicines.filter(m => m.id !== id);
        localStorage.setItem('medicines', JSON.stringify(updated));
        renderMedicines(updated);
    }
}

// Ensure mock data exists on first load
if (!localStorage.getItem('medicines')) {
    const mockMedicines = [
        { id: '1', name: 'Paracetamol', dosage: '500mg', quantity: 20, expiryDate: '2026-12-01', addedAt: new Date().toISOString() },
        { id: '2', name: 'Amoxicillin', dosage: '250mg', quantity: 10, expiryDate: '2025-05-15', addedAt: new Date().toISOString() },
        { id: '3', name: 'Cetirizine', dosage: '10mg', quantity: 15, expiryDate: '2023-10-01', addedAt: new Date().toISOString() } // Expired mock
    ];
    localStorage.setItem('medicines', JSON.stringify(mockMedicines));
}

// --- UI Rendering ---
function getExpiryStatus(dateStr) {
    const expiry = new Date(dateStr);
    const now = new Date();
    const monthsDiff = (expiry - now) / (1000 * 60 * 60 * 24 * 30.44); 
    if (monthsDiff < 0) return 'expired';
    if (monthsDiff < 3) return 'expiring-soon';
    return 'safe';
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function renderMedicines(medicines) {
    const grid = document.getElementById('medicine-grid');
    grid.innerHTML = '';
    
    // Sort logic (default by expiry date)
    medicines.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    medicines.forEach(med => {
        const status = getExpiryStatus(med.expiryDate);
        let statusClass = 'safe';
        let statusText = 'Good';
        if (status === 'expired') { statusClass = 'danger'; statusText = 'Expired'; }
        else if (status === 'expiring-soon') { statusClass = 'warning'; statusText = 'Exp. Soon'; }

        const card = document.createElement('div');
        card.className = `med-card ${status}`;
        card.innerHTML = `
            <div class="med-header">
                <div>
                    <div class="med-name">${med.name}</div>
                    <div class="med-dosage">${med.dosage}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="med-qty">x${med.quantity}</div>
                    <button class="icon-btn delete-btn" onclick="deleteMedicine('${med.id}')" title="Delete Medicine">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="med-details">
                <div class="med-detail-item">
                    <span class="med-detail-label">Status</span>
                    <span class="med-detail-value ${statusClass}">${statusText}</span>
                </div>
                <div class="med-detail-item">
                    <span class="med-detail-label">Expiry Date</span>
                    <span class="med-detail-value">${formatDate(med.expiryDate)}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    const expiringSoon = medicines.filter(med => getExpiryStatus(med.expiryDate) !== 'safe');
    const banner = document.getElementById('expiry-notification-banner');
    if (banner) {
        if (expiringSoon.length > 0) {
            banner.classList.remove('hidden');
            document.getElementById('expiry-notification-text').innerText = `You have ${expiringSoon.length} medicine(s) expiring within 3 months or already expired! Review your inventory.`;
        } else {
            banner.classList.add('hidden');
        }
    }
}

// --- Gemini AI Integration ---
async function extractMedicineWithAI(text, base64Image = null) {
    let parts = [];
    
    if (text) {
        parts.push({
            text: `You are an expert AI assistant for a Medicine Inventory App. 
Given the following user input describing a medicine purchase, extract the details precisely into JSON format.
The JSON must have the following schema:
{
  "name": "string (the medicine name)",
  "dosage": "string (e.g., 500mg, 10ml. If missing, return 'N/A')",
  "quantity": "number (the total quantity of pills/strips bought. Must be an integer number, e.g., 10)",
  "expiryDate": "string (YYYY-MM-DD. Estimate the last day of the month if only MM/YYYY is given. Default to 1 year from now if totally missing)"
}
Return ONLY the raw JSON object, without any markdown formatting or backticks.
User input: "${text}"`
        });
    }

    if (base64Image) {
         // Expecting base64Image to be without the "data:image/jpeg;base64," prefix.
         parts.push({
             inline_data: {
                 mime_type: "image/jpeg",
                 data: base64Image
             }
         });
    }

    const payload = {
        contents: [{ parts }]
    };

    const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiText = data.candidates[0].content.parts[0].text;
    
    try {
        // Simple regex to parse JSON in case it returned markdown block
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        const parsedData = JSON.parse(jsonMatch ? jsonMatch[0] : aiText);
        return parsedData;
    } catch (e) {
        throw new Error("Failed to parse AI response into JSON. " + aiText);
    }
}

// --- Image processing util ---
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    renderMedicines(getMedicines());

    // UI Elements
    const processBtn = document.getElementById('process-btn');
    const aiStatus = document.getElementById('ai-processing-status');
    const smartInput = document.getElementById('smart-text-input');
    const imageUpload = document.getElementById('image-upload');
    const voiceBtn = document.getElementById('voice-btn');
    
    let currentImageFile = null;

    // Handle Image Upload Selection
    imageUpload.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            currentImageFile = e.target.files[0];
            smartInput.value = `[Image attached: ${currentImageFile.name}] ` + smartInput.value;
        }
    });

    // Handle Voice Input (Basic Web Speech API)
    voiceBtn.addEventListener('click', () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Your browser does not support Voice Recognition.");
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.onstart = () => {
            voiceBtn.style.color = "red";
            smartInput.placeholder = "Listening...";
        };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            smartInput.value += (smartInput.value ? " " : "") + transcript;
        };
        recognition.onend = () => {
            voiceBtn.style.color = "";
            smartInput.placeholder = "E.g., 'I bought a strip of Paracetamol 500mg...'";
        }
        recognition.start();
    });

    // Handle Processing
    processBtn.addEventListener('click', async () => {
        const text = smartInput.value.trim();
        if (!text && !currentImageFile) {
            alert('Please enter some text, use voice, or upload an image.');
            return;
        }

        aiStatus.classList.remove('hidden');
        processBtn.disabled = true;

        try {
            let base64Image = null;
            if (currentImageFile) {
                base64Image = await fileToBase64(currentImageFile);
            }

            const extractedData = await extractMedicineWithAI(text, base64Image);
            
            if (extractedData && extractedData.name) {
                // Save to Local Database
                saveMedicine({
                    name: extractedData.name,
                    dosage: extractedData.dosage || 'N/A',
                    quantity: parseInt(extractedData.quantity) || 1,
                    expiryDate: extractedData.expiryDate || new Date().toISOString().split('T')[0]
                });
                
                alert(`✅ Successfully added ${extractedData.quantity || 1}x ${extractedData.name}!`);
                smartInput.value = '';
                currentImageFile = null;
                imageUpload.value = '';
                
            } else {
                alert("Could not extract medicine details. Please try being more specific.");
            }
        } catch (error) {
            console.error(error);
            alert("Error processing input: " + error.message);
        } finally {
            aiStatus.classList.add('hidden');
            processBtn.disabled = false;
        }
    });

    // Handle Inventory Checking
    document.getElementById('check-btn').addEventListener('click', () => {
        const query = document.getElementById('check-medicine-input').value.toLowerCase();
        if (!query) return;

        const medicines = getMedicines();
        const results = medicines.filter(m => m.name.toLowerCase().includes(query));
        
        if (results.length > 0) {
            const totalQty = results.reduce((acc, curr) => acc + curr.quantity, 0);
            alert(`✅ Yes! You already have ${totalQty} units of ${results[0].name} at home.`);
        } else {
            alert(`❌ No matches found for "${query}". You don't seem to have this.`);
        }
    });
});
